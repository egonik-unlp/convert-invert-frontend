
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

// Memory cache for telemetry and correlation
let jaegerProgressMap = new Map();
let systemLogs = [];
let correlationMap = new Map(); // External Track ID -> DB ID

/**
 * Periodically refresh the correlation map between DB tracks and potential log identifiers
 */
async function refreshCorrelationMap() {
  try {
    const query = `SELECT id, track as title, artist, album FROM search_items`;
    const res = await pool.query(query);
    const newMap = new Map();
    
    res.rows.forEach(row => {
      // Create multiple keys for fuzzy matching
      const fuzzyKey = `${row.artist} - ${row.title}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      newMap.set(fuzzyKey, row.id);
      
      // If there's an external ID column (we'll check common ones), add them
      // In this system, 'track' might actually be the Spotify ID in some contexts
      newMap.set(row.title.toLowerCase(), row.id);
    });
    
    correlationMap = newMap;
  } catch (err) {
    console.warn('Correlation mapping failed:', err.message);
  }
}

/**
 * Fetches recent traces from Jaeger and correlates them with DB tracks
 */
async function updateProgressFromJaeger() {
  try {
    const response = await fetch('http://localhost:16686/api/traces?service=sync-engine&limit=50&lookback=1h');
    if (!response.ok) return;
    
    const { data } = await response.json();
    if (!data) return;

    const newProgress = new Map();
    const newLogs = [];

    for (const trace of data) {
      for (const span of trace.spans) {
        // Extract Track Identification from span tags
        const trackIdTag = span.tags.find(t => t.key === 'track_id' || t.key === 'id');
        const artistTag = span.tags.find(t => t.key === 'artist');
        const titleTag = span.tags.find(t => t.key === 'track' || t.key === 'title');

        let dbId = null;

        // Try correlating by provided ID
        if (trackIdTag && correlationMap.has(trackIdTag.value)) {
          dbId = correlationMap.get(trackIdTag.value);
        } 
        // Fallback to fuzzy match by Artist/Title
        else if (artistTag && titleTag) {
          const fuzzyKey = `${artistTag.value} - ${titleTag.value}`.toLowerCase().replace(/[^a-z0-9]/g, '');
          dbId = correlationMap.get(fuzzyKey);
        }

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
                trackId: dbId,
                progress: progField ? parseFloat(progField.value) : null
              });
            }

            if (dbId && progField) {
              const val = parseFloat(progField.value);
              if (!isNaN(val)) {
                const existing = newProgress.get(dbId) || 0;
                newProgress.set(dbId, Math.max(existing, val));
              }
            }
          }
        }
      }
    }
    
    jaegerProgressMap = newProgress;
    // Keep last 100 logs
    systemLogs = [...newLogs, ...systemLogs].sort((a,b) => b.timestamp - a.timestamp).slice(0, 100);
  } catch (err) {
    // console.error('Jaeger Sync Error:', err.message);
  }
}

// Initial and periodic syncs
refreshCorrelationMap();
setInterval(refreshCorrelationMap, 30000);
setInterval(updateProgressFromJaeger, 2500);

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
      status.tables.search_items = (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'search_items'`)).rowCount > 0;
      status.tables.judge_submissions = (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_submissions'`)).rowCount > 0;
      status.tables.downloadable_files = (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'downloadable_files'`)).rowCount > 0;
      status.tables.downloaded_file = (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'downloaded_file'`)).rowCount > 0;
      status.tables.rejected_track = (await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'rejected_track'`)).rowCount > 0;
    }
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
    const downloading = jaegerProgressMap.size;
    
    res.json({
      totalTracks: total,
      pending: Math.max(0, total - completed - downloading),
      downloading: downloading, 
      completed: completed,
      globalProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      remainingTime: downloading > 0 ? "Active Sync..." : "Idle",
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
      LIMIT 200
    `;

    const tracks = await pool.query(query);

    res.json({
      id: 'all',
      name: 'Main Library',
      trackCount: tracks.rowCount,
      tracks: tracks.rows.map(r => {
        let progress = 0;
        let status = r.status;

        if (r.status === 'COMPLETED') progress = 100;
        else if (jaegerProgressMap.has(r.id)) {
          progress = jaegerProgressMap.get(r.id);
          status = 'DOWNLOADING';
        } else if (r.status === 'DOWNLOADING') {
          progress = 5;
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
    status: 'CONNECTED',
    user: 'local_admin',
    latency: 'Local',
    node: 'localhost:5455',
    totalBandwidth: jaegerProgressMap.size > 0 ? '4.2 MB/s' : '0.0 MB/s'
  });
});

app.listen(port, () => console.log(`SyncDash Bridge live at http://localhost:${port}`));
