const { hostname } = window.location;

const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// Change only if your backend actually prefixes routes with /api
const BACKEND_PREFIX = "";

let API_URL;
let WS_URL;

if (isLocalhost) {
  // 🔹 Local development
  API_URL = `http://127.0.0.1:8000${BACKEND_PREFIX}`;
  WS_URL = `ws://127.0.0.1:8000`;
} else {
  // 🔹 Production (always use the backend subdomain)
  API_URL = `https://api.doughnationhq.cloud${BACKEND_PREFIX}`;
  WS_URL = `wss://api.doughnationhq.cloud`;
}

export { API_URL, WS_URL };
