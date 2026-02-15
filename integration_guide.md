
# SyncDash Integration & Architecture Guide

This document explains how to bridge the **SyncDash Frontend** with the **convert-invert Rust Engine**.

## 1. System Architecture

The system operates as a **triad**:
1.  **SyncEngine (Rust CLI/Daemon):** Your existing code. It continues to run the `run_cycle` logic, searching, judging, and downloading tracks, persisting all state to PostgreSQL.
2.  **SyncAPI (Rust/Axum):** A new lightweight web server layer (recommended to be added to your Rust workspace) that provides JSON endpoints by querying the Diesel models.
3.  **SyncDash (React):** The UI that communicates with the SyncAPI.

## 2. Bridging the Logic

### Database as the Message Bus
You do not need complex Inter-Process Communication (IPC). The database is your source of truth:
*   **The Engine** writes progress to `search_items`, `judge_submissions`, and `downloaded_file`.
*   **The API** reads these tables and serves them as JSON.
*   **The UI** polls the API every 5 seconds to reflect the Engine's progress.

### API Requirements
To support the current UI, your Rust API must implement the following:

| Endpoint | SQL Logic |
| :--- | :--- |
| `GET /api/stats` | Aggregates counts from `search_items` vs `downloaded_file`. |
| `GET /api/playlists` | Returns a summary of synced playlists (or a default "Global" view). |
| `GET /api/network` | Polls the Soulseek client state (or returns mock if not available). |
| `POST /api/tracks/:id/retry` | Inserts a record into the `retry_request` table. |

## 3. Environment Variables
Ensure both the Backend and Frontend are configured with the same network context:

| Variable | Description | Value (Docker) |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres Connection String | `postgres://user:pass@db:5432/dbname` |
| `API_URL` | Frontend -> Backend link | `http://backend:3124` |

---

## 4. Docker Integration

To run everything together, you should add a `frontend` service to your `docker-compose.yml`.

### Frontend Dockerfile (Example)
```dockerfile
# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Custom Nginx config to proxy /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf 
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (Vital for Proxying)
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend:3124/;
    }
}
```
