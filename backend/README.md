# Somnia GPU - Backend API

Express.js REST API for AI model routing and contextual response generation.

## Structure

- `server.js` - Main API server with routing logic
- `package.json` - Node.js dependencies
- `Procfile` - Heroku deployment configuration

## Environment Variables

Create `.env` file:

```bash
PORT=3001
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...
```

## Installation

```bash
npm install
```

## Local Development

```bash
node server.js
```

Server runs on: http://localhost:3001

## API Endpoints

### GET /api/health
Health check endpoint

### GET /api/models
Returns list of available AI models with pricing

### POST /api/chat
Process chat messages with context awareness

Request body:
```json
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}],
  "userAddress": "0x..."
}
```

## Deployment

Deployed on Heroku: https://somnia-gpu-api-6e910df44575.herokuapp.com

```bash
heroku create somnia-gpu-api
git push heroku master
```

## Features

- Context-aware conversation memory
- Multi-model routing (8 AI models)
- Distinct personality matrices per model
- Follow-up detection and clarification handling
- Token usage calculation
- CORS enabled for frontend access
- Stateless design for horizontal scaling
