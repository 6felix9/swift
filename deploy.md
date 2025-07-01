# Deployment Guide

## Docker Deployment

### Prerequisites

- Docker installed and running
- API keys for required services:
  - `GROQ_API_KEY`
  - `GEMINI_API_KEY` (Gemini)
  - `ELEVENLABS_API_KEY`
  - `BYTEPLUS_*` credentials (for digital human)

### Build and Deploy

#### 1. Build the Docker Image

```bash
# Build the image
docker build -t financial-advisor-training .

# Tag for Docker Hub (optional)
docker tag financial-advisor-training felixlmao/financial-advisor-training:v1
```

#### 2. Push to Docker Hub (Optional)

```bash
# Login to Docker Hub
docker login

# Push the image
docker push felixlmao/financial-advisor-training:v1
```

#### 3. Local Development with Docker

Create a `.env` file with your API keys:

```bash
# Copy your existing .env file or create one with:
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
# Add other required environment variables from your .env file
```

Run the container:

```bash
# Run with environment file
docker run -p 3000:3000 --env-file .env financial-advisor-training

# Or run with individual environment variables
docker run -p 3000:3000 \`
  -e GROQ_API_KEY=your_groq_key \
  -e GEMINI_API_KEY=your_gemini_key \
  -e ELEVENLABS_API_KEY=your_elevenlabs_key \
  financial-advisor-training
```

Access the application at `http://localhost:3000`

#### 4. Production Deployment

For production deployment on cloud platforms:

**Docker Compose:**
```yaml
version: '3.8'
services:
  app:
    image: felixlmao/financial-advisor-training:v1
    ports:
      - "3000:3000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      # Add other environment variables as needed
    restart: unless-stopped
```

**Cloud Platforms:**

- **AWS ECS/Fargate**: Use the Docker image with environment variables
- **Google Cloud Run**: Deploy with `gcloud run deploy`
- **Azure Container Instances**: Use `az container create`
- **DigitalOcean App Platform**: Connect your Docker Hub repository

### Environment Variables

Ensure these environment variables are set in your deployment environment:

```bash
# Required API Keys
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
ELEVENLABS_API_KEY=sk_...

# Digital Human Service (BytePlus)
BYTEPLUS_APP_ID=your_app_id
BYTEPLUS_ACCESS_KEY=your_access_key
BYTEPLUS_SECRET_KEY=your_secret_key
BYTEPLUS_REGION=your_region

# Other configuration
NODE_ENV=production
PORT=3000
```

### Health Check

The application exposes the following endpoints for health monitoring:

- `GET /` - Main application
- `GET /api/` - API health check

### Required Environment Variables

Create a `.env` file (or define these in your deployment service) with the following keys **before** you build or deploy the image. **Never commit real secret values to source control.**  Replace the placeholder values (`...`) with your actual keys.

```env
GROQ_API_KEY=...
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=...
BYTEPLUS_APP_ID=...
BYTEPLUS_ACCESS_TOKEN=...
AVATAR_ROLE=...
RTC_APP_ID=...
RTC_APP_KEY=...
RTC_ROOM_ID=...
AVATAR_RTC_USER_ID=...
AVATAR_RTC_TOKEN=...
USER_RTC_ID=...
USER_RTC_TOKEN=...
```

---

### Troubleshooting

**Build Issues:**
- Ensure Docker has enough memory allocated (recommend 4GB+)
- If build fails, try `docker system prune` to clean up

**Runtime Issues:**
- Check logs: `docker logs <container_id>`
- Verify all required environment variables are set
- Ensure API keys are valid and have proper permissions

**Performance:**
- The application requires significant resources for AI processing
- Recommend at least 2 CPU cores and 4GB RAM for production

### Development Commands

```bash
# Build and run locally
docker build -t financial-advisor-training . && docker run -p 3000:3000 --env-file .env financial-advisor-training

# View logs
docker logs <container_name>

# Execute commands in running container
docker exec -it <container_name> sh

# Clean up
docker system prune -a
```