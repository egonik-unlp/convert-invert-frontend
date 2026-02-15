
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("SyncDash: Initializing React mount...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("SyncDash: Could not find root element!");
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
