// src/config.jsx

const { protocol, hostname } = window.location;

// Detect if running locally
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// Detect your backend base path (use `/api` only if your backend includes it)
const BACKEND_PREFIX = ""; // change to "/api" only if your backend routes start with /api

let API_URL;
let WS_URL;

if (isLocalhost) {
  // 🔹 Local development
  API_URL = `http://localhost:8000${BACKEND_PREFIX}`;
  WS_URL = `ws://localhost:8000/ws`;
} else if (protocol === "https:") {
  // 🔹 Production over HTTPS
  API_URL = `https://${hostname}${BACKEND_PREFIX}`;
  WS_URL = `wss://${hostname}/ws`;
} else {
  // 🔹 Production over HTTP
  API_URL = `http://${hostname}${BACKEND_PREFIX}`;
  WS_URL = `ws://${hostname}/ws`;
}

export { API_URL, WS_URL };
