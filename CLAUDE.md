# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Swift AI** is an AI-powered training platform for financial advisors that provides immersive role-playing scenarios using digital avatars. The application helps advisors practice referral-seeking skills and client interactions through real-time voice conversations with AI-powered personas.

## Development Commands

```bash
# Development
bun run dev          # Start development server on localhost:3000
bun run build        # Build production bundle
bun run start        # Start production server
bun run lint         # Run ESLint
```

## Key Architecture & Data Flow

### Core Components Structure

- **Scenarios**: Training scenarios with specific contexts (`app/lib/scenarios.ts`)
- **Personas**: AI client characters with profiles and voice IDs (`app/lib/personas.ts`)
- **Digital Human Service**: WebSocket-based avatar streaming (`app/lib/digitalHumanService.ts`)
- **Evaluation System**: AI-powered performance assessment (`app/lib/prompt/`)

### API Architecture

The application uses Next.js API routes for all backend functionality:

- `/api/route.ts` - Generate avatar main responses using Google Gemini
- `/api/digital-human/route.ts` - Digital avatar connection management
- `/api/evaluate/route.ts` - Performance evaluation using Google Gemini
- `/api/suggestion/route.ts` - Real-time conversation suggestions
- `/api/difficulty/route.ts` - Dynamic difficulty profile generation
- `/api/rtc-token/route.ts` - Retrieve WebRTC token from .env for avatar streaming

### Digital Avatar Interaction Flow

```text
User speaks 🎤
   │
   ├─▶ Browser streams audio → Whisper STT (with VAD)
   │     └─ `/api/whisper` returns transcribed text
   │
   ├─▶ `/api/route.ts` (Gemini) generates persona response
   │
   ├─▶ `generateSpeech()`
   │     └─ ElevenLabs TTS → PCM stream
   │     └─ `streamingStateManager` governs `stopStream`, `isInterrupting`, `isStreaming`
   │
   └─▶ WebSocket (`digitalHumanService`) forwards PCM ←──┐
          └─ Digital avatar lip-syncs audio              │
                                                         │
Interrupt 💡 (user starts talking) ──────────────────────┘
   └─ Front-end POST `/api/digital-human?interrupt`
         └─ `streamingStateManager.interrupt(sessionId)`
         └─ `generateSpeech()` detects flag → `CTL_INTERRUPT`
```

Key points:

- `streamingStateManager` is a global singleton keyed by `sessionId`.
- Interrupts propagate instantly without prop-drilling.
- All audio chunks are 1.28 KB and paced at ~40 ms for 16 kHz PCM.
- After normal completion or interrupt, flags are reset via `streamingStateManager.resetSession()`.


### AI Integration Stack

- **Google Gemini 2.5 Flash**: Primary conversation AI and evaluation engine
- **Groq SDK**: Fast AI inference for real-time responses
- **ElevenLabs**: High-quality text-to-speech for personas
- **OpenAI Whisper**: Speech-to-text transcription
- **ONNX Runtime**: On-device audio processing for VAD

### Database & State Management

- **Global State**: WebSocket connections managed via `globalThis.digitalHumanMap`
- **Client State**: React state management for UI interactions

## Important Implementation Details

### Voice Activity Detection (VAD)
- Uses ONNX models for real-time speech detection
- Files copied to `public/` during build via `next.config.mjs`
- Handles interruption and turn-taking in conversations

### Digital Human Service Patterns
- Session-based WebSocket connections with unique IDs
- Protocol-based message handling (`|CTL|`, `|DAT|`, `|MSG|` prefixes)
- Connection pooling and cleanup management
- Binary audio data streaming for real-time voice input

#### Avatar Speaking State Management
When a digital avatar is connected, the server sends WebSocket status messages to indicate avatar speaking state:
- **`voice_start`**: Sent when the digital avatar begins speaking - frontend should update `isAvatarSpeaking` to `true`
- **`voice_end`**: Sent when the digital avatar stops speaking - frontend should update `isAvatarSpeaking` to `false`

### Evaluation System Architecture
- Structured prompt templates in `app/lib/prompt/`
- Multi-criteria evaluation with scoring rubrics
- PDF generation for evaluation reports using jsPDF
- Real-time feedback during conversations

### Cross-Origin Requirements
- Configured COOP/COEP headers for SharedArrayBuffer support (required for ONNX)
- WebRTC integration requires specific security headers

## Environment Dependencies

The application requires several API keys and endpoints (check deployment environment):
- Google Gemini API key
- ElevenLabs API key
- BytePlus/ByteDance Digital Human credentials
- Groq API key

## Key Files to Understand

- `app/lib/types.ts` - Core type definitions for messages and conversations
- `app/lib/digitalHumanService.ts` - WebSocket management and avatar communication
- `app/lib/scenarios.ts` - Training scenario definitions and configurations
- `app/lib/personas.ts` - AI character profiles and voice mappings
- `app/lib/prompt/index.ts` - AI prompt templates for evaluation and conversation

## Testing

Manual QA focuses on live conversations:
1. Start a session and verify lip-sync.
2. Speak over the avatar to trigger an interrupt and ensure speech stops within 1-2 chunks.
3. Confirm `voice_start` / `voice_end` WebSocket events update UI correctly.

Run `bun run lint` to keep code tidy. Automated tests are planned but not yet implemented.