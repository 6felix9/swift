# Digital Avatar WebSocket Connection & Streaming Management

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [WebSocket Connection Management](#websocket-connection-management)
3. [Audio Streaming Architecture](#audio-streaming-architecture)
4. [Interrupt & State Management](#interrupt--state-management)
5. [Implementation Details](#implementation-details)
6. [Integration Guide](#integration-guide)
7. [Development & Debugging](#development--debugging)

---

## Architecture Overview

The Swift AI digital avatar system implements a sophisticated real-time voice conversation architecture using WebSocket connections for audio streaming, voice activity detection (VAD), and intelligent interrupt handling.

### High-Level Data Flow

```
User Speech 🎤
    │
    ├─▶ Silero VAD v5 (ONNX) ──▶ Speech Detection + 200ms Interrupt Timer
    │                             └─ PATCH /api/digital-human?interrupt
    │
    ├─▶ Audio Encoding ──▶ WAV ──▶ POST /api ──▶ Groq Whisper STT
    │                                    │
    │                                    ├─▶ Google Gemini (AI Response)
    │                                    │
    │                                    └─▶ ElevenLabs TTS
    │                                          │
    │                                          └─▶ PCM Stream (16kHz)
    │                                               │
    │                                               └─▶ 1,280-byte chunks
    │                                                    │
    └─▶ WebSocket (ByteDance) ◀──────────────────────────┘
           │
           ├─▶ |DAT|02| + PCM data ──▶ Digital Avatar
           │
           ├─▶ voice_start/voice_end events ──▶ Frontend State
           │
           └─▶ Video Stream (BytePlusRTC) ──▶ Avatar Video Display
```

### Core Components

- **Digital Human Service** (`app/lib/digitalHumanService.ts`) - WebSocket connection management
- **Streaming State Manager** (`app/lib/streamingState.ts`) - Global state coordination  
- **ElevenLabs Integration** (`app/lib/elevenlabs.ts`) - Text-to-speech streaming
- **Voice Activity Detection** - Real-time speech detection using Silero VAD v5
- **BytePlusRTC Service** (`app/lib/rtcService.ts`) - Video streaming integration

---

## WebSocket Connection Management

### Connection Endpoint
- **Primary**: `wss://openspeech.bytedance.com/virtual_human/avatar_live/live`
- **Service**: ByteDance Digital Human Platform

### Session-Based Architecture

The system uses a global connection pool managed via `globalThis.digitalHumanMap`:

```typescript
// Global connection storage
globalThis.digitalHumanMap = new Map<string, WebSocketInstance>();

// Session management
const sessionId = generateUniqueSessionId();
const connection = {
  ws: webSocketInstance,
  isConnected: boolean,
  lastHeartbeat: timestamp,
  persona: personaConfig
};
```

### Connection Establishment Process

1. **Initialization Request** (`POST /api/digital-human`)
   ```typescript
   {
     sessionId: string,
     persona: {
       avatarId: string,
       voiceId: string,
       profile: PersonaProfile
     }
   }
   ```

2. **WebSocket Handshake**
   ```typescript
   // Initialize connection with avatar configuration
   ws.send('|CTL|00|' + JSON.stringify({
     avatar_id: persona.avatarId,
     voice_config: voiceSettings,
     stream_config: audioConfig
   }));
   ```

3. **Connection Validation** (6 attempts over 3 seconds)
   - Requires 3 consecutive successful responses for stability confirmation
   - Connection state persisted in `sessionStorage` for browser refresh recovery

### Protocol Message System

The WebSocket uses a structured protocol with message prefixes:

```typescript
const Protocol = {
  // Control Messages
  CTL_INITIALIZE:    '|CTL|00|',  // Initialize avatar connection
  CTL_TERMINATE:     '|CTL|01|',  // Terminate session
  CTL_INTERRUPT:     '|CTL|03|',  // Interrupt avatar speech
  CTL_END_OF_STREAM: '|CTL|12|',  // End audio stream marker
  
  // Data Messages  
  DAT_SSML:          '|DAT|01|',  // SSML formatted text
  DAT_PCM_START:     '|DAT|02|',  // PCM audio data chunks
  
  // Status Messages
  MSG_CONFIRMATION:  '|MSG|00|',  // Connection confirmation
  MSG_EXCEPTION:     '|MSG|01|',  // Error notifications
  MSG_HEARTBEAT:     '|MSG|02|',  // Keep-alive heartbeat
  MSG_STATUS:        '|DAT|02|',  // Avatar status updates
};
```

### Message Handling

```typescript
ws.onmessage = (event) => {
  const message = event.data;
  
  if (message.startsWith('|MSG|00|')) {
    // Connection confirmed
    handleConnectionConfirmation(message);
  } else if (message.includes('"voice_start"')) {
    // Avatar started speaking
    updateAvatarSpeakingState(sessionId, true);
  } else if (message.includes('"voice_end"')) {
    // Avatar stopped speaking  
    updateAvatarSpeakingState(sessionId, false);
  } else if (message.startsWith('|MSG|01|')) {
    // Handle exceptions
    handleWebSocketError(message);
  }
};
```

---

## Audio Streaming Architecture

### ElevenLabs TTS Integration

**Configuration:**
- **Model**: `eleven_flash_v2_5` (optimized for speed)
- **Output Format**: `pcm_16000` (16kHz PCM)
- **Voice Settings**: Configurable stability, clarity, and style

**Streaming Process:**
```typescript
async function generateSpeech(text: string, sessionId: string) {
  const stream = await elevenlabs.generate({
    voice: persona.voiceId,
    model_id: "eleven_flash_v2_5",
    output_format: "pcm_16000"
  });
  
  const reader = stream.getReader();
  streamingStateManager.setActiveReader(sessionId, reader);
  
  while (true) {
    // Check for interrupt signals
    if (streamingStateManager.shouldStop(sessionId)) {
      reader.cancel();
      sendWebSocketMessage(sessionId, '|CTL|03|'); // Interrupt
      break;
    }
    
    const { done, value } = await reader.read();
    if (done) break;
    
    // Send 1,280-byte chunks with 40ms timing
    await sendAudioChunk(sessionId, value);
    await sleep(40); // Maintain real-time sync for 16kHz audio
  }
  
  // End of stream marker
  sendWebSocketMessage(sessionId, '|CTL|12|');
  streamingStateManager.resetSession(sessionId);
}
```

### PCM Audio Chunk Processing

**Audio Specifications:**
- **Sample Rate**: 16,000 Hz
- **Bit Depth**: 16-bit
- **Channels**: Mono
- **Chunk Size**: 1,280 bytes (40ms of audio at 16kHz)
- **Timing**: 40ms intervals for real-time synchronization

**Chunk Transmission:**
```typescript
async function sendAudioChunk(sessionId: string, audioData: Uint8Array) {
  const connection = globalThis.digitalHumanMap.get(sessionId);
  if (!connection?.ws || connection.ws.readyState !== WebSocket.OPEN) {
    return;
  }
  
  // Protocol: |DAT|02| prefix + PCM data
  const message = '|DAT|02|' + Array.from(audioData)
    .map(byte => String.fromCharCode(byte))
    .join('');
    
  connection.ws.send(message);
}
```

---

## Interrupt & State Management

### Global Streaming State Manager

The `streamingStateManager` is a singleton that coordinates audio streaming state across all sessions:

```typescript
class StreamingStateManager {
  private sessionStates = new Map<string, SessionState>();
  
  interface SessionState {
    stopStream: boolean;
    isInterrupting: boolean; 
    isStreaming: boolean;
    activeStreamReader?: ReadableStreamDefaultReader;
  }
  
  interrupt(sessionId: string): void {
    const state = this.getOrCreateState(sessionId);
    
    // Prevent duplicate interrupts
    if (state.isInterrupting) return;
    
    state.stopStream = true;
    state.isInterrupting = true;
    
    // Cancel active ElevenLabs stream
    if (state.activeStreamReader) {
      state.activeStreamReader.cancel();
    }
  }
  
  resetSession(sessionId: string): void {
    const state = this.getOrCreateState(sessionId);
    state.stopStream = false;
    state.isInterrupting = false;
    state.isStreaming = false;
    state.activeStreamReader = undefined;
  }
}

const streamingStateManager = new StreamingStateManager();
```

### Smart Interrupt Mechanism

The system implements intelligent interrupt handling to prevent accidental interruptions:

**Voice Activity Detection Configuration:**
```typescript
const vadOptions = {
  model: VadModel.SileroV5,        // Latest Silero VAD model
  startThreshold: 0.6,             // Speech detection sensitivity  
  endThreshold: 0.35,              // Silence detection sensitivity
  frameSamples: 512,               // Frame size for v5 model
  positiveSpeechThreshold: 0.9,    // Confidence threshold
  negativeSpeechThreshold: 0.1,    // Non-speech threshold
  preSpeechPadFrames: 10,         // Frames before speech start
  redemptionFrames: 31,           // Frames of silence before speech end (~1 second)
  minSpeechFrames: 10,            // Minimum speech length
};
```

**Interrupt Flow:**
```typescript
// 1. Speech Detection
vad.onSpeechStart = () => {
  console.log("User speech detected");
  
  // Set interrupt timer (200ms protection)
  interruptTimer = setTimeout(() => {
    if (isAvatarSpeaking) {
      console.log("Interrupting avatar after 200ms threshold");
      sendInterrupt();
    }
  }, 200);
};

// 2. Cancel false positives
vad.onSpeechEnd = (audio) => {
  clearTimeout(interruptTimer);
  
  // Process speech if it was substantial
  if (audio.length > minSpeechLength) {
    processUserSpeech(audio);
  }
};

// 3. Send interrupt signal
async function sendInterrupt() {
  await fetch('/api/digital-human', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      sessionId: currentSessionId,
      action: 'interrupt' 
    })
  });
}
```

### Avatar Speaking State Synchronization

The frontend synchronizes avatar speaking state with WebSocket events:

```typescript
// WebSocket message handler
function handleAvatarStatusUpdate(message: string) {
  if (message.includes('"voice_start"')) {
    setIsAvatarSpeaking(true);
    console.log("Avatar started speaking");
  } else if (message.includes('"voice_end"')) {
    setIsAvatarSpeaking(false);
    console.log("Avatar stopped speaking");
  }
}

// React state management
const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
const [isUserSpeaking, setIsUserSpeaking] = useState(false);

// Interrupt logic
useEffect(() => {
  if (isUserSpeaking && isAvatarSpeaking && !isInterrupting) {
    // User started speaking while avatar is talking
    triggerInterruptTimer();
  }
}, [isUserSpeaking, isAvatarSpeaking]);
```

---

## Implementation Details

### Key Files and Responsibilities

#### 1. `app/lib/digitalHumanService.ts` - Core WebSocket Management
```typescript
class DigitalHumanService {
  private static instance: DigitalHumanService;
  private connections = new Map<string, WebSocketConnection>();
  
  async createConnection(sessionId: string, persona: Persona): Promise<boolean> {
    // 1. Establish WebSocket connection
    // 2. Send initialization message
    // 3. Validate connection stability  
    // 4. Store in global connection map
  }
  
  async sendAudioStream(sessionId: string, audioData: Uint8Array): Promise<void> {
    // 1. Check connection status
    // 2. Format PCM data with protocol headers
    // 3. Send via WebSocket
    // 4. Handle transmission errors
  }
  
  async disconnect(sessionId: string): Promise<void> {
    // 1. Send termination message
    // 2. Close WebSocket connection
    // 3. Clean up global state
    // 4. Reset streaming state
  }
}
```

#### 2. `app/api/digital-human/route.ts` - API Endpoints
```typescript
// POST - Create new digital human connection
export async function POST(request: Request) {
  const { sessionId, persona } = await request.json();
  
  // Initialize connection with retry logic
  for (let attempt = 1; attempt <= 6; attempt++) {
    const isConnected = await digitalHumanService.createConnection(sessionId, persona);
    
    if (isConnected) {
      // Validate stability with multiple checks
      const isStable = await validateConnectionStability(sessionId);
      if (isStable) {
        return Response.json({ success: true, sessionId });
      }
    }
    
    await sleep(500 * attempt); // Exponential backoff
  }
  
  return Response.json({ success: false }, { status: 500 });
}

// PATCH - Send interrupt signal  
export async function PATCH(request: Request) {
  const { sessionId } = await request.json();
  
  // Interrupt active audio streaming
  streamingStateManager.interrupt(sessionId);
  
  // Send control message to avatar
  await digitalHumanService.sendControlMessage(sessionId, '|CTL|03|');
  
  return Response.json({ success: true });
}

// GET - Session status or disconnect
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const action = searchParams.get('action');
  
  if (action === 'disconnect') {
    await digitalHumanService.disconnect(sessionId);
    return Response.json({ success: true });
  }
  
  // Return session status
  const isConnected = digitalHumanService.isConnected(sessionId);
  return Response.json({ connected: isConnected });
}
```

#### 3. `app/lib/streamingState.ts` - Global State Coordination
```typescript
interface SessionState {
  stopStream: boolean;
  isInterrupting: boolean;
  isStreaming: boolean;
  activeStreamReader?: ReadableStreamDefaultReader<Uint8Array>;
}

class StreamingStateManager {
  private sessionStates = new Map<string, SessionState>();
  
  getOrCreateState(sessionId: string): SessionState {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        stopStream: false,
        isInterrupting: false,
        isStreaming: false,
        activeStreamReader: undefined
      });
    }
    return this.sessionStates.get(sessionId)!;
  }
  
  shouldStop(sessionId: string): boolean {
    return this.getOrCreateState(sessionId).stopStream;
  }
  
  setActiveReader(sessionId: string, reader: ReadableStreamDefaultReader<Uint8Array>): void {
    const state = this.getOrCreateState(sessionId);
    state.activeStreamReader = reader;
    state.isStreaming = true;
  }
  
  interrupt(sessionId: string): void {
    const state = this.getOrCreateState(sessionId);
    
    if (state.isInterrupting) {
      console.log('Interrupt already in progress for session:', sessionId);
      return;
    }
    
    console.log('Interrupting session:', sessionId);
    state.stopStream = true;
    state.isInterrupting = true;
    
    if (state.activeStreamReader) {
      state.activeStreamReader.cancel().catch(console.error);
    }
  }
  
  resetSession(sessionId: string): void {
    console.log('Resetting session state:', sessionId);
    const state = this.getOrCreateState(sessionId);
    state.stopStream = false;
    state.isInterrupting = false;
    state.isStreaming = false;
    state.activeStreamReader = undefined;
  }
}

// Global singleton instance
const streamingStateManager = new StreamingStateManager();
export default streamingStateManager;
```

### Error Handling Patterns

#### Connection Resilience
```typescript
async function handleWebSocketError(sessionId: string, error: Error) {
  console.error(`WebSocket error for session ${sessionId}:`, error);
  
  // Clean up session state
  streamingStateManager.resetSession(sessionId);
  
  // Attempt reconnection with exponential backoff
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    await sleep(1000 * Math.pow(2, attempts));
    
    try {
      const reconnected = await digitalHumanService.createConnection(sessionId, persona);
      if (reconnected) {
        console.log(`Reconnected session ${sessionId} after ${attempts + 1} attempts`);
        break;
      }
    } catch (reconnectError) {
      console.error(`Reconnection attempt ${attempts + 1} failed:`, reconnectError);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    // Notify frontend of permanent connection failure
    broadcastConnectionFailure(sessionId);
  }
}
```

#### Graceful Stream Interruption
```typescript
async function interruptAudioStream(sessionId: string) {
  console.log(`Interrupting audio stream for session: ${sessionId}`);
  
  // 1. Set interrupt flag
  streamingStateManager.interrupt(sessionId);
  
  // 2. Cancel active ElevenLabs stream
  const state = streamingStateManager.getState(sessionId);
  if (state?.activeStreamReader) {
    await state.activeStreamReader.cancel();
  }
  
  // 3. Send interrupt control message
  const connection = globalThis.digitalHumanMap.get(sessionId);
  if (connection?.ws.readyState === WebSocket.OPEN) {
    connection.ws.send('|CTL|03|');
    
    // 4. Wait for buffer drain
    await sleep(50);
    
    // 5. Send end-of-stream marker
    connection.ws.send('|CTL|12|');
  }
  
  // 6. Reset session state
  setTimeout(() => {
    streamingStateManager.resetSession(sessionId);
  }, 100);
}
```

---

## Integration Guide

### Frontend VAD Integration

#### Component Setup
```tsx
import { useMicVAD, utils } from "@ricky0123/vad-react";

const VADComponent = ({ sessionId }: { sessionId: string }) => {
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [interruptTimer, setInterruptTimer] = useState<NodeJS.Timeout>();
  
  const vad = useMicVAD({
    model: VadModel.SileroV5,
    startThreshold: 0.6,
    endThreshold: 0.35,
    frameSamples: 512,
    positiveSpeechThreshold: 0.9,
    negativeSpeechThreshold: 0.1,
    redemptionFrames: 31, // ~1 second of silence
    minSpeechFrames: 10,
    
    onSpeechStart: () => {
      console.log("User speech started");
      setIsUserSpeaking(true);
      
      // Smart interrupt with 200ms protection
      if (isAvatarSpeaking) {
        const timer = setTimeout(() => {
          console.log("Interrupting avatar after 200ms");
          sendInterrupt(sessionId);
        }, 200);
        setInterruptTimer(timer);
      }
    },
    
    onSpeechEnd: (audio) => {
      console.log("User speech ended");
      setIsUserSpeaking(false);
      
      // Cancel interrupt timer
      if (interruptTimer) {
        clearTimeout(interruptTimer);
        setInterruptTimer(undefined);
      }
      
      // Process speech if substantial
      if (audio.length > 0) {
        processUserSpeech(audio);
      }
    },
    
    onVADMisfire: () => {
      console.log("VAD misfire detected");
      setIsUserSpeaking(false);
    }
  });
  
  return (
    <div>
      <div>VAD Status: {vad.loading ? "Loading..." : vad.listening ? "Listening" : "Not Listening"}</div>
      <div>User Speaking: {isUserSpeaking ? "Yes" : "No"}</div>
      <div>Avatar Speaking: {isAvatarSpeaking ? "Yes" : "No"}</div>
    </div>
  );
};
```

#### Audio Processing
```typescript
async function processUserSpeech(audioData: Float32Array) {
  // Convert Float32Array to WAV format
  const wavBuffer = utils.encodeWAV(audioData, {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16
  });
  
  // Create FormData for API submission
  const formData = new FormData();
  const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
  formData.append('audio', audioBlob, 'speech.wav');
  formData.append('sessionId', sessionId);
  
  try {
    // Submit to main API route for processing
    const response = await fetch('/api', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Speech processed successfully:', result);
    
  } catch (error) {
    console.error('Error processing speech:', error);
  }
}

async function sendInterrupt(sessionId: string) {
  try {
    await fetch('/api/digital-human', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'interrupt' })
    });
    console.log('Interrupt signal sent successfully');
  } catch (error) {
    console.error('Error sending interrupt:', error);
  }
}
```

### WebRTC Video Integration

#### RTC Service Setup
```typescript
import { createClient, Credentials, UserInfo } from "@byteplus/rtc";

class RTCService {
  private client?: ReturnType<typeof createClient>;
  private isConnected = false;
  
  async initialize(sessionId: string) {
    // Fetch secure token from API
    const tokenResponse = await fetch('/api/rtc-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const { token, appId, roomId, userId } = await tokenResponse.json();
    
    // Create RTC client
    this.client = createClient({
      appId,
      roomId,
      userId,
      credentials: { token } as Credentials
    });
    
    // Setup event handlers
    this.client.on('user-published', this.handleUserPublished);
    this.client.on('user-unpublished', this.handleUserUnpublished);
    this.client.on('connection-state-changed', this.handleConnectionState);
    
    // Join room
    await this.client.join();
    this.isConnected = true;
    
    console.log(`RTC connected for session: ${sessionId}`);
  }
  
  private handleUserPublished = (user: UserInfo, mediaType: 'video' | 'audio') => {
    if (mediaType === 'video') {
      console.log('Avatar video stream published');
      
      // Subscribe to video stream
      this.client?.subscribe(user.userId, 'video');
      
      // Render video in container
      const videoContainer = document.getElementById('video-container');
      if (videoContainer) {
        this.client?.setRemoteVideoPlayer(user.userId, {
          renderDom: videoContainer,
          renderMode: 1 // Fit mode
        });
      }
    }
  };
  
  private handleUserUnpublished = (user: UserInfo, mediaType: 'video' | 'audio') => {
    console.log(`Avatar ${mediaType} stream unpublished`);
  };
  
  private handleConnectionState = (state: string) => {
    console.log(`RTC connection state: ${state}`);
    this.isConnected = (state === 'connected');
  };
  
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.leave();
      this.client = undefined;
      this.isConnected = false;
    }
  }
}
```

### React Component Integration

#### Main Conversation Component
```tsx
const ConversationComponent = () => {
  const [sessionId] = useState(() => generateUniqueId());
  const [isAvatarConnected, setIsAvatarConnected] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  
  // Initialize avatar connection
  useEffect(() => {
    const initializeAvatar = async () => {
      try {
        // Create digital human connection
        const response = await fetch('/api/digital-human', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            persona: selectedPersona
          })
        });
        
        if (response.ok) {
          setIsAvatarConnected(true);
          
          // Initialize RTC video
          await rtcService.initialize(sessionId);
          
          // Setup WebSocket event listeners
          setupWebSocketListeners();
          
        } else {
          console.error('Failed to initialize avatar connection');
        }
      } catch (error) {
        console.error('Error initializing avatar:', error);
      }
    };
    
    initializeAvatar();
    
    // Cleanup on unmount
    return () => {
      cleanupConnections();
    };
  }, [sessionId, selectedPersona]);
  
  const setupWebSocketListeners = () => {
    // Listen for avatar speaking state changes
    window.addEventListener('avatar-voice-start', () => {
      setIsAvatarSpeaking(true);
    });
    
    window.addEventListener('avatar-voice-end', () => {
      setIsAvatarSpeaking(false);
    });
  };
  
  const cleanupConnections = async () => {
    try {
      // Disconnect digital human
      await fetch(`/api/digital-human?sessionId=${sessionId}&action=disconnect`);
      
      // Disconnect RTC
      await rtcService.disconnect();
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };
  
  return (
    <div className="conversation-container">
      <div className="video-section">
        <div id="video-container" className="avatar-video" />
        <div className="status-indicators">
          <span className={`status ${isAvatarConnected ? 'connected' : 'disconnected'}`}>
            Avatar: {isAvatarConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className={`status ${isAvatarSpeaking ? 'speaking' : 'quiet'}`}>
            Avatar: {isAvatarSpeaking ? 'Speaking' : 'Listening'}
          </span>
        </div>
      </div>
      
      <div className="conversation-section">
        <ConversationDisplay messages={conversationMessages} />
        <VADComponent sessionId={sessionId} />
      </div>
    </div>
  );
};
```

---

## Conclusion

This digital avatar WebSocket connection and streaming management system represents a sophisticated real-time voice conversation platform. The architecture successfully handles:

- **Real-time Audio Streaming** with 40ms latency using 16kHz PCM format
- **Intelligent Interrupt Handling** with 200ms protection against false triggers  
- **Global State Management** via singleton pattern for multi-session coordination

The system integrates multiple AI services (Gemini, ElevenLabs, Whisper) with WebSocket streaming and WebRTC video to deliver an immersive training experience for professionals across various domains.

**Key Success Factors:**
1. **Protocol-based message handling** ensures reliable communication
2. **Session-based architecture** enables scalable multi-user support  
3. **Smart interrupt detection** prevents accidental conversation disruptions
4. **Comprehensive error handling** maintains system stability
5. **Modular design** allows for easy maintenance and feature additions

For any questions or issues with implementation, refer to the debugging section or examine the specific file references provided throughout this documentation.