from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import requests
import numpy as np
from transformers import pipeline
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
from typing import Annotated, Sequence, TypedDict
import operator
from dotenv import load_dotenv
from pymongo import MongoClient
from logger_config import get_logger
import asyncio
import threading
import websockets
import base64
import json
from twilio.twiml.voice_response import VoiceResponse, Connect

logger = get_logger(__name__)

load_dotenv()
api_key = os.getenv("API_KEY")
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "eyhacks_internal_dev_secret")

def _internal_headers():
    """Return the authentication headers required for /internal_emit calls."""
    return {"X-Internal-Secret": INTERNAL_API_SECRET}

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost",
        "http://127.0.0.1",
        "*"
    ]

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": allowed_origins}})
socketio = SocketIO(app, cors_allowed_origins=allowed_origins)

# --- Shared Pinecone Vector Store & RAG chain ---
vector_store = None
rag_chain = None
chatbot_ready = False

def initialize_chatbot_services():
    global vector_store, rag_chain, chatbot_ready
    try:
        logger.info("🔧 Starting chatbot initialization (ingest + vector store + RAG chain)...")
        from ingest import main as run_ingestion
        run_ingestion()
        from chat import setup_vector_store, initialize_llm
        vector_store = setup_vector_store()
        rag_chain = initialize_llm()
        chatbot_ready = True
        logger.info("✅ Chatbot services initialized successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize chatbot services: {e}", exc_info=True)

threading.Thread(target=initialize_chatbot_services, daemon=True).start()

# --- LLM & Sentiment Model ---
chat = ChatGroq(temperature=0, model="llama-3.1-8b-instant", groq_api_key=api_key)  # type: ignore
sentiment_analyzer = None

def load_sentiment_model():
    global sentiment_analyzer
    logger.info("Starting background download of sentiment model...")
    sentiment_analyzer = pipeline(
        "text-classification",
        model="bhadresh-savani/distilbert-base-uncased-emotion",
        top_k=None
    )
    logger.info("Sentiment model loaded successfully!")

threading.Thread(target=load_sentiment_model, daemon=True).start()

# --- MongoDB ---
mongo_client = MongoClient(mongo_uri)
db = mongo_client["test"]
claims_collection = db["claims"]

# --- LangGraph Tools ---

@tool
def query_claim_status(claim_id: str) -> str:
    """Query MongoDB for the real-time status of a claim."""
    claim = claims_collection.find_one({"claimID": claim_id})
    if claim:
        result = f"Claim {claim_id} found. Type: {claim.get('claimType')}, Priority: {claim.get('priority')}."
        doc_analysis = claim.get("documentAnalysis")
        if doc_analysis:
            result += f"\n\nDocument Analysis Details:\n{doc_analysis}"
        return result
    return f"Claim {claim_id} not found in database."

@tool
def search_policy_vectors(query: str) -> str:
    """Search the Pinecone vector database for policy guidelines and claims procedures."""
    global vector_store
    if vector_store is None:
        return "Knowledge base is still initializing. Please try again in a few moments."
    try:
        results = vector_store.similarity_search_with_relevance_scores(
            query, k=3, score_threshold=0.2
        )
        if not results:
            return "No relevant policy information found for this query."
        return "\n\n".join([doc.page_content for doc, _ in results])
    except Exception as e:
        return f"Error searching policy database: {e}"

@tool
def schedule_task(title: str, description: str, due_date: str, client_email: str = "") -> str:
    """Schedule a meeting, appointment, or task. due_date must be ISO 8601."""
    import requests as req
    try:
        payload = {"title": title, "description": description, "dueDate": due_date, "clientEmail": client_email}
        res = req.post("http://backend-node:5001/api/tasks", json=payload)
        if res.status_code in [200, 201]:
            try:
                requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_ai_task', 'data': res.json()}, headers=_internal_headers())
            except Exception:
                pass
            return f"Task '{title}' scheduled successfully for {due_date}."
        return f"Failed to schedule task: {res.text}"
    except Exception as e:
        return f"Error scheduling task: {e}"

tools = [query_claim_status, search_policy_vectors, schedule_task]
tool_node = ToolNode(tools)

# --- Safe LLM Invocation ---
def safe_chat_invoke(messages, retries=5, delay=3):
    import time
    response = None
    for i in range(retries):
        try:
            response = chat.invoke(messages)
            break
        except Exception as e:
            err_str = str(e).lower()
            if any(x in err_str for x in ["rate_limit", "rate limit", "429", "tpm"]):
                logger.warning(f"Groq rate limit hit. Waiting {delay}s (attempt {i+1}/{retries})...")
                time.sleep(delay)
                delay *= 2
            else:
                raise e
    if response is None:
        response = chat.invoke(messages)
    if hasattr(response, "content"):
        if isinstance(response.content, list):
            parts = []
            for block in response.content:
                if isinstance(block, dict) and "text" in block:
                    parts.append(block["text"])
                elif isinstance(block, str):
                    parts.append(block)
                else:
                    parts.append(str(block))
            response.content = "".join(parts)
        elif not isinstance(response.content, str):
            response.content = str(response.content)
    return response

# --- LangGraph Agent ---

class AgentState(TypedDict):
    messages: Annotated[Sequence[HumanMessage | AIMessage | SystemMessage | ToolMessage], operator.add]
    suggestion: str
    validated: bool

def generate_suggestion(state: AgentState):
    messages = state["messages"]
    recent_messages = list(messages)[-6:]
    sys_msg = SystemMessage(content=(
        "You are an AI co-pilot assisting a BPO call center agent. "
        "You are reading the live transcript of what the Agent is saying on the phone. "
        "Draft a clear, professional suggestion for what the Agent should ask, say, or do next to help the customer. "
        "You have tools available to check claim status, search policies, and schedule meetings. "
        "If the customer wants to schedule a meeting, you MUST use the schedule_task tool. "
        "Once you use a tool, wait for the result before giving your final suggestion."
    ))
    llm_with_tools = chat.bind_tools(tools)
    response = None
    for _ in range(5):
        try:
            response = llm_with_tools.invoke([sys_msg] + recent_messages)
            break
        except Exception:
            import time
            time.sleep(3)
    if not response:
        return {"suggestion": "Error communicating with AI.", "messages": []}
    return {"messages": [response], "suggestion": str(response.content) if not response.tool_calls else ""}

def reflect(state: AgentState):
    suggestion = state.get("suggestion", "")
    if not suggestion:
        return {"validated": True, "suggestion": ""}
    reflection_prompt = HumanMessage(content=(
        f"Review this suggestion for strict policy compliance and clarity:\n\n{suggestion}\n\n"
        "If it needs improvement, rewrite it. Output ONLY the final, polished suggestion text "
        "that the agent should read. Do NOT output any introductory text, lists, explanations, "
        "or the words 'YES' or 'NO'."
    ))
    response = safe_chat_invoke([reflection_prompt])
    return {"validated": True, "suggestion": str(response.content) if hasattr(response, "content") else str(response)}

def router_after_generate(state: AgentState):
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "reflect"

workflow = StateGraph(AgentState)  # type: ignore
workflow.add_node("generate", generate_suggestion)
workflow.add_node("tools", tool_node)
workflow.add_node("reflect", reflect)
workflow.add_conditional_edges("generate", router_after_generate, {"tools": "tools", "reflect": "reflect"})
workflow.add_edge("tools", "generate")
workflow.add_edge("reflect", END)
workflow.set_entry_point("generate")
compiled_graph = workflow.compile()

# Per-session conversation history, keyed by Twilio streamSid.
# The process-global list has been removed to prevent cross-call state bleed.
active_sessions: dict = {}

# --- Sentiment & Extraction Helpers ---

def analyze_sentiment_and_emit(conversation_text):
    try:
        if sentiment_analyzer is None:
            return
        results = sentiment_analyzer(conversation_text)[0]
        critical_emotions = ["anger", "fear", "sadness"]
        highest_critical = None
        highest_score = 0.0
        for emotion_data in results:
            if emotion_data["label"] in critical_emotions and emotion_data["score"] > highest_score:
                highest_score = emotion_data["score"]
                highest_critical = emotion_data["label"]
        if highest_critical and highest_score >= 0.5:
            # Map the local model label to our UI payload format
            emotion_label = highest_critical.upper()
            message = ""
            if highest_critical == "anger":
                message = "Customer is expressing anger. Please de-escalate."
            elif highest_critical == "fear":
                message = "Customer is expressing fear or distress. Please reassure them."
            elif highest_critical == "sadness":
                message = "Customer is expressing sadness. Show empathy."
                
            data = {
                "emotion": emotion_label,
                "message": message,
                "score": highest_score
            }
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'sentiment_alert', 'data': data}, headers=_internal_headers())
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")

def extract_financial_details(conversation_text):
    import re
    import requests as req
    try:
        prompt = (
            f"Extract the following details from this conversation:\n"
            "1. claim_amount (estimated value of medical bills mentioned, e.g. \"5000\")\n"
            "2. incident_date (date the event occurred, e.g. \"2026-06-24\")\n"
            "3. client_summary (a 1-sentence summary of client's situation)\n"
            "4. tasks (an array of scheduled tasks. Each task should have \"title\" and \"dueDate\" "
            "(format: YYYY-MM-DD HH:MM). If no tasks, return empty array [])\n\n"
            f"Conversation:\n{conversation_text}\n\nReturn ONLY valid JSON, no other text."
        )
        response = safe_chat_invoke([HumanMessage(content=prompt)])
        content = str(response.content)
        match = re.search(r"\{.*?\}", content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Extraction error: {e}")
    return {"claim_amount": "N/A", "incident_date": "N/A", "client_summary": "", "tasks": []}

def process_conversation(conversation_text, session_history: list = None):
    """Process a transcript line within the context of a specific call session."""
    if session_history is None:
        session_history = []
    session_history.append(HumanMessage(content=conversation_text))

    analyze_sentiment_and_emit(conversation_text)
    extracted = extract_financial_details(conversation_text)
    if extracted.get('client_summary') or extracted.get('claim_amount') != 'N/A':
        requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'client_summary', 'data': extracted}, headers=_internal_headers())

    if extracted.get('tasks') and len(extracted['tasks']) > 0:
        for task in extracted['tasks']:
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_ai_task', 'data': task}, headers=_internal_headers())

    try:
        # Run LangGraph with the per-session history
        initial_state: AgentState = {"messages": session_history, "suggestion": "", "validated": False}
        final_state = compiled_graph.invoke(initial_state)

        # Update the session history with any new messages generated during graph execution
        new_messages = final_state["messages"][len(session_history):]
        if new_messages:
            session_history.extend(new_messages)

        formatted_response = final_state["suggestion"]
        if formatted_response:
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_suggestion', 'data': {'response': formatted_response}}, headers=_internal_headers())

        return formatted_response
    except Exception as e:
        logger.error(f"Error in process_conversation: {e}")
        fallback_suggestion = f"⚠️ BPO Suggestion Draft: [Suggestion currently unavailable due to rate limit/error: {str(e)}]"
        requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_suggestion', 'data': {'response': fallback_suggestion}}, headers=_internal_headers())
        return fallback_suggestion

# --- Deepgram Audio Streaming ---
audio_queue = None
loop = None

async def start_twilio_server():
    async with websockets.serve(twilio_ws_handler, "0.0.0.0", 5002):
        await asyncio.Future()

def start_asyncio_loop():
    global loop, audio_queue
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    audio_queue = asyncio.Queue()
    loop.run_until_complete(start_twilio_server())

threading.Thread(target=start_asyncio_loop, daemon=True).start()

async def twilio_ws_handler(websocket):
    logger.info("TWILIO WEBSOCKET CONNECTION INITIATED!")
    logger.info("=========================================")

    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        logger.error("Missing DEEPGRAM_API_KEY")
        return

    dg_url = "wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&model=nova-2&smart_format=true"

    # Each call session gets its own isolated conversation history.
    # stream_sid is captured from the Twilio "start" event frame.
    stream_sid: str | None = None

    try:
        async with websockets.connect(dg_url, additional_headers={"Authorization": f"Token {deepgram_api_key}"}) as dg_socket:
            logger.info("Successfully connected to Deepgram!")

            async def receive_from_deepgram():
                try:
                    async for msg in dg_socket:
                        res = json.loads(msg)
                        if res.get("is_final"):
                            alt = res.get("channel", {}).get("alternatives", [{}])[0]
                            transcript = alt.get("transcript", "").strip()
                            if transcript:
                                log_entry = f"Customer: {transcript}"
                                logger.info(f"Twilio Transcript: {log_entry}")
                                requests.post(
                                    'http://127.0.0.1:5000/internal_emit',
                                    json={'event': 'live_transcription', 'data': {'text': log_entry}},
                                    headers=_internal_headers()
                                )
                                # Pass the session-specific history into the conversation processor.
                                sid = stream_sid
                                if sid and sid in active_sessions:
                                    session_hist = active_sessions[sid]
                                else:
                                    # Fallback: create an anonymous session if start event was missed.
                                    session_hist = []
                                threading.Thread(
                                    target=process_conversation,
                                    args=(log_entry, session_hist)
                                ).start()
                except Exception as e:
                    logger.error(f"Deepgram receive error: {e}", exc_info=True)

            asyncio.create_task(receive_from_deepgram())
            try:
                async for message in websocket:
                    data = json.loads(message)
                    if data["event"] == "connected":
                        logger.info(f"Twilio stream connected: {data}")
                    elif data["event"] == "start":
                        # Capture streamSid and initialise an isolated session history.
                        stream_sid = data.get("start", {}).get("streamSid") or data.get("streamSid")
                        if stream_sid:
                            active_sessions[stream_sid] = []
                            logger.info(f"Twilio stream started — session initialised for streamSid: {stream_sid}")
                        else:
                            logger.warning(f"Twilio start event missing streamSid: {data}")
                    elif data["event"] == "media":
                        chunk = base64.b64decode(data["media"]["payload"])
                        await dg_socket.send(chunk)
                    elif data["event"] == "stop":
                        logger.info("Twilio stream stopped.")
                        break
            except Exception as e:
                logger.error(f"Twilio WS Error: {e}", exc_info=True)
    except Exception as outer_e:
        logger.error(f"Failed to connect to Deepgram or outer error: {outer_e}", exc_info=True)
    finally:
        # Clean up the per-session state to prevent unbounded memory growth.
        if stream_sid and stream_sid in active_sessions:
            del active_sessions[stream_sid]
            logger.info(f"Session {stream_sid} cleaned up from active_sessions.")

async def deepgram_connection_task():
    global audio_queue
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key or audio_queue is None:
        logger.error("Missing DEEPGRAM_API_KEY or audio_queue not initialized.")
        return
    dg_url = "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false&diarize=true"
    async with websockets.connect(dg_url, additional_headers={"Authorization": f"Token {deepgram_api_key}"}) as connection:
        async def receive_from_deepgram():
            try:
                async for msg in connection:
                    res = json.loads(msg)
                    if res.get("is_final"):
                        alt = res.get("channel", {}).get("alternatives", [{}])[0]
                        transcript = alt.get("transcript", "").strip()
                        if transcript:
                            speaker = alt.get("words", [{}])[0].get("speaker", 0) if alt.get("words") else 0
                            speaker_name = "Agent" if speaker == 0 else "Customer"
                            log_entry = f"{speaker_name}: {transcript}"
                            logger.info(f"Deepgram Transcript: {log_entry}")
                            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': log_entry}}, headers=_internal_headers())
                            threading.Thread(target=process_conversation, args=(log_entry, [])).start()
            except Exception as e:
                logger.error(f"Deepgram receive error: {e}")
        asyncio.create_task(receive_from_deepgram())
        try:
            while True:
                chunk = await audio_queue.get()
                if chunk is None:
                    break
                await connection.send(chunk)
        except Exception as e:
            logger.error(f"Deepgram sending error: {e}")

@socketio.on("start_recording")
def handle_start_recording():
    global loop, audio_queue
    logger.info("Starting new Deepgram streaming session...")
    if loop is not None and audio_queue is not None:
        while not audio_queue.empty():
            try:
                audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        asyncio.run_coroutine_threadsafe(deepgram_connection_task(), loop)

@socketio.on("audio_chunk")
def handle_audio_chunk(data):
    global loop, audio_queue
    if loop is not None and audio_queue is not None:
        asyncio.run_coroutine_threadsafe(audio_queue.put(data), loop)

@socketio.on("stop_recording")
def handle_stop_recording():
    global loop, audio_queue
    logger.info("Stopping Deepgram streaming session...")
    if loop is not None and audio_queue is not None:
        asyncio.run_coroutine_threadsafe(audio_queue.put(None), loop)

# --- Flask HTTP Endpoints ---

@app.route("/twilio/voice", methods=["POST"])
def twilio_voice():
    response = VoiceResponse()
    response.say("Welcome to SAKSHAM Support. Please hold while we connect you to an agent.")
    host = request.host.split(":")[0]
    wss_url = os.getenv("TWILIO_WSS_URL", f"wss://{host}:5002")
    connect = Connect()
    connect.stream(url=wss_url)
    response.append(connect)
    return str(response), 200, {"Content-Type": "text/xml"}

@app.route("/process_conversation", methods=["POST"])
def receive_transcription():
    data = request.json
    if not data or "conversation_text" not in data:
        return jsonify({"error": "Invalid request"}), 400
    response = process_conversation(data["conversation_text"])
    return jsonify({"response": response})

@app.route("/emit_transcription", methods=["POST"])
def emit_transcription():
    data = request.json
    if data and "text" in data:
        socketio.emit("live_transcription", {"text": data["text"]})
    return jsonify({"status": "success"}), 200

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "chatbot_ready": chatbot_ready,
        "sentiment_model_ready": sentiment_analyzer is not None
    }), 200

@app.route("/api/health", methods=["GET"])
def api_health_check():
    return jsonify({
        "status": "ready" if chatbot_ready else "initializing",
        "services": {
            "vector_store": vector_store is not None,
            "rag_chain": rag_chain is not None,
            "sentiment_model": sentiment_analyzer is not None
        }
    }), 200 if chatbot_ready else 503

@app.route("/api/query", methods=["POST"])
def handle_query():
    """
    Unified RAG chatbot endpoint. Searches Pinecone and returns a Groq LLM response.
    Serves both Agent Assistant and Client Portal chat widgets.
    """
    if not chatbot_ready:
        return jsonify({
            "response": "The assistant is still warming up. Please try again in a moment.",
            "initializing": True
        }), 200
    try:
        data = request.get_json()
        user_input = data.get("question", "").strip()
        style = data.get("style", "balanced").lower()
        if not user_input:
            return jsonify({"error": "Empty query"}), 400
        if style == "aggressive":
            style_directives = "Provide exhaustive recommendations and highly detailed step-by-step guidance. Be extremely proactive."
        elif style == "conservative":
            style_directives = "Only provide high confidence answers. Be extremely brief and literal. Do not add any extra guidance."
        else:
            style_directives = "Provide a balanced, helpful, and reasonably detailed response."
        results = vector_store.similarity_search_with_relevance_scores(
            user_input, k=3, score_threshold=0.3
        )
        if not results:
            return jsonify({"response": "This claim pattern isn't recognized in our current records."})
        context = "\n".join([doc.page_content for doc, _ in results])
        response = rag_chain.invoke({"context": context, "question": user_input, "style_directives": style_directives})
        return jsonify({"response": response})
    except Exception as e:
        logger.error(f"Error in /api/query: {e}", exc_info=True)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route("/test_emit", methods=["GET"])
def test_emit():
    socketio.emit("live_transcription", {"text": "TEST TRANSCRIPT FROM HTTP"})
    socketio.emit("new_suggestion", {"response": "TEST SUGGESTION FROM HTTP"})
    return jsonify({"status": "emitted"}), 200

@app.route("/internal_emit", methods=["POST"])
def internal_emit():
    # Validate the shared secret to prevent unauthenticated callers from
    # injecting arbitrary SocketIO events into the frontend.
    provided_secret = request.headers.get("X-Internal-Secret", "")
    if provided_secret != INTERNAL_API_SECRET:
        logger.warning("Rejected /internal_emit call with invalid or missing X-Internal-Secret.")
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    socketio.emit(data["event"], data["data"])
    return jsonify({"status": "emitted"}), 200

@app.route("/refresh_history", methods=["POST"])
def refresh_history():
    # Clears all in-progress session histories. Useful for debug/reset.
    active_sessions.clear()
    return jsonify({"status": "success", "message": "All active session histories cleared"}), 200


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
