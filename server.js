
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const os = require('os');

const app = express();
const port = 3124; // Hardcoded bridge port

// Using your exact provided connection string
const dbConnectionString = 'postgresql://postgres:postgres@localhost:5455/convert-invert';

const pool = new Pool({
  connectionString: dbConnectionString,
});

app.use(cors()); // Critical for "just working" without proxies
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

function getIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  return addresses;
}

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
    env: {
      node_version: process.version,
      platform: `${os.platform()} ${os.release()}`,
      uptime: Math.floor(process.uptime()),
      server_ips: getIPs(),
      memory_usage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    },
    db_config: {
      host: 'localhost',
      port: 5455,
      database: 'convert-invert',
      user: 'postgres'
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
    status.error = `DB Connection Failed: ${err.message}. Ensure Postgres is up on 5455.`;
  }

  res.json(status);
});

app.get('/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM search_items');
    const completed = await pool.query('SELECT COUNT(*) FROM downloaded_file');
    const rejected = await pool.query('SELECT COUNT(*) FROM rejected_track');
    
    const totalCount = parseInt(total.rows[0].count);
    const completedCount = parseInt(completed.rows[0].count);
    
    res.json({
      totalTracks: totalCount,
      pending: totalCount - completedCount,
      downloading: 0, // Placeholder as SQL schema doesn't have live speed
      completed: completedCount,
      globalProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      remainingTime: "Calculating..."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/playlists', async (req, res) => {
  // Return a virtual "Master Sync" playlist based on search_items
  res.json([{
    id: 'all',
    name: 'Direct Local Sync',
    trackCount: 0,
    totalSize: 'Calculating...',
    quality: 'High Fidelity',
    lastSynced: 'Live',
    coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200',
    tracks: []
  }]);
});

app.get('/playlists/:id', async (req, res) => {
  try {
    const tracks = await pool.query(`
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        CASE 
          WHEN df.id IS NOT NULL THEN 'COMPLETED'
          WHEN rt.id IS NOT NULL THEN 'FAILED'
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      LEFT JOIN judge_submissions js ON js.track = si.id
      LEFT JOIN downloadable_files dlf ON dlf.id = js.query
      LEFT JOIN downloaded_file df ON df.filename = dlf.filename
      LEFT JOIN rejected_track rt ON rt.track = js.id
      LIMIT 100
    `);

    res.json({
      id: 'all',
      name: 'Direct Local Sync',
      trackCount: tracks.rowCount,
      totalSize: '---',
      quality: 'High Fidelity',
      lastSynced: 'Just Now',
      coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200',
      tracks: tracks.rows.map(r => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        album: r.album,
        status: r.status,
        progress: r.status === 'COMPLETED' ? 100 : 0
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/network', async (req, res) => {
  res.json({
    status: 'CONNECTED',
    user: 'local_admin',
    latency: '5ms',
    node: 'soulseek_local',
    totalBandwidth: '0.0 MB/s'
  });
});

app.listen(port, () => {
  console.log(`SyncDash Bridge live at http://localhost:${port}`);
  console.log(`Connecting to: ${dbConnectionString}`);
});
