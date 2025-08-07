# Swift AI Training Platform

AI-powered training platform for professionals across multiple domains to practice client interactions through real-time voice conversations with digital avatars. Supports training for financial services, healthcare, and customer service professionals.

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Package Manager**: Bun
- **AI Services**: Google Gemini Flash, Groq SDK, ElevenLabs TTS, OpenAI Whisper STT
- **Digital Avatars**: BytePlus/ByteDance Digital Human WebSocket service
- **Audio Processing**: ONNX Runtime Web for Voice Activity Detection (uses https://github.com/ricky0123/vad)
- **Styling**: Tailwind CSS

## Development Commands

```bash
bun run dev    # Start development server on localhost:3000
bun run build  # Build production bundle
bun run start  # Start production server
```

## Environment Variables

Create a `.env` file with the following required variables:

```env
# AI Service API Keys
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# BytePlus Digital Human Service
BYTEPLUS_APP_ID=your_byteplus_app_id
BYTEPLUS_ACCESS_TOKEN=your_byteplus_access_token
AVATAR_ROLE=your_default_avatar_role_id

# WebRTC Configuration
RTC_APP_ID=your_rtc_app_id
RTC_APP_KEY=your_rtc_app_key
RTC_ROOM_ID=your_rtc_room_id
AVATAR_RTC_USER_ID=your_avatar_rtc_user_id
AVATAR_RTC_TOKEN=your_avatar_rtc_token (optional)
USER_RTC_ID=your_user_rtc_id
USER_RTC_TOKEN=your_user_rtc_token (optional)
```

## Docker Deployment

The application requires a persistent server due to WebSocket connections for digital avatars. **Cannot be deployed on Vercel** or other serverless platforms.

### Build and Run

```bash
# Build for AMD64 architecture (compatible with most cloud platforms)
docker buildx build --platform linux/amd64 -t swift-ai .

# For local development (auto-detects your platform)
docker build -t swift-ai .

# Run with environment file
docker run -p 3000:3000 --env-file .env swift-ai

# Or run with individual environment variables
docker run -p 3000:3000 \
  -e GROQ_API_KEY=your_key \
  -e GEMINI_API_KEY=your_key \
  -e ELEVENLABS_API_KEY=your_key \
  -e BYTEPLUS_APP_ID=your_id \
  -e BYTEPLUS_ACCESS_TOKEN=your_token \
  swift-ai
```

### Push to Docker Registry

```bash
# Tag for Docker Hub
docker tag swift-ai your-dockerhub-username/swift-ai:latest
docker tag swift-ai your-dockerhub-username/swift-ai:v1.0.0

# Login and push to Docker Hub
docker login
docker push your-dockerhub-username/swift-ai:latest
docker push your-dockerhub-username/swift-ai:v1.0.0

# For other registries (AWS ECR, Google Container Registry, etc.)
docker tag swift-ai registry-url/swift-ai:latest
docker push registry-url/swift-ai:latest
```

### Production Deployment

Deploy on platforms that support persistent containers:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances  
- DigitalOcean App Platform
- Any VPS with Docker

## Training Domains

The platform supports training scenarios across multiple professional domains:

- **Financial Services**: Referral seeking, insurance claim handling, portfolio reviews
- **Healthcare**: Patient consultations, medication discussions, care coordination  
- **Customer Service**: Complaint handling, product support, escalation management

## Adding New Training Scenarios

To add new training scenarios within existing domains:

1. **Add scenario definition** in `app/lib/scenarios.ts`:
```typescript
{
  id: 'YOUR_SCENARIO_ID',
  name: 'Your Scenario Name',
  description: 'Brief description',
  domain: 'financial-advisor', // or 'healthcare', 'customer-service'
  userRole: 'Financial Advisor',
  personaRole: 'Client',
  scenarioContext: 'Context for the scenario...',
  personas: ['PERSONA_ID'], // From personas.ts
  personaOpeningLine: 'Opening line for avatar...',
  evaluationPromptKey: 'yourScenarioEvaluation',
  difficultyProfileTemplateKey: 'YOUR_SCENARIO_ID',
  suggestionPromptKey: 'YOUR_SCENARIO_ID'
}
```

2. **Create prompt templates** in `app/lib/prompt/`:
   - Add evaluation prompt to `index.ts`
   - Add suggestion prompt to `suggestions/index.ts`
   - Add difficulty template to `difficulty-profiles/index.ts` (optional)

## Adding New Training Domains

To add entirely new professional domains:

1. **Update domain type** in `app/lib/types.ts`:
```typescript
export type TrainingDomain = 'financial-advisor' | 'healthcare' | 'customer-service' | 'your-new-domain';
```

2. **Create scenarios** for the new domain in `scenarios.ts` with `domain: 'your-new-domain'`

3. **Add domain-specific prompts** following the pattern in `app/lib/prompt/` folders

4. **Test** by selecting the new domain in the scenario selection UI

## Changing Persona Avatars

To customize digital avatar appearances **and voices** for different personas:

1. Edit `app/lib/personas.ts`
2. Update the `avatarRole` (BytePlus character) **and optionally the `elevenLabsVoiceId` (ElevenLabs voice)** for each persona:

```typescript
{
  id: 'CHLOE_ZHANG',
  name: 'Chloe Zhang',
  // ... other fields
  elevenLabsVoiceId: 'your_elevenlabs_voice_id',
  avatarRole: 'your_byteplus_avatar_role_id'
}
```

The `avatarRole` corresponds to the character ID in your BytePlus Digital Human dashboard, while `elevenLabsVoiceId` should match the desired voice identifier in ElevenLabs.

## Digital Human WebSocket Requirements

- **Persistent Connection**: WebSocket must remain open throughout training sessions
- **Session Management**: Each conversation uses a unique session ID
- **Audio Streaming**: Real-time PCM audio at 16kHz in 1.28KB chunks
- **Interrupt Handling**: Supports natural conversation flow with voice activity detection

Access the application at `http://localhost:3000` after deployment.