# Convert Invert Integration Guide

The combined repo uses one root Docker Compose stack.

## Services

- `api`: Rust Actix server from `convert-invert/src/bin/trigger_server.rs`.
- `frontend`: Vite build served by nginx.
- `db`: PostgreSQL used by Diesel migrations and dashboard queries.
- `redis`: worker queue and live download progress.
- `jaeger`: trace collection and log display source.

## Request Flow

The browser calls same-origin `/api`. In Docker, `convert-invert-frontend/nginx.conf` proxies that path to `http://api:3124`. In local Vite development, `vite.config.ts` proxies `/api` to `http://localhost:3124`.

## Run

```bash
docker compose up --build
```
