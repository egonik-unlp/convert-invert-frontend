# Dashboard API

The dashboard API is implemented by the Rust `trigger_server` binary.

## Endpoints

- `GET /api/health`
- `GET /api/stats`
- `GET /api/network`
- `GET /api/playlists`
- `GET /api/playlists/all`
- `GET /api/tracks/{id}/candidates`
- `GET /api/logs`
- `GET /api/workers/status`
- `POST /api/workers/start`
- `POST /api/workers/stop`

Track state is inferred from Postgres tables and overridden by Redis progress keys when a download is active.
