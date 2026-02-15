
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.LISTEN_PORT || 3124;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function tableExists(name) {
  try {
    const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [name.toLowerCase()]);
    return res.rowCount > 0;
  } catch (e) {
    return false;
  }
}

// Comprehensive Health Endpoint for Diagnostic UI
app.get('/health', async (req, res) => {
  const status = {
    api: 'ONLINE',
    db: 'DISCONNECTED',
    tables: {
      search_items: false,
      judge_submissions: false,
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
      status.tables.downloaded_file = await tableExists('downloaded_file');
      status.tables.rejected_track = await tableExists('rejected_track');
    }
  } catch (err) {
    status.error = err.message;
  }

  res.json(status);
});

app.get('/stats', async (req, res) => {
  try {
    const hasSearchItems = await tableExists('search_items');
    if (!hasSearchItems) {
      return res.json({
        totalTracks: 0, pending: 0, downloading: 0, completed: 0,
        globalProgress: 0, remainingTime: "Schema Missing"
      });
    }

    const statsQuery = `
      SELECT 
          (SELECT COUNT(*) FROM search_items) as total_tracks,
          (SELECT COUNT(*) FROM downloaded_file) as completed,
          (SELECT COUNT(*) FROM rejected_track) as failed,
          (SELECT COUNT(*) FROM search_items si 
           LEFT JOIN downloaded_file df ON df.track_id = si.id
           WHERE df.id IS NULL) as pending
    `;
    const result = await pool.query(statsQuery);
    const row = result.rows[0];
    
    const total = parseInt(row.total_tracks) || 0;
    const completed = parseInt(row.completed) || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      totalTracks: total,
      pending: parseInt(row.pending) || 0,
      downloading: 0, 
      completed: completed,
      globalProgress: progress,
      remainingTime: "Live Sync"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/network', (req, res) => {
  res.json({
    status: 'CONNECTED',
    user: process.env.USER_NAME || 'SoulseekUser',
    latency: '22ms',
    node: 'Postgres Bridge',
    totalBandwidth: '0.0 MB/s'
  });
});

app.get('/playlists', (req, res) => {
  res.json([{ id: 'all', name: 'Master Library' }]);
});

app.get('/playlists/:id', async (req, res) => {
  try {
    const hasSearchItems = await tableExists('search_items');
    if (!hasSearchItems) return res.json({ id: 'all', tracks: [] });

    const tracksQuery = `
      SELECT 
          si.id, si.track as title, si.artist, si.album,
          CASE 
              WHEN df.id IS NOT NULL THEN 'COMPLETED'
              WHEN rt.id IS NOT NULL THEN 'FAILED'
              WHEN js.id IS NOT NULL THEN 'FILTERING'
              ELSE 'SEARCHING'
          END as status,
          dlf.filename, dlf.username as provider
      FROM search_items si
      LEFT JOIN judge_submissions js ON js.track = si.id
      LEFT JOIN downloadable_files dlf ON dlf.id = js.query
      LEFT JOIN downloaded_file df ON df.filename = dlf.filename
      LEFT JOIN rejected_track rt ON rt.track = js.id
      ORDER BY si.id DESC LIMIT 100;
    `;
    const result = await pool.query(tracksQuery);
    res.json({
      id: 'all', name: 'Master Library', trackCount: result.rowCount,
      quality: 'FLAC / 320k', lastSynced: new Date().toLocaleTimeString(),
      coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80',
      tracks: result.rows.map(row => ({
        ...row, username: row.provider, progress: row.status === 'COMPLETED' ? 100 : 0
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Diagnostic Bridge active on port ${port}`);
});
