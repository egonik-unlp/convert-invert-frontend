
# SyncDash API Implementation Guide

This document defines how the Backend API should interact with your PostgreSQL database (schema defined in `src/internals/database/schema.rs`).

## 1. Status Inference Logic
Your database stores state across multiple tables. The API must join these to determine a track's current phase.

| Status | Condition |
| :--- | :--- |
| **COMPLETED** | Exists in `downloaded_file` (matched by filename). |
| **FAILED** | Exists in `rejected_track`. |
| **DOWNLOADING** | Linked via `judge_submissions` to `downloadable_files` AND actively in Soulseek queue. |
| **SEARCHING** | Exists in `search_items` but no `judge_submissions` yet. |

## 2. Key SQL Queries

### Get Global Stats
```sql
SELECT 
    (SELECT COUNT(*) FROM search_items) as total_tracks,
    (SELECT COUNT(*) FROM downloaded_file) as completed,
    (SELECT COUNT(*) FROM rejected_track) as failed,
    (SELECT COUNT(*) FROM judge_submissions js 
     LEFT JOIN downloaded_file df ON df.filename = (SELECT filename FROM downloadable_files WHERE id = js.query)
     WHERE df.id IS NULL) as pending;
```

### Get Track List (Detailed Join)
```sql
SELECT 
    si.id, 
    si.track as title, 
    si.artist, 
    si.album,
    CASE 
        WHEN df.id IS NOT NULL THEN 'COMPLETED'
        WHEN rt.id IS NOT NULL THEN 'FAILED'
        WHEN js.id IS NOT NULL THEN 'FILTERING'
        ELSE 'SEARCHING'
    END as status,
    dlf.filename,
    dlf.username as provider
FROM search_items si
LEFT JOIN judge_submissions js ON js.track = si.id
LEFT JOIN downloadable_files dlf ON dlf.id = js.query
LEFT JOIN downloaded_file df ON df.filename = dlf.filename
LEFT JOIN rejected_track rt ON rt.track = js.id;
```

## 3. Recommended Technology Stack
Since your core logic is Rust, you have two options for the API:
1.  **Axum/Actix (Rust)**: Use the existing Diesel models. Define a `Router` that serves JSON.
2.  **FastAPI (Python)**: Use `databases` or `SQLAlchemy` to read the Postgres tables. This is often faster to iterate on for UI-heavy features.

## 4. Real-time Progress
Your `DownloadManager` in `download_manager.rs` logs progress. To show this in the UI, you should modify the Rust code to write `bytes_downloaded` to a **Redis** key or a temporary **SQLite/Postgres** `progress` table which the API can poll.
