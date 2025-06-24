// Simple in-memory broadcaster for Server-Sent Events (SSE)

// A global map to store active SSE clients by sessionId.
// This is a simplified in-memory solution. For production, a more robust
// pub/sub system like Redis or Vercel KV would be recommended.

// HMR-safe singleton pattern for the client map
const globalForSse = globalThis as unknown as {
  clients: Map<string, ReadableStreamDefaultController[]> | undefined;
};

const clients = globalForSse.clients ?? new Map<string, ReadableStreamDefaultController[]>();

if (process.env.NODE_ENV !== 'production') globalForSse.clients = clients;

/**
 * Registers a new client for a session.
 */
export function addClient(sessionId: string, controller: ReadableStreamDefaultController) {
  const list = clients.get(sessionId) ?? [];
  list.push(controller);
  clients.set(sessionId, list);
  console.log(`[SSE] client added, sessionId=${sessionId}, total=${list.length}`);
}

/**
 * Removes a client from a session.
 */
export function removeClient(sessionId: string, controller: ReadableStreamDefaultController) {
  const list = clients.get(sessionId);
  if (!list) return;

  const filtered = list.filter(c => c !== controller);

  if (filtered.length > 0) {
    clients.set(sessionId, filtered);
  } else {
    clients.delete(sessionId);
  }
  console.log(`[SSE] client removed, sessionId=${sessionId}, remaining=${filtered.length}`);
}

/**
 * Broadcasts a JSON-serialisable payload to all listeners in the session.
 * The `event` parameter controls the SSE event-type.
 */
export function sendEvent(sessionId: string, event: string, data: unknown) {
  console.log(`[SSE] sending event, sessionId=${sessionId}, event=${event}`);
  const list = clients.get(sessionId);
  if (!list) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();

  for (const controller of list) {
    try {
      controller.enqueue(encoder.encode(payload));
    } catch (error) {
      console.error(`[SSE] Failed to send event to a client for sessionId=${sessionId}. Removing client.`, error);
      // If enqueue fails, the client is likely disconnected. Remove it.
      removeClient(sessionId, controller);
    }
  }
}