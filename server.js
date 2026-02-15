
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const port = 3124; 

// Database configuration - Using the hyphenated name as requested
const dbConnectionString = 'postgresql://postgres:postgres@localhost:5455/convert-invert';
const pool = new Pool({
  connectionString: dbConnectionString,
});

// Redis configuration - Connecting to the docker-exposed port
const redis = new Redis('redis://localhost:6379');

app.use(cors());
app.use(express.json());

// Memory cache for telemetry and correlation
let redisProgressMap = new Map(); // track_id -> progress %
let systemLogs = [];
let correlationMap = new Map(); // js_id -> track_id (search_items.id)

/**
 * Periodically refresh the correlation map between judge_submissions and search_items
 * This allows us to map the Redis ID (submission_id) back to the UI ID (track_id)
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
      newMap.set(row.js_id.toString(), row.track_id);
    });
    
    correlationMap = newMap;
  } catch (err) {
    console.error(`[DB] Correlation mapping failed for ${dbConnectionString}:`, err.message);
  }
}

/**
 * Poller for Redis progress keys: dl:{judge_submission_Id}:progress
 * These keys are HASHES containing bytes_downloaded and total_bytes
 */
async function updateProgressFromRedis() {
  try {
    const keys = await redis.keys('dl:*:progress');
    const newProgress = new Map();
    
    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const jsId = parts[1];
        const trackId = correlationMap.get(jsId);
        
        // Only process if we can map this submission to a track in our DB
        if (trackId) {
          const type = await redis.type(key);
          if (type === 'hash') {
            const data = await redis.hgetall(key);
            
            const downloaded = parseFloat(data.bytes_downloaded);
            const total = parseFloat(data.total_bytes);
            
            if (!isNaN(downloaded) && !isNaN(total) && total > 0) {
              const percentage = Math.round((downloaded / total) * 100);
              // Store normalized 0-100 value
              newProgress.set(trackId, Math.min(100, Math.max(0, percentage)));
            }
          }
        }
      }
    }
    redisProgressMap = newProgress;
  } catch (err) {
    // Prevent logging WRONGTYPE errors repeatedly if key types shift
    if (!err.message.includes('WRONGTYPE')) {
      console.error('Redis Poll Error:', err.message);
    }
  }
}

/**
 * Fetches recent traces from Jaeger for logging
 */
async function updateProgressFromJaeger() {
  try {
    const response = await fetch('http://localhost:16686/api/traces?service=sync-engine&limit=50&lookback=1h').catch(() => null);
    if (!response || !response.ok) return;
    
    const { data } = await response.json();
    if (!data) return;

    const newLogs = [];

    for (const trace of data) {
      for (const span of trace.spans) {
        if (span.logs) {
          for (const log of span.logs) {
            const messageField = log.fields.find(f => f.key === 'message' || f.key === 'event');
            const progField = log.fields.find(f => f.key === 'progress' || f.key === 'percentage');
            
            if (messageField) {
              newLogs.push({
                id: span.spanID + log.timestamp,
                timestamp: log.timestamp / 1000,
                message: messageField.value,
                level: 'info',
                progress: progField ? parseFloat(progField.value) : null
              });
            }
          }
        }
      }
    }
    
    // Keep last 100 logs
    systemLogs = [...newLogs, ...systemLogs].sort((a,b) => b.timestamp - a.timestamp).slice(0, 100);
  } catch (err) {
    // Silently fail if Jaeger is down
  }
}

// Initial and periodic syncs
refreshCorrelation();
setInterval(refreshCorrelation, 10000);
setInterval(updateProgressFromRedis, 1000); // High frequency for smooth UI
setInterval(updateProgressFromJaeger, 3000);

async function getCount(table) {
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    return parseInt(res.rows[0].count);
  } catch (e) { return 0; }
}

app.get('/health', async (req, res) => {
  const status = {
    api: 'ONLINE',
    db: 'DISCONNECTED',
    tables: {},
    redis: 'OFFLINE',
    jaeger: 'OFFLINE',
    error: null
  };
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
    const jaegerCheck = await fetch('http://localhost:16686/api/services').catch(() => null);
    status.jaeger = jaegerCheck?.ok ? 'CONNECTED' : 'OFFLINE';
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
    
    const total = counts.search_items;
    const completed = counts.downloaded_file;
    const downloading = redisProgressMap.size;
    
    res.json({
      totalTracks: total,
      pending: Math.max(0, total - completed - downloading),
      downloading: downloading, 
      completed: completed,
      globalProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      remainingTime: downloading > 0 ? `${downloading} Active` : "Idle",
      tableCounts: counts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/playlists', async (req, res) => {
  res.json([{
    id: 'all',
    name: 'Main Library',
    trackCount: await getCount('search_items'),
    totalSize: '---',
    quality: 'High Fidelity',
    lastSynced: 'Live',
    coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200',
    tracks: []
  }]);
});

app.get('/playlists/:id', async (req, res) => {
  try {
    const query = `
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        (SELECT COUNT(*) FROM judge_submissions js WHERE js.track = si.id) as candidates_count,
        CASE 
          WHEN EXISTS(SELECT 1 FROM downloaded_file df WHERE df.filename IN (SELECT filename FROM downloadable_files dlf JOIN judge_submissions js2 ON dlf.id = js2.query WHERE js2.track = si.id)) THEN 'COMPLETED'
          WHEN EXISTS(SELECT 1 FROM rejected_track rt WHERE rt.track = si.id) THEN 'FAILED'
          WHEN EXISTS(SELECT 1 FROM judge_submissions js3 WHERE js3.track = si.id) THEN 'DOWNLOADING'
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      ORDER BY si.id DESC
      LIMIT 250
    `;

    const tracks = await pool.query(query);

    res.json({
      id: 'all',
      name: 'Main Library',
      trackCount: tracks.rowCount,
      tracks: tracks.rows.map(r => {
        let progress = 0;
        let status = r.status;

        if (r.status === 'COMPLETED') {
          progress = 100;
        } else if (redisProgressMap.has(r.id)) {
          progress = redisProgressMap.get(r.id);
          status = 'DOWNLOADING';
        } else if (r.status === 'DOWNLOADING') {
          progress = 1; // Found in submissions but no Redis progress yet
        }

        return {
          id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          status: status,
          candidatesCount: parseInt(r.candidates_count),
          progress: progress
        };
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/logs', (req, res) => {
  res.json(systemLogs);
});

app.get('/tracks/:id/candidates', async (req, res) => {
  try {
    const query = `
      SELECT dlf.id, dlf.username, dlf.filename
      FROM judge_submissions js
      JOIN downloadable_files dlf ON js.query = dlf.id
      WHERE js.track = $1
    `;
    const results = await pool.query(query, [req.params.id]);
    res.json(results.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/network', async (req, res) => {
  res.json({
    status: redis.status === 'ready' ? 'CONNECTED' : 'DISCONNECTED',
    user: 'egonik',
    latency: 'Real-time',
    node: 'Redis Cache',
    totalBandwidth: redisProgressMap.size > 0 ? `${(redisProgressMap.size * 1.2).toFixed(1)} MB/s` : '0.0 MB/s'
  });
});

app.listen(port, () => {
  console.log(`SyncDash Bridge live at http://localhost:${port}`);
  console.log(`Connecting to database: ${dbConnectionString}`);
});
