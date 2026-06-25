from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import pipeline
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.tools import tool
from typing import Annotated, Sequence, cast, List, Dict, Any, TypedDict
import operator
from dotenv import load_dotenv
import subprocess
from pymongo import MongoClient
from logger_config import get_logger
import asyncio
import threading
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
import websockets
import base64
import json
# pyrefly: ignore [missing-import]
from twilio.twiml.voice_response import VoiceResponse, Connect

logger = get_logger(__name__)

load_dotenv()
api_key = os.getenv("API_KEY")
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Initialize Models and DB ---
model = None
chat = ChatGroq(temperature=0, model="llama-3.1-8b-instant", groq_api_key=api_key)  # type: ignore
classifier = None
sentiment_analyzer = None

import threading
def load_models():
    global model, classifier, sentiment_analyzer
    logger.info("Starting background download of HuggingFace models...")
    model = SentenceTransformer('all-mpnet-base-v2')
    classifier = pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli")
    sentiment_analyzer = pipeline("text-classification", model="bhadresh-savani/distilbert-base-uncased-emotion", top_k=None)
    logger.info("All HuggingFace models loaded successfully!")

threading.Thread(target=load_models, daemon=True).start()

mongo_client = MongoClient(mongo_uri)
db = mongo_client["test"] # Assuming default test DB or parse from URI
claims_collection = db["claims"]

# --- FAISS Loading (Simplified for brevity, assuming indexes exist) ---
index_dir = os.path.join("data", "Faiss_indexes")
indexes = {}
category_text = {}
category_list = []

# Load indexes
if os.path.exists(index_dir):
    for index_file in os.listdir(index_dir):
        if index_file.endswith(".index"):
            category = index_file.replace("_index.index", "").replace("_", " ")
            idx = faiss.read_index(os.path.join(index_dir, index_file))
            metadata_file = os.path.join(index_dir, f"{category.lower().replace(' ', '_')}_metadata.txt")
            if os.path.exists(metadata_file):
                with open(metadata_file, "r", encoding="utf-8") as file:
                    text = [line.strip() for line in file.readlines()]
                indexes[category] = idx
                category_text[category] = text
                category_list.append(category)

# --- LangGraph Setup ---

class AgentState(TypedDict):
    messages: Annotated[Sequence[HumanMessage | AIMessage | SystemMessage | ToolMessage], operator.add]
    suggestion: str
    validated: bool

@tool
def query_claim_status(claim_id: str) -> str:
    """Query MongoDB for the real-time status of a claim."""
    claim = claims_collection.find_one({"claimID": claim_id})
    if claim:
        result = f"Claim {claim_id} found. Type: {claim.get('claimType')}, Priority: {claim.get('priority')}."
        doc_analysis = claim.get('documentAnalysis')
        if doc_analysis:
            result += f"\n\nDocument Analysis Details:\n{doc_analysis}"
        return result
    return f"Claim {claim_id} not found in database."

@tool
def search_policy_vectors(query: str) -> str:
    """Search the local FAISS vector database for policy guidelines based on a query."""
    if not category_list:
        return "No policy vectors available."
    if classifier is None or model is None:
        return "Models are still initializing in the background. Please try again in a few moments."
    category = classifier(query, candidate_labels=category_list)["labels"][0]
    idx = indexes[category]
    query_embeddings = model.encode([query])
    distance, indices = idx.search(np.array(query_embeddings), k=3)
    results = [category_text[category][i] for i in indices[0]]
    return "\n".join(results)

@tool
def schedule_task(title: str, description: str, due_date: str, client_email: str = "") -> str:
    """Schedule a meeting, appointment, or task for the user/agent. 
    due_date should be a valid ISO 8601 date string.
    """
    import requests
    try:
        payload = {
            "title": title,
            "description": description,
            "dueDate": due_date,
            "clientEmail": client_email
        }
        res = requests.post("http://backend-node:5001/api/tasks", json=payload)
        if res.status_code in [200, 201]:
            # Emit to frontend in real-time
            try:
                requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_ai_task', 'data': res.json()})
            except Exception:
                pass
            return f"Task '{title}' scheduled successfully for {due_date}."
        else:
            return f"Failed to schedule task: {res.text}"
    except Exception as e:
        return f"Error scheduling task: {e}"

tools = [query_claim_status, search_policy_vectors, schedule_task]
tool_node = ToolNode(tools)

# --- Safe LLM Invocation with Retry on Rate Limits ---
def safe_chat_invoke(messages, retries=5, delay=3):
    import time
    response = None
    for i in range(retries):
        try:
            response = chat.invoke(messages)
            break
        except Exception as e:
            err_str = str(e).lower()
            if "rate_limit" in err_str or "rate limit" in err_str or "429" in err_str or "tpm" in err_str:
                logger.warning(f"Groq rate limit hit. Waiting {delay}s before retry (attempt {i+1}/{retries})...")
                time.sleep(delay)
                delay *= 2
            else:
                raise e
    if response is None:
        response = chat.invoke(messages)

    # Normalize response.content to always be a string
    if hasattr(response, 'content'):
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

def generate_suggestion(state: AgentState):
    """Draft a suggestion based on the conversation and tools."""
    messages = state["messages"]
    # Keep only the last 6 messages to stay within the 6,000 Tokens Per Minute (TPM) rate limit
    recent_messages = list(messages)[-6:]
    sys_msg = SystemMessage(content="You are an AI co-pilot assisting a BPO call center agent. You are reading the live transcript of what the Agent is saying on the phone. Draft a clear, professional suggestion for what the Agent should ask, say, or do next to help the customer. You have tools available to check claim status, search policies, and schedule meetings. If the customer wants to schedule a meeting, you MUST use the schedule_task tool. Once you use a tool, wait for the result before giving your final suggestion.")
    
    # Bind tools to the LLM so it knows it can call them
    llm_with_tools = chat.bind_tools(tools)
    
    response = None
    for _ in range(5):
        try:
            response = llm_with_tools.invoke([sys_msg] + recent_messages)
            break
        except Exception as e:
            import time
            time.sleep(3)
    
    if not response:
        return {"suggestion": "Error communicating with AI.", "messages": []}
    
    return {"messages": [response], "suggestion": str(response.content) if not response.tool_calls else ""}

def reflect(state: AgentState):
    """Reflect on the suggestion to ensure policy compliance."""
    suggestion = state.get("suggestion", "")
    if not suggestion:
        return {"validated": True, "suggestion": ""}
    
    reflection_prompt = HumanMessage(content=f"Review this suggestion for strict policy compliance and clarity:\n\n{suggestion}\n\nIf it needs improvement, rewrite it. Output ONLY the final, polished suggestion text that the agent should read. Do NOT output any introductory text, lists, explanations, or the words 'YES' or 'NO'.")
    response = safe_chat_invoke([reflection_prompt])
    
    response_content = str(response.content) if hasattr(response, 'content') else str(response)
    return {"validated": True, "suggestion": response_content}

def router_after_generate(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "reflect"

# --- LangGraph Definition ---
workflow = StateGraph(AgentState)  # type: ignore
workflow.add_node("generate", generate_suggestion)
workflow.add_node("tools", tool_node)
workflow.add_node("reflect", reflect)

workflow.add_conditional_edges(
    "generate",
    router_after_generate,
    {
        "tools": "tools",
        "reflect": "reflect"
    }
)
workflow.add_edge("tools", "generate")
workflow.add_edge("reflect", END)

workflow.set_entry_point("generate")

compiled_graph = workflow.compile()

conversation_history = []


def analyze_sentiment_and_emit(conversation_text):
    """Analyze sentiment using local ML model and emit an alert to the client if the sentiment is critical."""
    try:
        if sentiment_analyzer is None:
            return # Model not loaded yet
            
        results = sentiment_analyzer(conversation_text)[0]
        
        # We look for negative emotions: anger, fear, sadness
        critical_emotions = ["anger", "fear", "sadness"]
        highest_critical = None
        highest_score = 0.0
        
        for emotion_data in results:
            if emotion_data['label'] in critical_emotions and emotion_data['score'] > highest_score:
                highest_score = emotion_data['score']
                highest_critical = emotion_data['label']
                
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
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'sentiment_alert', 'data': data})
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")

def extract_financial_details(conversation_text):
    """Extract financial details and return JSON structured info."""
    try:
        prompt = f"""Extract the following details from this conversation:
1. claim_amount (estimated value of medical bills mentioned, e.g. "5000")
2. incident_date (date the event occurred, e.g. "2026-06-24")
3. client_summary (a 1-sentence summary of client's situation)
4. tasks (an array of scheduled tasks or action items mentioned. Each task should have "title" and "dueDate" (format: YYYY-MM-DD HH:MM). If no tasks, return empty array [])

Conversation:
{conversation_text}

Return ONLY valid JSON, no other text."""
        response = safe_chat_invoke([HumanMessage(content=prompt)])
        import json, re
        content = str(response.content)
        match = re.search(r'\{.*?\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Extraction error: {e}")
    return {"claim_amount": "N/A", "incident_date": "N/A", "client_summary": "", "tasks": []}

def process_conversation(conversation_text):
    global conversation_history
    conversation_history.append(HumanMessage(content=conversation_text))

    # Run Sentiment Analysis
    analyze_sentiment_and_emit(conversation_text)

    # Extract financial details and emit client summary
    extracted = extract_financial_details(conversation_text)
    if extracted.get('client_summary') or extracted.get('claim_amount') != 'N/A':
        requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'client_summary', 'data': extracted})
        
    if extracted.get('tasks') and len(extracted['tasks']) > 0:
        for task in extracted['tasks']:
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_ai_task', 'data': task})

    try:
        # Run LangGraph
        initial_state: AgentState = {"messages": conversation_history, "suggestion": "", "validated": False}
        final_state = compiled_graph.invoke(initial_state)

        # Update history with any new messages generated during the graph execution (e.g. tool calls, tool responses)
        new_messages = final_state["messages"][len(conversation_history):]
        if new_messages:
            conversation_history.extend(new_messages)

        formatted_response = final_state["suggestion"]
        if formatted_response:
            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_suggestion', 'data': {'response': formatted_response}})

        return formatted_response
    except Exception as e:
        logger.error(f"Error in process_conversation: {e}")
        fallback_suggestion = f"⚠️ BPO Suggestion Draft: [Suggestion currently unavailable due to rate limit/error: {str(e)}]"
        requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_suggestion', 'data': {'response': fallback_suggestion}})
        return fallback_suggestion

# --- Deepgram Audio Streaming (Async Bridge) ---
audio_queue = None
loop = None

async def start_twilio_server():
    import websockets
    async with websockets.serve(twilio_ws_handler, "0.0.0.0", 5002):
        await asyncio.Future()  # run forever

def start_asyncio_loop():
    global loop, audio_queue
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    audio_queue = asyncio.Queue()
    
    # Websocket Server for Twilio blocks this thread but keeps loop running
    loop.run_until_complete(start_twilio_server())

threading.Thread(target=start_asyncio_loop, daemon=True).start()

async def twilio_ws_handler(websocket):
    logger.info("=========================================")
    logger.info("TWILIO WEBSOCKET CONNECTION INITIATED!")
    logger.info("=========================================")
    
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("Missing DEEPGRAM_API_KEY")
        return
        
    dg_url = "wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&model=nova-2&smart_format=true"
    
    try:
        logger.info(f"Attempting to connect to Deepgram: {dg_url}")
        async with websockets.connect(dg_url, additional_headers={"Authorization": f"Token {api_key}"}) as dg_socket:
            logger.info("Successfully connected to Deepgram!")
            
            async def receive_from_deepgram():
                logger.info("Started receiving from Deepgram...")
                try:
                    async for msg in dg_socket:
                        res = json.loads(msg)
                        if res.get("is_final"):
                            alt = res.get("channel", {}).get("alternatives", [{}])[0]
                            transcript = alt.get("transcript", "").strip()
                            if transcript:
                                speaker = 0
                                if alt.get("words") and len(alt["words"]) > 0:
                                    speaker = alt["words"][0].get("speaker", 0)
                                speaker_name = "Customer"
                                log_entry = f"{speaker_name}: {transcript}"
                                logger.info(f"Twilio Transcript: {log_entry}")
                                requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': log_entry}})
                                threading.Thread(target=process_conversation, args=(log_entry,)).start()
                except Exception as e:
                    logger.error(f"Deepgram receive error: {e}", exc_info=True)

            # Start listening to Deepgram in the background
            asyncio.create_task(receive_from_deepgram())
            
            try:
                logger.info("Waiting for Twilio messages...")
                async for message in websocket:
                    data = json.loads(message)
                    if data["event"] == "connected":
                        logger.info(f"Twilio stream connected: {data}")
                    elif data["event"] == "start":
                        logger.info(f"Twilio stream started: {data}")
                    elif data["event"] == "media":
                        chunk = base64.b64decode(data["media"]["payload"])
                        await dg_socket.send(chunk)
                    elif data["event"] == "stop":
                        logger.info("Twilio stream stopped by Twilio!")
                        break
            except Exception as e:
                logger.error(f"Twilio WS Error: {e}", exc_info=True)
            finally:
                logger.info("Twilio socket finally block reached.")
    except Exception as outer_e:
        logger.error(f"Failed to connect to Deepgram or outer error: {outer_e}", exc_info=True)


async def deepgram_connection_task():
    global audio_queue
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("Missing DEEPGRAM_API_KEY. Cannot stream audio.")
        return

    if audio_queue is None:
        logger.error("audio_queue not initialized.")
        return

    dg_url = "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false&diarize=true"
    
    import websockets
    async with websockets.connect(dg_url, additional_headers={"Authorization": f"Token {api_key}"}) as connection:
        
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
                            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': log_entry}})
                            threading.Thread(target=process_conversation, args=(log_entry,)).start()
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
        finally:
            pass


@socketio.on('start_recording')
def handle_start_recording():
    global loop, audio_queue
    logger.info("Starting new Deepgram streaming session...")
    if loop is not None and audio_queue is not None:
        # Clear existing queue
        while not audio_queue.empty():
            try:
                audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        asyncio.run_coroutine_threadsafe(deepgram_connection_task(), loop)

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    global loop, audio_queue
    if loop is not None and audio_queue is not None:
        asyncio.run_coroutine_threadsafe(audio_queue.put(data), loop)

@socketio.on('stop_recording')
def handle_stop_recording():
    global loop, audio_queue
    logger.info("Stopping Deepgram streaming session...")
    if loop is not None and audio_queue is not None:
        asyncio.run_coroutine_threadsafe(audio_queue.put(None), loop)

# --- Flask Endpoints ---

@app.route('/twilio/voice', methods=['POST'])
def twilio_voice():
    response = VoiceResponse()
    response.say("Welcome to SAKSHAM Support. Please hold while we connect you to an agent.")
    
    # We construct the WSS url from the incoming request's host, replacing port 5000 with 5002
    host = request.host.split(':')[0]
    
    # Allow overriding via environment variable for production (e.g., ngrok tunnels)
    wss_url = os.getenv("TWILIO_WSS_URL", f"wss://{host}:5002")
    
    connect = Connect()
    connect.stream(url=wss_url)
    response.append(connect)
    
    return str(response), 200, {'Content-Type': 'text/xml'}

@app.route('/process_conversation', methods=['POST'])
def receive_transcription():
    data = request.json
    if not data or 'conversation_text' not in data:
        return jsonify({"error": "Invalid request"}), 400
    response = process_conversation(data['conversation_text'])
    return jsonify({"response": response})

@app.route('/emit_transcription', methods=['POST'])
def emit_transcription():
    """Forward a single transcription line to the frontend instantly without triggering LLM."""
    data = request.json
    if data and 'text' in data:
        socketio.emit('live_transcription', {'text': data['text']})
    return jsonify({"status": "success"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

import requests

@app.route('/test_emit', methods=['GET'])
def test_emit():
    socketio.emit('live_transcription', {'text': 'TEST TRANSCRIPT FROM HTTP'})
    socketio.emit('new_suggestion', {'response': 'TEST SUGGESTION FROM HTTP'})
    return jsonify({"status": "emitted"}), 200

@app.route('/internal_emit', methods=['POST'])
def internal_emit():
    data = request.json
    socketio.emit(data['event'], data['data'])
    return jsonify({"status": "emitted"}), 200


@app.route('/refresh_history', methods=['POST'])
def refresh_history():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "success", "message": "Conversation history cleared"}), 200


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
