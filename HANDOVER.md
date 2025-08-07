# Project Handover Documentation

## Overview
**Swift AI** is an AI-powered training platform providing role-playing scenarios with digital avatars across different professional domains: Financial Services, Healthcare, Customer Service and etc. (TBC). 

**Key Components:**
- VAD (Voice Activity Detection)
- BytePlus Digital Live Avatar
- Turso Database (SQLite) for session storage
- Pipeline: STT (Groq Whisper) -> LLM (Gemini Flash) -> TTS (ElevenLabs) -> Avatar (WebSocket)

## Current Status
**Fully Working:**
- **End-to-end voice pipeline** — VAD detects user speech → audio is sent to STT (Groq Whisper) → transcript is processed by Gemini Flash → AI response returned → ElevenLabs TTS generates audio → audio chunks are streamed over WebSocket to the BytePlus avatar.
- **Call evaluation & PDF report** generation after each session.
- **Sudden avatar disconnection handling** — automatic WebSocket clearing.
- **Mid-speech interruption** — if the user begins speaking, VAD triggers immediate cancellation of the current TTS stream, allowing a new turn to begin seamlessly.
- **Session storage** — sessions are stored in the Turso database (SQLite) with user-level isolation using browser-based identification.

**Recently Implemented:**
- Scoring chart service (scoringService.ts): Analyzes and estimates the current conversation score at every turn by making an API call to the LLM. The chart updates live with each new score.

## Work in Progress
**Improvements to the scoring chart service**
- The scoring chart service is currently implemented with the prompt hardcoded in scoringService.ts, which means it is optimized solely for the referral skills scenario and is not adaptable to other scenarios.
- The current scoring LLM’s accuracy is not sufficient to provide a reliable estimate of the conversation’s current score, as it uses a weaker model compared to the final evaluation, which relies on Gemini Pro 2.5. Switching to a more accurate model would improve scoring reliability, but would also reduce speed and negatively affect user experience and functionality. Therefore, further experimentation with various models is needed to find an optimal balance between accuracy and responsiveness.
- The current chart uses the line chart component from shadcn/ui, which is not very comprehensive and can be difficult to resize or customize. Consider experimenting with other charting libraries such as Recharts or Chart.js for greater flexibility and improved visualization.

## Open Issues & Known Bugs
**Avatar intermittently fails to display on the video element – CRITICAL**
- Bug is hard to replicate and is not consistent.
- Everything appears to work normally—logs indicate a successful connection and network protocols show the connection is active. However, the avatar is not displayed on the video element. No data exchange seems to occur (stream appears frozen). After several minutes, the avatar may suddenly reappear and data exchange resumes as normal.
- I suspect the browser's autoplay policy restriction (https://developer.chrome.com/blog/autoplay) might be causing this issue, however, I've tested on multiple browsers and the issue appears to persist across browsers too. 
- I've also since sent the BytePlus team a video of the issue but have not received a response since.

**Occasionally, no sound will be coming out of the avatar - CRITICAL**
- Bug is hard to replicate and is not consistent.
- Occurs when user starts session and avatar gets displayed, everything appears to be working normally but no sound is coming out of the avatar despite lip sync and text display.

**Overlapping first few lines of audio - HIGH**
- On every TTS request in elevenlabs.ts, any ongoing streaming TTS request to the websocket should be cancelled and cleared before a new TTS stream begins. This is intended to prevent overlapping audio by ensuring only the most recent line is played. 
- Problem: The interruption logic does not work correctly for the first spoken line. When the avatar starts speaking its initial (fixed) line, spamming the avatar with additional suggestions or responses will result in multiple audio streams playing simultaneously—i.e., the first stream is not being cleared as expected.
- To replicate: Spam the avatar with suggestions/responses the moment the avatar starts speaking its first line and you will witness multiple audio being overlapped together. Essentially the avatar is not able to clear the previous stream.

## Technical Debt & TODOs

**Page.tsx - Component Architecture**
- The current main UI is all rendered in page.tsx (1000+ lines) where most components are co-located. It follows a wizard step pattern where each step is rendered in a separate component. However, this is not very clean and results in messy prop drilling of the same data to multiple components.
- The avatar interaction is only rendered when `listeningInitiated` is true, making the component lifecycle complex and hard to debug.
- The interaction with the avatar should be extracted into its own component and follow the same pattern as other wizard steps for easier debugging and testing.

**handleSubmit function in Page.tsx**
- Conversation initialization currently relies on sending a "START" message to the avatar, which is not ideal. If a user types "START" as part of natural conversation, it can unintentionally trigger the avatar.
- This approach is not robust and should be refactored to use a more reliable and unambiguous method for conversation initiation (e.g., session state flags or dedicated API endpoints).

**Session Management & Memory Leaks**
- WebSocket connections stored in `globalThis.digitalHumanMap` may not be properly cleaned up on abrupt disconnections or browser crashes.
- No timeout mechanisms for orphaned sessions - connections could persist indefinitely.
- Streaming state in `streamingStateManager` needs garbage collection for old sessions.
- Database session storage automatically maintains 10-session limit via cleanup mechanism with full user-level isolation.

**Error Handling Inconsistencies**
- Error handling patterns vary significantly across service files - some throw errors, some return null, some use try/catch differently.
- No centralized error logging or monitoring system for production debugging.
- WebSocket connection failures don't have consistent retry logic or user feedback.
- Audio stream failures (ElevenLabs, WebSocket) don't have graceful degradation paths.

**Performance & Memory Management**
- Multiple AI fallback chains create unnecessary latency - could implement caching for repeated requests.
- VAD model loading happens on every page load - should be cached or lazy-loaded.
- Audio chunk processing (1.28KB at 40ms intervals) could be optimized for different network conditions.
- No monitoring of memory usage for long-running sessions or multiple concurrent users.

**Prompt Library Management**
- Currently, all prompts are stored in the `/lib/prompt` folder. As the number of scenarios grows, it would be more scalable to store these prompts in a database.
- For each scenario, there should be four key prompts: suggestion prompt, evaluation prompt, scoring prompt, and AI response prompt. Ensuring all four are present and tailored is essential for optimal performance.
- I recommend creating a dedicated prompt database so prompts can be managed and updated outside the codebase, making maintenance and iteration easier.
- Since the application supports multiple domains, optimizing any given scenario typically requires prompt engineering across several prompts unique to that scenario.

**LLM Fallback Chain Duplication**
- Each service file includes multiple LLM fallback mechanisms to minimize errors in production. For example, in `evaluationService.ts`, the process first attempts to use Gemini Pro 2.5. If that fails, it falls back to Gemini Flash, then Groq, and finally throws an error if all options are exhausted.
- This pattern of "fallback chains" is repeated across several service files (`aiResponseService.ts`, `evaluationService.ts`, `suggestionService.ts`), resulting in significant code duplication.
- To improve maintainability, I suggest refactoring this logic into a universal fallback handler or utility function. This would reduce duplication, centralize error handling, and make future updates to the fallback logic much easier.

**Audio Processing & Streaming Issues**
- PCM audio streaming logic in `elevenlabs.ts` has complex interrupt coordination that could be simplified.
- No audio quality monitoring or fallback for poor network conditions.
- ElevenLabs rate limiting not properly handled for concurrent users - could cause service disruptions.
- WebSocket binary data handling lacks proper error recovery if chunks are dropped or corrupted.

**Testing & Quality Assurance**
- There are currently no automated tests; all testing relies on manual QA, which is time-consuming and inefficient.
- The primary area in need of robust testing is prompt engineering—ensuring each scenario's prompts are optimized and perform as expected.
- Voice interaction testing is particularly challenging to automate but critical for quality assurance.
- Need unit tests for core services (especially evaluation parsing, session management, streaming state coordination).
- I recommend developing a test suite that supports automated testing of prompts against their respective functions. This will make it easier to benchmark, iterate, and maintain high prompt quality across all scenarios.

**Security & Production Readiness**
- No input validation for audio files or conversation content that could contain malicious data.
- API keys are properly secured but no rate limiting or usage monitoring for production deployment.
- WebSocket connections lack proper authentication beyond session IDs.
- No audit logging for training sessions or evaluation data for compliance purposes.

## Setup & Deployment Notes
**Environment Variables Required:**
```bash
# AI Services (all required)
GEMINI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=

# BytePlus Digital Human (all required)
BYTEPLUS_APP_ID=
BYTEPLUS_ACCESS_TOKEN=
AVATAR_ROLE=

# WebRTC (required for avatar streaming)
RTC_APP_ID=
RTC_APP_KEY=
RTC_ROOM_ID=
AVATAR_RTC_USER_ID=
AVATAR_RTC_TOKEN=

# Database (required for session storage)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## Dependencies & Accounts
**External Services Setup Required:**
- **Google AI Studio:** Gemini 2.5 API access
- **Groq:** Account with sufficient quota for Whisper + chat models
- **ElevenLabs:** Professional plan recommended for multiple voices
- **BytePlus:** Digital human service account with avatar roles configured (read DIGITAL_AVATAR.md for full documentation of Digital Avatar connection)
- **WebRTC:** BytePlus RTC service for video streaming
- **Turso:** Edge SQLite database for session persistence

**Service Dependencies:**
- ElevenLabs voices mapped in `personas.ts` - ensure voice IDs are valid
- BytePlus avatar roles must match persona configurations
- Groq models: `distil-whisper-large-v3-en`, `meta-llama/llama-4-maverick-17b-128e-instruct`

## Next Steps & Recommendations
**Priorities:**

**Database & User Management: ✅ COMPLETED**
- **User-Level Session History** - Successfully implemented browser-based user isolation:
  - **Privacy-Focused Design:** Each browser generates a unique UUID stored in localStorage
  - **Complete Session Isolation:** Users see only their own training sessions and evaluations
  - **Per-User Cleanup:** Session limits (10 sessions) are enforced per browser, not globally
  - **No Authentication Required:** Uses persistent localStorage identification for simplicity
  - **Migration Support:** Legacy sessions handled via dedicated API endpoints and utilities

**Updated Database Schema (`sessions` table):**
```
┌─────────────────────┬──────────────┬─────────────────────────────────────┐
│ Field               │ Type         │ Description                         │
├─────────────────────┼──────────────┼─────────────────────────────────────┤
│ id                  │ TEXT (PK)    │ Unique session identifier           │
│ user_id             │ TEXT         │ Browser-specific user identifier    │
│ timestamp           │ TEXT         │ ISO timestamp of session            │
│ scenario_data       │ TEXT (JSON)  │ ScenarioDefinition object           │
│ persona_data        │ TEXT (JSON)  │ Persona configuration               │
│ difficulty_data     │ TEXT (JSON)  │ Difficulty parameters               │
│ evaluation_data     │ TEXT (JSON)  │ EvaluationResponse with scores      │
│ transcript          │ TEXT (JSON)  │ Full conversation Message[]         │
│ call_duration       │ INTEGER      │ Session duration in milliseconds    │
│ conversation_scores │ TEXT (JSON)  │ Real-time scoring data              │
│ created_at          │ TEXT         │ Creation timestamp                  │
│ updated_at          │ TEXT         │ Last update timestamp               │
└─────────────────────┴──────────────┴─────────────────────────────────────┘

✅ Added: user_id field for complete session isolation
✅ Current behavior: Sessions filtered by browser-specific user ID
✅ Privacy: No cross-device synchronization, fully browser-local identification
```

**Implementation Details:**
- **User ID Management:** `app/lib/userIdManager.ts` handles UUID generation and localStorage persistence
- **Database Service:** All queries filtered by user_id in `app/lib/databaseService.ts` 
- **API Endpoints:** Updated `/api/sessions/*` routes enforce user-level access control
- **Legacy Migration:** `/api/sessions/legacy/*` endpoints handle pre-isolation sessions
- **Client Integration:** Transparent user ID passing in `app/lib/sessionStorage.ts`

**Remaining Architecture Improvements:**