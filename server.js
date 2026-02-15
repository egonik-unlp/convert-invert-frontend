const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.LISTEN_PORT || 3124;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// Helper to check if a table exists to avoid 500s on fresh DBs
async function tableExists(name) {
  try {
    const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [name]);
    return res.rowCount > 0;
  } catch (e) {
    return false;
  }
}

// 1. Get Global Stats (Aligned with api_specs.md)
app.get('/stats', async (req, res) => {
  try {
    const hasSearchItems = await tableExists('search_items');
    if (!hasSearchItems) {
      return res.json({
        totalTracks: 0,
        pending: 0,
        downloading: 0,
        completed: 0,
        globalProgress: 0,
        remainingTime: "Waiting for Engine..."
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
      remainingTime: "Idle"
    });
  } catch (err) {
    console.error("SQL Error in /stats:", err.message);
    res.status(500).json({ error: "Database statistics unavailable" });
  }
});

// 2. Get Network Status
app.get('/network', async (req, res) => {
  res.json({
    status: 'CONNECTED',
    user: process.env.USER_NAME || 'SoulseekUser',
    latency: '34ms',
    node: 'Primary DB Bridge',
    totalBandwidth: '0.0 MB/s'
  });
});

// 3. Get Playlists (Summarized view)
app.get('/playlists', async (req, res) => {
  res.json([{
    id: 'all',
    name: 'Master Library',
    trackCount: 0,
    totalSize: 'Scanning...',
    quality: 'FLAC / 320kbps',
    lastSynced: new Date().toLocaleTimeString(),
    coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80',
    tracks: []
  }]);
});

// 4. Get Detailed Track List (Deeply aligned with api_specs.md SQL)
app.get('/playlists/:id', async (req, res) => {
  try {
    const hasSearchItems = await tableExists('search_items');
    if (!hasSearchItems) {
      return res.json({
        id: 'all',
        name: 'Master Library',
        trackCount: 0,
        tracks: []
      });
    }

    const tracksQuery = `
      SELECT 
          si.id, 
          si.track as title, 
          si.artist, 
          si.album,
          CASE 
              WHEN df.id IS NOT NULL THEN 'COMPLETED'
              WHEN rt.id IS NOT NULL THEN 'FAILED'
              ELSE 'SEARCHING'
          END as status,
          df.filename,
          si.id as track_id
      FROM search_items si
      LEFT JOIN downloaded_file df ON df.track_id = si.id
      LEFT JOIN rejected_track rt ON rt.track_id = si.id
      ORDER BY si.id DESC
      LIMIT 150;
    `;
    const result = await pool.query(tracksQuery);
    
    res.json({
      id: 'all',
      name: 'Master Library',
      trackCount: result.rowCount,
      totalSize: '--',
      quality: 'Mixed',
      lastSynced: new Date().toLocaleTimeString(),
      coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80',
      tracks: result.rows.map(row => ({
        ...row,
        progress: row.status === 'COMPLETED' ? 100 : 0,
      }))
    });
  } catch (err) {
    console.error("SQL Error in /playlists/id:", err.message);
    res.status(500).json({ error: "Track list query failed" });
  }
});

app.post('/tracks/:id/retry', async (req, res) => {
  try {
    await pool.query('DELETE FROM rejected_track WHERE track_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`SyncDash DB-Bridge online at port ${port}`);
});