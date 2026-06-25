# Technical Architecture & Design Decisions

This document outlines the detailed architectural components of the EyHacks Claims Processing System and the rationale behind each technical decision.

## 1. Core Voice AI Pipeline

### Twilio Media Streams

- **Decision:** We use Twilio Media Streams over standard Twilio TwiML `<Gather>` or REST APIs.
- **Rationale:** Traditional REST-based voice IVRs introduce a 1-3 second delay on every interaction because the audio has to be recorded, processed, and responded to sequentially. By opening a raw TCP WebSocket (`wss://`) using Media Streams, we receive raw base64-encoded `mulaw` audio bytes every 20 milliseconds. This enables us to achieve sub-second conversational latency, allowing the AI to naturally interrupt or be interrupted, mirroring true human conversation.

### Deepgram (Speech-to-Text)

- **Decision:** We chose Deepgram over OpenAI Whisper or Google Speech-to-Text.
- **Rationale:** Deepgram offers specialized streaming endpoints (`wss://api.deepgram.com/v1/listen`) designed specifically for telephony audio (`encoding=mulaw`, `sample_rate=8000`). It provides transcription in under 300ms. Whisper, while highly accurate, relies on chunked audio processing which inherently introduces latency unsuitable for real-time duplex conversations.

### LangGraph (Agentic State Machine)

- **Decision:** The conversational agent is built on LangGraph instead of vanilla LangChain or raw LLM APIs.
- **Rationale:** A voice agent dealing with insurance claims is not a simple Q&A bot. It must navigate complex, non-linear workflows (e.g., verifying identity, checking claim status in MongoDB, scheduling meetings). LangGraph structures the AI as a state machine (`StateGraph`). This allows us to strictly control the flow of execution, inject deterministic tools (like `query_claim_status`), and manage conversation memory robustly across thousands of sequential WebSocket frames.

---

## 2. Asynchronous Document Processing

### RabbitMQ (Message Broker)

- **Decision:** We use RabbitMQ to offload document processing from the main Node.js backend.
- **Rationale:** Processing PDF documents and passing them through LLMs takes anywhere from 10 to 60 seconds. If we processed this synchronously in our Express.js backend, it would block the event loop and crash the server under heavy load. RabbitMQ allows the frontend to instantly return a "Processing" state to the user, while ensuring that document tasks are durably queued and processed by Python workers exactly once.

### CrewAI (Multi-Agent Underwriting)

- **Decision:** We utilize CrewAI for document analysis rather than a single LLM prompt.
- **Rationale:** Insurance underwriting requires multiple specialized perspectives. We instantiated two distinct CrewAI agents: a **Fraud Analyst** (looking for inconsistencies, metadata manipulation, and logic flaws) and a **Senior Underwriter** (evaluating policy compliance and cost assessment). CrewAI allows these agents to debate and pass context back and forth asynchronously before returning a finalized, highly reliable verdict to the RabbitMQ queue.

---

## 3. Real-Time Frontend Synchronization

### Socket.IO

- **Decision:** We use Socket.IO to bridge the Python LangGraph agent, the Node.js backend, and the React frontend.
- **Rationale:** Human supervisors need to monitor the AI's conversations with clients in real time. As Deepgram transcribes the client's audio, and as LangGraph generates the AI's response, these text chunks are instantly emitted over Socket.IO. The React UI subscribes to these channels, painting the transcript onto the supervisor's dashboard live without requiring HTTP polling.

### MongoDB (NoSQL Database)

- **Decision:** We chose MongoDB over a relational database like PostgreSQL.
- **Rationale:** The structure of an insurance claim in this system is highly fluid. A claim might initially just have an ID and a summary. Later, it receives an array of unstructured text documents, a complex JSON analysis from CrewAI, and a full conversational transcript from the Voice AI. MongoDB's document-oriented architecture naturally accommodates this evolving, unstructured data schema without requiring constant migrations.

---

## 4. Local Development Infrastructure

### Cloudflared Auto-Tunnel Daemon

- **Decision:** We wrote a custom `auto_tunnel.py` daemon rather than relying on `localtunnel` or standard `ngrok`.
- **Rationale:** Twilio absolutely requires a public internet URL to send its webhook payloads to.
  1. Free tunneling services like `localtunnel` randomly drop connections.
  2. Cloudflare (`trycloudflare.com`) provides enterprise-grade stability, but generates a completely random URL every time it boots.
  
  To solve this for local development, our custom daemon spawns the Cloudflare processes, scrapes the stdout/stderr to dynamically extract the randomized URLs, immediately writes them to the backend `.env` file, and natively calls the Twilio REST API to reprogram the phone number's routing on the fly. This guarantees a completely seamless, zero-config startup sequence.
