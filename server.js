
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import os from 'os';

const app = express();
const port = 3124; 

const dbConnectionString = 'postgresql://postgres:postgres@localhost:5455/convert-invert';

const pool = new Pool({
  connectionString: dbConnectionString,
});

app.use(cors());
app.use(express.json());

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
  } catch (err) { status.error = err.message; }
  res.json(status);
});

app.get('/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM search_items');
    const completed = await pool.query('SELECT COUNT(*) FROM downloaded_file');
    res.json({
      totalTracks: parseInt(total.rows[0].count),
      pending: Math.max(0, parseInt(total.rows[0].count) - parseInt(completed.rows[0].count)),
      downloading: 0, 
      completed: parseInt(completed.rows[0].count),
      globalProgress: parseInt(total.rows[0].count) > 0 ? Math.round((parseInt(completed.rows[0].count) / parseInt(total.rows[0].count)) * 100) : 0,
      remainingTime: "Live"
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/playlists', async (req, res) => {
  res.json([{
    id: 'all',
    name: 'Main Library',
    trackCount: 0,
    totalSize: '---',
    quality: 'High Fidelity',
    lastSynced: 'Live',
    coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200',
    tracks: []
  }]);
});

app.get('/playlists/:id', async (req, res) => {
  try {
    const hasScore = await columnExists('judge_submissions', 'score');
    const hasDownloadableFiles = await tableExists('downloadable_files');
    const scoreCol = hasScore ? 'MAX(js.score)' : 'NULL';

    // Grouping by search_items.id ensures one row per track
    const query = `
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        ${scoreCol} as score,
        COUNT(js.id) as candidates_count,
        CASE 
          WHEN EXISTS(SELECT 1 FROM downloaded_file df WHERE df.filename = ANY(SELECT filename FROM downloadable_files WHERE id IN (SELECT query FROM judge_submissions WHERE track = si.id))) THEN 'COMPLETED'
          WHEN EXISTS(SELECT 1 FROM rejected_track rt WHERE rt.track = si.id) THEN 'FAILED'
          WHEN EXISTS(SELECT 1 FROM judge_submissions js WHERE js.track = si.id) THEN 'FILTERING'
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      LEFT JOIN judge_submissions js ON js.track = si.id
      GROUP BY si.id
      ORDER BY si.id DESC
      LIMIT 100
    `;

    const tracks = await pool.query(query);

    res.json({
      id: 'all',
      name: 'Main Library',
      trackCount: tracks.rowCount,
      tracks: tracks.rows.map(r => ({
        id: r.id,
        track_id: r.id,
        title: r.title,
        artist: r.artist,
        album: r.album,
        status: r.status,
        score: r.score,
        candidatesCount: parseInt(r.candidates_count),
        progress: r.status === 'COMPLETED' ? 100 : 0
      }))
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
    totalBandwidth: '0.0 MB/s'
  });
});

app.listen(port, () => console.log(`SyncDash Bridge live at http://localhost:${port}`));
