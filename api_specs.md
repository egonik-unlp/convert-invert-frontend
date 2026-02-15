
# SyncDash API Specifications

The following REST and WebSocket endpoints are required for the frontend to function correctly.

## 1. Authentication
*   **POST** `/api/auth/login`: Authenticate system user.

## 2. Dashboard & Stats
*   **GET** `/api/stats`: Returns `GlobalStats`.
*   **GET** `/api/network`: Returns `NetworkStats`.

## 3. Playlists
*   **GET** `/api/playlists`: Returns a list of all synced playlists.
*   **POST** `/api/playlists/sync`: Trigger a new sync from a Spotify/YouTube URL.
*   **GET** `/api/playlists/:id`: Returns detailed `Playlist` object.

## 4. Tracks
*   **GET** `/api/tracks`: Returns tracks for a specific playlist or global search.
*   **POST** `/api/tracks/:id/retry`: Restart search for a track.

---

## Database Mapping (Suggested SQL)

Assuming your schema follows the standard patterns in `convert-invert`, here is how to bridge your SQL to the UI:

### Global Stats
```sql
SELECT 
    COUNT(*) as totalTracks,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'DOWNLOADING' THEN 1 END) as downloading,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    AVG(progress) as globalProgress
FROM tracks;
```

### Track Details
```sql
SELECT 
    id, title, artist, album, duration, status, progress, 
    download_speed as downloadSpeed, 
    file_size as fileSize, 
    format, 
    cover_art_url as coverArt
FROM tracks
WHERE playlist_id = ?;
```

### Network Status
This data usually comes from the SoulSeek client state (e.g., `slskd` or your custom client wrapper) rather than a database table.
