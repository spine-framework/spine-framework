// Polyfill globalThis.WebSocket with the 'ws' package for Node < 22.
// Required by supabase-js Realtime client which checks for WebSocket at construction time.
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    const { WebSocket } = require('ws')
    globalThis.WebSocket = WebSocket
  } catch {}
}
