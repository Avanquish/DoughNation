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
  const apiHost = 'api.doughnationhq.cloud';
  API_URL = `https://${apiHost}${BACKEND_PREFIX}`;
  WS_URL = `wss://${apiHost}`;
  
  // Log configuration for debugging
  console.log('[Config] Production URLs:', {
    API_URL,
    WS_URL,
    hostname,
    BACKEND_PREFIX
  });
}

export { API_URL, WS_URL };
