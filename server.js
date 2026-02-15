
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
    
    const totalCount = parseInt(total.rows[0].count);
    const completedCount = parseInt(completed.rows[0].count);
    
    res.json({
      totalTracks: totalCount,
      pending: Math.max(0, totalCount - completedCount),
      downloading: 0, 
      completed: completedCount,
      globalProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      remainingTime: "Live Syncing"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/playlists', async (req, res) => {
  res.json([{
    id: 'all',
    name: 'Local DB Master Sync',
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
    const tracks = await pool.query(`
      SELECT 
        si.id, si.track as title, si.artist, si.album,
        js.score,
        dlf.username as matched_user,
        dlf.filename as matched_filename,
        CASE 
          WHEN df.id IS NOT NULL THEN 'COMPLETED'
          WHEN rt.id IS NOT NULL THEN 'FAILED'
          WHEN js.id IS NOT NULL THEN 'FILTERING'
          ELSE 'SEARCHING'
        END as status
      FROM search_items si
      LEFT JOIN judge_submissions js ON js.track = si.id
      LEFT JOIN downloadable_files dlf ON dlf.id = js.query
      LEFT JOIN downloaded_file df ON df.filename = dlf.filename
      LEFT JOIN rejected_track rt ON rt.track = si.id
      ORDER BY si.id DESC
      LIMIT 100
    `);

    res.json({
      id: 'all',
      name: 'Local DB Master Sync',
      trackCount: tracks.rowCount,
      totalSize: '---',
      quality: 'High Fidelity',
      lastSynced: 'Just Now',
      coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200',
      tracks: tracks.rows.map(r => ({
        id: r.id,
        track_id: r.id,
        title: r.title,
        artist: r.artist,
        album: r.album,
        status: r.status,
        score: r.score,
        username: r.matched_user,
        filename: r.matched_filename,
        progress: r.status === 'COMPLETED' ? 100 : 0
      }))
    });
  } catch (err) {
    console.error(err);
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

app.listen(port, () => {
  console.log(`SyncDash Bridge live at http://localhost:${port}`);
  console.log(`Connecting to Postgres at ${dbConnectionString}`);
});
