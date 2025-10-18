<<<<<<< HEAD
// src/config.jsx

const { protocol, hostname } = window.location;

// Detect if running locally
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// Detect your backend base path (use `/api` only if your backend includes it)
const BACKEND_PREFIX = ""; // change to "/api" only if your backend routes start with /api
=======
const { hostname } = window.location;

const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// Change only if your backend actually prefixes routes with /api
const BACKEND_PREFIX = "";
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85

let API_URL;
let WS_URL;

if (isLocalhost) {
  // 🔹 Local development
<<<<<<< HEAD
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
=======
  API_URL = `http://127.0.0.1:8000${BACKEND_PREFIX}`;
  WS_URL = `ws://127.0.0.1:8000/ws`;
} else {
  // 🔹 Production (always use the backend subdomain)
  API_URL = `https://api.doughnationhq.cloud${BACKEND_PREFIX}`;
  WS_URL = `wss://api.doughnationhq.cloud/ws`;
}

export { API_URL, WS_URL };
>>>>>>> e2fa480054cccbac18683e9d7a24e8f97e5a6d85
