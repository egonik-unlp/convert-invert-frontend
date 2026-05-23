# Convert Invert Frontend

React/Vite dashboard for the Rust `convert-invert` API.

## Local Development

```bash
npm install
npm run dev
```

The app calls the API through same-origin `/api`. In Docker, nginx proxies that path to the Rust API service. In Vite development, `vite.config.ts` proxies `/api` to `localhost:3124`.
