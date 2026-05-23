
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log("SyncDash: Initializing React mount...");
window.__syncDashBooted?.();

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("SyncDash: Could not find root element!");
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
