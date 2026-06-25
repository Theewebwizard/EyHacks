# EyHacks AI Claims Processing System

A comprehensive, AI-driven insurance claims processing architecture featuring real-time conversational voice agents, automated document verification via multi-agent AI crews, and dynamic frontend real-time tracking.

## 🚀 Architecture Overview

This project consists of several microservices orchestrated via Docker Compose:

1. **Frontend (React/Vite)**
   - Agent dashboard for tracking claims, listening to live AI conversation transcripts, and viewing AI document analysis.
2. **Backend Server (Node.js/Express)**
   - REST API handling authentication (JWT), MongoDB schemas for Claims, and file uploads.
   - Pushes document processing tasks to RabbitMQ.
3. **Voice AI Engine (Python/LangGraph)**
   - Uses **Twilio Media Streams** to stream raw phone call audio via WebSockets.
   - Uses **Deepgram** for ultra-low latency real-time transcription (STT).
   - Powered by a **LangGraph** AI agent equipped with external tools (MongoDB querying, meeting scheduling, etc.).
   - Emits real-time transcripts and AI states back to the Node backend via Socket.IO.
4. **Document Verification Worker (Python/CrewAI)**
   - A dedicated Python worker consuming the `document_processing` RabbitMQ queue.
   - Utilizes a **CrewAI** multi-agent setup (Fraud Analyst & Underwriter) to thoroughly analyze uploaded claim documents, verify authenticity, and push detailed analytical reports back into MongoDB.
5. **Auto-Tunnel Daemon (Python)**
   - Automatically provisions temporary `cloudflared` edge tunnels for local development.
   - Dynamically updates Twilio Phone Number webhooks on the fly.

## 🛠 Features

- **Real-time Conversational Voice AI**: Call the Twilio number and converse with an AI agent capable of scheduling tasks and querying claim databases in real-time.
- **Live Dashboard Syncing**: As the voice AI talks to the client on the phone, the conversation transcript is dynamically streamed to the React dashboard in real-time using Socket.IO.
- **Automated Document Underwriting**: Any document uploaded to a claim is securely processed by autonomous CrewAI agents in the background, and their full analysis is seamlessly integrated into the Voice AI's knowledge base.
- **Intelligent Network Routing**: The `auto_tunnel.py` daemon ensures that Twilio can seamlessly hit your local services without you ever needing to configure manual NAT/Firewall port forwarding.

## ⚙️ Project Setup

### 1. Prerequisites

- Docker & Docker Compose
- Node.js (v18+)
- Python 3.12+
- Twilio Account (Phone Number, Account SID, Auth Token)
- Deepgram API Key
- LLM API Keys (Groq, OpenAI, etc.)

### 2. Environment Variables

Create a `.env` file in the root directory (where `docker-compose.yml` is).

```env
# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+0987654321

# Deepgram
DEEPGRAM_API_KEY=your_key

# LLMs
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Database / Auth
JWT_SECRET=super_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

### 3. Start the Backend Infrastructure

The system uses Docker Compose to orchestrate MongoDB, RabbitMQ, Redis, Node, and the Python services.

```bash
docker compose up -d
```

### 4. Enable External Voice Traffic (Twilio Webhooks)

Because Twilio needs to hit your machine from the public internet to deliver phone calls, run the auto-tunneling script. This script will automatically spin up Cloudflare edge tunnels and configure your Twilio account for you:

```bash
# Optional: Setup virtual environment
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/python/requirements.txt

# Run the tunnel daemon
python3 auto_tunnel.py
```

> **Note**: Leave this script running in a separate terminal window.

### 5. Run the Frontend

To boot the React Dashboard for the human agents:

```bash
npm install
npm run dev
```

Navigate to `http://localhost:5173` to access the dashboard.

## 🚀 Triggering a Test Call

Ensure all services are running and the `auto_tunnel.py` script has successfully updated your webhooks. Then simply run:

```bash
python3 trigger_call.py
```

Your phone will ring in a few seconds. Answer it, and you'll be speaking directly to the AI agent!
