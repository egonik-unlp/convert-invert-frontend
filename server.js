
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const port = 3124; 

// Database configuration
const dbConnectionString = 'postgresql://postgres:postgres@localhost:5455/convert-invert';
const pool = new Pool({
  connectionString: dbConnectionString,
});

// Redis configuration
const redis = new Redis('redis://localhost:6379');

app.use(cors());
app.use(express.json());

// Memory cache for telemetry and correlation
let redisProgressMap = new Map(); // track_id -> { progress: number, finished: boolean }
let systemLogs = [];
let correlationMap = new Map(); // js_id -> track_id (search_items.id)
let knownTrackIds = new Set();  // Set of all valid search_items.id

/**
 * Refreshes the mapping between Judge Submissions and Search Items
 * Crucial for translating Redis progress (JS-based) to UI rows (Track-based)
 */
async function refreshCorrelation() {
  try {
    const query = `
      SELECT js.id as js_id, js.track as track_id
      FROM judge_submissions js
      JOIN search_items si ON js.track = si.id
    `;
    const res = await pool.query(query);
    const newMap = new Map();
    res.rows.forEach(row => {
      newMap.set(row.js_id.toString(), parseInt(row.track_id));
    });
    correlationMap = newMap;

    const tracksRes = await pool.query(`SELECT id FROM search_items`);
    knownTrackIds = new Set(tracksRes.rows.map(r => parseInt(r.id)));
  } catch (err) {
    console.error(`[DB] Correlation refresh failed:`, err.message);
  }
}

/**
 * Polls Redis for active download progress.
 * If a track is in Redis, it's currently active in the engine.
 */
async function updateProgressFromRedis() {
  try {
    const keys = await redis.keys('dl:*:progress');
    const newProgress = new Map();
    
    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const idStr = parts[1];
        const idNum = parseInt(idStr);
        let trackId = correlationMap.get(idStr);
        if (!trackId && knownTrackIds.has(idNum)) trackId = idNum;
        
        if (trackId) {
          const type = await redis.type(key);
          if (type === 'hash') {
            const data = await redis.hgetall(key);
            const isFinished = data.completed === 'true';
            const downloaded = parseFloat(data.bytes_downloaded);
            const total = parseFloat(data.total_bytes);
            let prg = 0;
            if (isFinished) prg = 100;
            else if (total > 0) prg = Math.round((downloaded / total) * 100);
            
            newProgress.set(trackId, { progress: prg, finished: isFinished });
          }
        }
      }
    }
    redisProgressMap = newProgress;
  } catch (err) {}
}

refreshCorrelation();
setInterval(refreshCorrelation, 10000);
setInterval(updateProgressFromRedis, 500); 

async function getCount(table) {
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    return parseInt(res.rows[0].count);
  } catch (e) { return 0; }
}

app.get('/health', async (req, res) => {
  const status = { api: 'ONLINE', db: 'DISCONNECTED', tables: {}, redis: 'OFFLINE', error: null };
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    if (dbCheck.rowCount > 0) {
      status.db = 'CONNECTED';
      const tables = ['search_items', 'judge_submissions', 'downloadable_files', 'downloaded_file', 'rejected_track'];
      for(const t of tables) {
        const check = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [t]);
        status.tables[t] = check.rowCount > 0;
      }
    }
    status.redis = redis.status === 'ready' ? 'CONNECTED' : 'OFFLINE';
  } catch (err) { status.error = err.message; }
  res.json(status);
});

app.get('/stats', async (req, res) => {
  try {
    const counts = {
      search_items: await getCount('search_items'),
      judge_submissions: await getCount('judge_submissions'),
      downloaded_file: await getCount('downloaded_file'),
      rejected_track: await getCount('rejected_track')
    };
    res.json({
      totalTracks: counts.search_items,
      pending: Math.max(0, counts.search_items - counts.downloaded_file - counts.rejected_track),
      downloading: redisProgressMap.size, 
      completed: counts.downloaded_file,
      failed: counts.rejected_track,
      globalProgress: counts.search_items > 0 ? Math.round((counts.downloaded_file / counts.search_items) * 100) : 0,
      remainingTime: "Live Sync",
      tableCounts: counts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/playlists', async (req, res) => {
  const count = await getCount('search_items');
  res.json([{ id: 'all', name: 'Main Library', trackCount: count, coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200', tracks: [] }]);
});

app.get('/playlists/:id', async (req, res) => {
  try {
    let reasonCol = 'reason';
    try {
        const colCheck = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'rejected_track' AND column_name = 'reject_reason'`);
        if (colCheck.rowCount > 0) reasonCol = 'reject_reason';
    } catch (e) {}

    const query = `
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        (SELECT ${reasonCol} FROM rejected_track rt JOIN judge_submissions js4 ON rt.track = js4.id WHERE js4.track = si.id ORDER BY rt.id DESC LIMIT 1) as reject_reason,
        (SELECT COUNT(*) FROM judge_submissions js WHERE js.track = si.id) as candidates_count,
        (SELECT MAX(js.score) FROM judge_submissions js WHERE js.track = si.id) as max_score,
        CASE 
          -- 1. SUCCESS IS ABSOLUTE: If any candidate for this track is in downloaded_file, it's COMPLETED
          WHEN EXISTS(
              SELECT 1 FROM downloaded_file df 
              WHERE df.filename IN (
                  SELECT filename FROM downloadable_files dlf 
                  JOIN judge_submissions js2 ON dlf.id = js2.query 
                  WHERE js2.track = si.id
              )
          ) THEN 'COMPLETED'
          
          -- 2. FAILURE IS OVERRIDDEN BY COMPLETED: Only mark as FAILED if there's a rejection AND no success
          WHEN EXISTS(SELECT 1 FROM rejected_track rt JOIN judge_submissions js5 ON rt.track = js5.id WHERE js5.track = si.id) THEN 'FAILED'
          
          -- 3. ACTIVE PROCESSING: If there are judge submissions, we are at least filtering
          WHEN EXISTS(SELECT 1 FROM judge_submissions js3 WHERE js3.track = si.id) THEN 'FILTERING'
          
          -- 4. INITIAL STATE: No candidates yet
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      ORDER BY si.id DESC
    `;

    const tracks = await pool.query(query);

    res.json({
      id: 'all',
      name: 'Main Library',
      trackCount: tracks.rowCount,
      tracks: tracks.rows.map(r => {
        let progress = 0;
        let status = r.status;
        const trackIdNum = parseInt(r.id);

        /**
         * REDIS OVERRIDE:
         * If Redis has an active entry for this track, it's DOWNLOADING.
         * This overrides 'FAILED' or 'FILTERING' states from previous attempts.
         */
        if (status !== 'COMPLETED' && redisProgressMap.has(trackIdNum)) {
          const redisData = redisProgressMap.get(trackIdNum);
          progress = redisData.progress;
          status = redisData.finished ? 'FINALIZING' : 'DOWNLOADING';
        } else if (status === 'COMPLETED') {
          progress = 100;
        }

        return {
          id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          status: status,
          rejectReason: r.reject_reason,
          candidatesCount: parseInt(r.candidates_count),
          score: r.max_score ? parseFloat(r.max_score) : null,
          progress: progress
        };
      })
    });
  } catch (err) { 
    console.error('[DB ERROR] Fetch playlist failed:', err);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/logs', (req, res) => res.json(systemLogs));

app.get('/tracks/:id/candidates', async (req, res) => {
  const query = `
    SELECT js.id as submission_id, dlf.id as file_id, dlf.username, dlf.filename, js.score
    FROM judge_submissions js
    JOIN downloadable_files dlf ON js.query = dlf.id
    WHERE js.track = $1
    ORDER BY js.score DESC
  `;
  const results = await pool.query(query, [req.params.id]);
  res.json(results.rows.map(row => ({
      id: row.submission_id,
      fileId: row.file_id,
      username: row.username,
      filename: row.filename,
      score: parseFloat(row.score) || 0
  })));
});

app.get('/network', async (req, res) => {
  res.json({ status: 'CONNECTED', user: 'egonik', latency: '0ms', node: 'Soulseek-Native', totalBandwidth: 'Live' });
});

app.listen(port, () => console.log(`SyncDash Bridge live at http://localhost:${port}`));
