// --- Type Definitions ---
export interface InitializationParams {
    live: {
        live_id: string;
    };
    auth: {
        appid: string;
        token: string;
    };
    avatar: {
        avatar_type: '3min';
        input_mode: 'audio';
        role: string;
        video?: {
            video_width?: number;
            video_height?: number;
            bitrate?: number;
        };
    };
    streaming: {
        type: 'rtmp' | 'bytertc';
        rtc_app_id?: string;
        rtc_room_id?: string;
        rtc_uid?: string;
        rtc_token?: string;
    };
}

export interface ConfirmationMessage {
    code: number;
    message: string;
}

export interface ExceptionMessage {
    code: number;
    message: string;
}

export interface StatusMessage {
    type: 'voice_start' | 'voice_end';
    data?: object;
}

// --- Constants ---
export const WEBSOCKET_URL = "wss://openspeech.bytedance.com/virtual_human/avatar_live/live";

export const Protocol = {
  CTL_INITIALIZE:    '|CTL|00|',
  CTL_TERMINATE:     '|CTL|01|',
  CTL_INTERRUPT:     '|CTL|03|',
  CTL_END_OF_STREAM: '|CTL|12|',
  DAT_SSML:          '|DAT|01|',
  DAT_PCM_START:     '|DAT|02|',
  MSG_CONFIRMATION:  '|MSG|00|',
  MSG_EXCEPTION:     '|MSG|01|',
  MSG_HEARTBEAT:     '|MSG|02|',
  MSG_STATUS:        '|DAT|02|',
};

// --- WebSocket State Management ---
// Define a type for what we'll store in the global map
interface WebSocketInstance {
  ws: WebSocket;
  connectionPromise: Promise<WebSocket>;
  // Optional: Store resolve/reject functions for internal management if needed
  // resolve: () => void;
  // reject: (reason?: any) => void;
};

// Use globalThis for a true singleton in a single Node.js process
declare global {
  var digitalHumanMap: Map<string, WebSocketInstance>;
}
globalThis.digitalHumanMap = globalThis.digitalHumanMap || new Map();

// --- Core Service Functions ---

/**
 * Establishes a WebSocket connection to the Digital Human service.
 * @param params The initialization parameters for the session.
 * @returns A promise that resolves on successful connection or rejects on error.
 */
export function connectDigitalHuman(sessionId: string, params: InitializationParams): Promise<WebSocket> {
  // Create a new connection promise for this attempt.
  let newConnectionPromise: Promise<WebSocket>; // Declare it here
  newConnectionPromise = new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    globalThis.digitalHumanMap.set(sessionId, { ws, connectionPromise: newConnectionPromise }); // Store the new instance

    ws.onopen = () => {
      // Ensure this open event belongs to the current instance for this sessionId
      const currentInstance = globalThis.digitalHumanMap.get(sessionId);
      if (currentInstance && currentInstance.ws === ws) {
        console.log(`[DigitalHumanService] WebSocket connection opened successfully for sessionId ${sessionId}.`);
        sendDigitalHumanMessage(sessionId, Protocol.CTL_INITIALIZE, params);
      } else {
        console.warn('[DigitalHumanService] An old WebSocket instance opened after being superseded. Ignoring.');
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      const currentInstance = globalThis.digitalHumanMap.get(sessionId);
      if (currentInstance && currentInstance.ws === ws) {
        const data = event.data;

        if (typeof data === 'string') {
          const header = data.substring(0, 8);
          const bodyStr = data.substring(8);
          let body: object | { raw: string } = {};
          try {
            if (bodyStr) {
              body = JSON.parse(bodyStr);
            }
          } catch (e) {
            console.warn(`[DigitalHumanService] Failed to parse message body for sessionId ${sessionId}:`, bodyStr, e);
            body = { raw: bodyStr };
          }

          switch (header) {
            case Protocol.MSG_CONFIRMATION:
              console.log(`[DigitalHumanService] Received confirmation message for sessionId ${sessionId}. Connection promise resolved.`);
              resolve(ws);
              break;
            case Protocol.MSG_STATUS:
              const statusMsg = body as StatusMessage;
              if (statusMsg.type === 'voice_start') {
                console.log(`[DigitalHumanService] Received voice_start for sessionId ${sessionId}`);
              } else if (statusMsg.type === 'voice_end') {
                console.log(`[DigitalHumanService] Received voice_end for sessionId ${sessionId}`);
              } else {
                console.log(`[DigitalHumanService] Received status message for sessionId ${sessionId}:`, body)
              }
              break;
            case Protocol.MSG_HEARTBEAT:
              console.debug(`[DigitalHumanService] Received heartbeat message for sessionId ${sessionId}. Sending acknowledgment.`);
              break;
            default:
              console.warn(`[DigitalHumanService] Received unknown message type for sessionId ${sessionId}: header=${header}, body=`, body);
          }
        } else {
          console.warn(`[DigitalHumanService] Received unexpected binary data for sessionId ${sessionId}.`);
        }
      } else {
        console.warn(`[DigitalHumanService] Ignoring message from old WebSocket instance for sessionId ${sessionId}.`);
      }
    };

    ws.onerror = (event: Event) => {
      const currentInstance = globalThis.digitalHumanMap.get(sessionId);
      if (currentInstance && currentInstance.ws === ws) {
        console.error(`[DigitalHumanService] WebSocket error for sessionId ${sessionId}:`, event);
        globalThis.digitalHumanMap.delete(sessionId); // Remove from map on error
        reject(new Error(`WebSocket error for sessionId ${sessionId}`));
      } else {
        console.warn(`[DigitalHumanService] Ignoring error from old WebSocket instance for sessionId ${sessionId}.`);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      const currentInstance = globalThis.digitalHumanMap.get(sessionId);
      if (currentInstance && currentInstance.ws === ws) {
        console.log(`[DigitalHumanService] WebSocket connection closed for sessionId ${sessionId}:`, event.code, event.reason);
        globalThis.digitalHumanMap.delete(sessionId); // Remove from map on close
      } else {
        console.warn(`[DigitalHumanService] Ignoring close event from old WebSocket instance for sessionId ${sessionId}.`);
      }
    };
  });

  return newConnectionPromise;
}

/**
 * Closes the WebSocket connection to the Digital Human service.
 * This function is idempotent.
 */
export function closeDigitalHumanConnection(sessionId: string): void {
  const instance = globalThis.digitalHumanMap.get(sessionId);
  if (instance) {
    console.log(`[DigitalHumanService] Closing WebSocket connection for sessionId ${sessionId} with state ${instance.ws.readyState}.`);
    // Remove all listeners to prevent any further events from the closing socket
    if (instance.ws.readyState === WebSocket.OPEN || instance.ws.readyState === WebSocket.CONNECTING) {
      sendDigitalHumanMessage(sessionId, Protocol.CTL_TERMINATE);
      instance.ws.close(1000, 'Client initiated close.');
    }
    globalThis.digitalHumanMap.delete(sessionId); // Remove from map
  } else {
    console.log(`[DigitalHumanService] No active WebSocket connection found for sessionId ${sessionId} to close.`);
  }
}

/**
 * Sends a control message to the Digital Human service.
 * @param message The control message header.
 * @param data Optional data to send with the message.
 */
export function sendDigitalHumanMessage(sessionId: string, message: string, data?: object): void {
  const instance = globalThis.digitalHumanMap.get(sessionId);
  if (!instance || instance.ws.readyState !== WebSocket.OPEN) {
    console.warn(`[DigitalHumanService] WebSocket for sessionId ${sessionId} not open. Message not sent:`, message);
    return;
  }

  let fullMessage = message;

  if (data) {
    fullMessage += JSON.stringify(data);
  }
  instance.ws.send(fullMessage);
  console.debug(`[DigitalHumanService] Sent message for sessionId ${sessionId}:`, message, data ? JSON.stringify(data, null, 2) : '');
}

/**
 * Sends binary audio data to the Digital Human service.
 * @param data The binary audio data (Uint8Array).
 */
export function sendDigitalHumanBinaryData(sessionId: string, data: Uint8Array): void {
  const instance = globalThis.digitalHumanMap.get(sessionId);
  if (!instance || instance.ws.readyState !== WebSocket.OPEN) {
    // console.warn(`[DigitalHumanService] WebSocket for sessionId ${sessionId} not open. Binary data not sent.`);
    return;
  }
  const headerBytes = new TextEncoder().encode(Protocol.DAT_PCM_START);
  const merged = new Uint8Array(headerBytes.length + data.byteLength);
  merged.set(headerBytes, 0);
  merged.set(new Uint8Array(data), headerBytes.length);
  instance.ws.send(merged.buffer);
  // console.debug(`[DigitalHumanService] Sent binary data for sessionId ${sessionId}.`);
}

/**
 * Sends an interrupt signal to the Digital Human service.
 */
export function forceDigitalHumanInterrupt(sessionId: string): void {
  sendDigitalHumanMessage(sessionId, Protocol.CTL_INTERRUPT);
}

/**
 * Returns the connection promise for the Digital Human service.
 * Useful for awaiting connection status.
 * @returns A Promise that resolves when the connection is established, or null if no connection attempt is active.
 */
export const stopStreamRef = { current: false };

/**
 * Returns the connection promise for the Digital Human service.
 * Useful for awaiting connection status.
 * @returns A Promise that resolves when the connection is established, or null if no connection attempt is active.
 */
export function getDigitalHumanConnectionPromise(sessionId: string): Promise<WebSocket> | null {
  const instance = globalThis.digitalHumanMap.get(sessionId);
  return instance ? instance.connectionPromise : null;
}