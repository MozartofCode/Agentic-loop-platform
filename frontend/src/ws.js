let socket = null;
let shouldReconnect = false;
let reconnectDelay = 2000;
let reconnectTimer = null;

const listeners = { init: new Set(), event: new Set(), agent_update: new Set() };

function wsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function scheduleReconnect() {
  if (!shouldReconnect || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 30000);
}

export function connect() {
  shouldReconnect = true;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  socket = new WebSocket(wsUrl());

  socket.onopen = () => {
    reconnectDelay = 2000;
  };

  socket.onmessage = (msg) => {
    let payload;
    try {
      payload = JSON.parse(msg.data);
    } catch {
      return;
    }
    const set = listeners[payload.type];
    if (set) set.forEach((handler) => handler(payload));
  };

  socket.onclose = () => {
    scheduleReconnect();
  };

  socket.onerror = () => {
    socket.close();
  };
}

export function disconnect() {
  shouldReconnect = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) socket.close();
}

export function on(event, handler) {
  if (listeners[event]) listeners[event].add(handler);
}

export function off(event, handler) {
  if (listeners[event]) listeners[event].delete(handler);
}
