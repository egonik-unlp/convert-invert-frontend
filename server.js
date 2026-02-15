
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';

const app = express();
const port = 3124; 

const dbConnectionString = 'postgresql://postgres:postgres@localhost:5455/convert-invert';

const pool = new Pool({
  connectionString: dbConnectionString,
});

app.use(cors());
app.use(express.json());

// Memory cache for Jaeger progress to avoid overloading the API
let jaegerProgressMap = new Map();

/**
 * Fetches recent traces from Jaeger and extracts progress percentage from logs
 * assuming spans have a tag 'track_id' and logs have 'progress' or 'percentage'
 */
async function updateProgressFromJaeger() {
  try {
    const response = await fetch('http://localhost:16686/api/traces?service=sync-engine&limit=20&lookback=1h');
    if (!response.ok) return;
    
    const { data } = await response.json();
    if (!data) return;

    const newMap = new Map();

    for (const trace of data) {
      for (const span of trace.spans) {
        const trackIdTag = span.tags.find(t => t.key === 'track_id');
        if (trackIdTag) {
          const trackId = trackIdTag.value;
          
          // Look for progress in logs
          let latestProgress = 0;
          if (span.logs) {
            for (const log of span.logs) {
              const progField = log.fields.find(f => f.key === 'progress' || f.key === 'percentage' || f.key === 'value');
              if (progField) {
                const val = parseFloat(progField.value);
                if (!isNaN(val)) latestProgress = Math.max(latestProgress, val);
              }
            }
          }
          
          // Also check tags if progress is updated there
          const progTag = span.tags.find(t => t.key === 'progress' || t.key === 'percentage');
          if (progTag) latestProgress = Math.max(latestProgress, parseFloat(progTag.value));

          if (latestProgress > 0) {
            // Keep the highest progress seen for this track ID
            const existing = newMap.get(trackId) || 0;
            newMap.set(trackId, Math.max(existing, latestProgress));
          }
        }
      }
    }
    jaegerProgressMap = newMap;
  } catch (err) {
    console.error('Jaeger Sync Error:', err.message);
  }
}

// Poll Jaeger every 2 seconds
setInterval(updateProgressFromJaeger, 2000);

async function tableExists(name) {
  try {
    const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [name.toLowerCase()]);
    return res.rowCount > 0;
  } catch (e) { return false; }
}

async function columnExists(table, column) {
  try {
    const res = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [table.toLowerCase(), column.toLowerCase()]);
    return res.rowCount > 0;
  } catch (e) { return false; }
}

app.get('/health', async (req, res) => {
  const status = {
    api: 'ONLINE',
    db: 'DISCONNECTED',
    tables: {
      search_items: false,
      judge_submissions: false,
      downloadable_files: false,
      downloaded_file: false,
      rejected_track: false
    },
    jaeger: 'CHECKING',
    error: null
  };
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    if (dbCheck.rowCount > 0) {
      status.db = 'CONNECTED';
      status.tables.search_items = await tableExists('search_items');
      status.tables.judge_submissions = await tableExists('judge_submissions');
      status.tables.downloadable_files = await tableExists('downloadable_files');
      status.tables.downloaded_file = await tableExists('downloaded_file');
      status.tables.rejected_track = await tableExists('rejected_track');
    }
    const jaegerCheck = await fetch('http://localhost:16686/api/services').catch(() => null);
    status.jaeger = jaegerCheck?.ok ? 'CONNECTED' : 'OFFLINE';
  } catch (err) { status.error = err.message; }
  res.json(status);
});

app.get('/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM search_items) as total,
        (SELECT COUNT(*) FROM downloaded_file) as completed,
        (SELECT COUNT(*) FROM rejected_track) as failed,
        (SELECT COUNT(DISTINCT track) FROM judge_submissions js 
         WHERE NOT EXISTS (SELECT 1 FROM downloaded_file df WHERE df.filename IN (SELECT filename FROM downloadable_files WHERE id = js.query))
         AND NOT EXISTS (SELECT 1 FROM rejected_track rt WHERE rt.track = js.track)
        ) as downloading
    `;
    const result = await pool.query(query);
    const row = result.rows[0];
    
    const total = parseInt(row.total);
    const completed = parseInt(row.completed);
    const downloading = parseInt(row.downloading);
    
    res.json({
      totalTracks: total,
      pending: Math.max(0, total - completed - downloading),
      downloading: downloading, 
      completed: completed,
      globalProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      remainingTime: downloading > 0 ? "Active Sync..." : "Idle"
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/playlists/:id', async (req, res) => {
  try {
    const hasScore = await columnExists('judge_submissions', 'score');
    const scoreCol = hasScore ? 'MAX(js.score)' : 'NULL';

    const query = `
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        ${scoreCol} as score,
        COUNT(js.id) as candidates_count,
        CASE 
          WHEN EXISTS(SELECT 1 FROM downloaded_file df WHERE df.filename IN (SELECT filename FROM downloadable_files dlf JOIN judge_submissions js2 ON dlf.id = js2.query WHERE js2.track = si.id)) THEN 'COMPLETED'
          WHEN EXISTS(SELECT 1 FROM rejected_track rt WHERE rt.track = si.id) THEN 'FAILED'
          WHEN EXISTS(SELECT 1 FROM judge_submissions js3 WHERE js3.track = si.id) THEN 'DOWNLOADING'
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      LEFT JOIN judge_submissions js ON js.track = si.id
      GROUP BY si.id
      ORDER BY si.id DESC
      LIMIT 150
    `;

    const tracks = await pool.query(query);

    res.json({
      id: 'all',
      name: 'Main Library',
      trackCount: tracks.rowCount,
      tracks: tracks.rows.map(r => {
        let progress = 0;
        if (r.status === 'COMPLETED') progress = 100;
        else if (r.status === 'DOWNLOADING') {
          // Use Jaeger data if available, otherwise 5% for "started"
          progress = jaegerProgressMap.get(r.id) || 5;
        }

        return {
          id: r.id,
          track_id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          status: r.status,
          score: r.score,
          candidatesCount: parseInt(r.candidates_count),
          progress: progress
        };
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tracks/:id/candidates', async (req, res) => {
  try {
    const hasScore = await columnExists('judge_submissions', 'score');
    const scoreCol = hasScore ? 'js.score' : '0.0';
    
    const query = `
      SELECT 
        dlf.id, dlf.username, dlf.filename, ${scoreCol} as score
      FROM judge_submissions js
      JOIN downloadable_files dlf ON js.query = dlf.id
      WHERE js.track = $1
      ORDER BY ${scoreCol} DESC
    `;
    const results = await pool.query(query, [req.params.id]);
    res.json(results.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/network', async (req, res) => {
  res.json({
    status: 'CONNECTED',
    user: 'local_admin',
    latency: 'Local',
    node: 'localhost:5455',
    totalBandwidth: jaegerProgressMap.size > 0 ? '4.2 MB/s' : '0.0 MB/s'
  });
});

app.listen(port, () => console.log(`SyncDash Bridge live at http://localhost:${port}`));
