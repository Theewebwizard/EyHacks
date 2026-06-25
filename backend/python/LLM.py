from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import pipeline
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
from typing import Annotated, Sequence, cast, List, Dict, Any, TypedDict
import operator
from dotenv import load_dotenv
import subprocess
from pymongo import MongoClient

load_dotenv()
api_key = os.getenv("API_KEY")
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Initialize Models and DB ---
model = SentenceTransformer('all-mpnet-base-v2')
chat = ChatGroq(temperature=0, model="llama-3.1-8b-instant", groq_api_key=api_key)  # type: ignore
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
sentiment_analyzer = pipeline("text-classification", model="bhadresh-savani/distilbert-base-uncased-emotion", top_k=None)

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
    messages: Annotated[Sequence[HumanMessage | AIMessage | SystemMessage], operator.add]
    suggestion: str
    validated: bool

@tool
def query_claim_status(claim_id: str) -> str:
    """Query MongoDB for the real-time status of a claim."""
    claim = claims_collection.find_one({"claimID": claim_id})
    if claim:
        return f"Claim {claim_id} found. Type: {claim.get('claimType')}, Priority: {claim.get('priority')}."
    return f"Claim {claim_id} not found in database."

@tool
def search_policy_vectors(query: str) -> str:
    """Search the local FAISS vector database for policy guidelines based on a query."""
    if not category_list:
        return "No policy vectors available."
    category = classifier(query, candidate_labels=category_list)["labels"][0]
    idx = indexes[category]
    query_embeddings = model.encode([query])
    distance, indices = idx.search(np.array(query_embeddings), k=3)
    results = [category_text[category][i] for i in indices[0]]
    return "\n".join(results)

tools = [query_claim_status, search_policy_vectors]
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
                print(f"⚠️ Groq rate limit hit. Waiting {delay}s before retry (attempt {i+1}/{retries})...")
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
    sys_msg = SystemMessage(content="You are a helpful BPO assistant. Use tools to look up claim status and policy vectors. Draft a clear suggestion for the agent.")
    response = safe_chat_invoke([sys_msg] + recent_messages)
    return {"suggestion": response.content}

def reflect(state: AgentState):
    """Reflect on the suggestion to ensure policy compliance."""
    suggestion = state["suggestion"]
    reflection_prompt = HumanMessage(content=f"Review this suggestion for strict policy compliance and clarity:\n\n{suggestion}\n\nIf it needs improvement, rewrite it. Output ONLY the final, polished suggestion text that the agent should read. Do NOT output any introductory text, lists, explanations, or the words 'YES' or 'NO'.")
    response = safe_chat_invoke([reflection_prompt])
    
    response_content = response.content
    return {"validated": True, "suggestion": response_content}

def router(state: AgentState):
    # Always end after reflection to prevent infinite generation loops if LLM outputs NO
    return END

# --- LangGraph Definition ---
workflow = StateGraph(AgentState)  # type: ignore
workflow.add_node("generate", generate_suggestion)
workflow.add_node("reflect", reflect)

workflow.add_conditional_edges(
    "reflect",
    router,
    {
        END: END,
        "generate": "generate"
    }
)

workflow.set_entry_point("generate")
workflow.add_edge("generate", "reflect")

compiled_graph = workflow.compile()

conversation_history = []


# --- Main Conversation Processor ---
def analyze_sentiment_and_emit(conversation_text):
    """Analyze sentiment and emit it to the client via Socket.IO."""
    try:
        prompt = f"Analyze the sentiment of the following conversation and return exactly one word: POSITIVE, NEGATIVE, or NEUTRAL.\n\nConversation:\n{conversation_text}"
        response = safe_chat_invoke([HumanMessage(content=prompt)])
        sentiment = cast(str, response.content).strip().upper()
        if sentiment in ["POSITIVE", "NEGATIVE", "NEUTRAL"]:
            socketio.emit('sentiment_update', {'sentiment': sentiment})
        else:
            socketio.emit('sentiment_update', {'sentiment': 'NEUTRAL'})
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
        socketio.emit('sentiment_update', {'sentiment': 'NEUTRAL'})

def extract_financial_details(conversation_text):
    """Extract financial details and return JSON structured info."""
    try:
        prompt = f"""Extract the following details from this conversation:
1. claim_amount (estimated value of medical bills mentioned, e.g. "5000")
2. incident_date (date the event occurred, e.g. "2026-06-24")
3. client_summary (a 1-sentence summary of client's situation)

Conversation:
{conversation_text}

Return ONLY valid JSON, no other text."""
        response = safe_chat_invoke([HumanMessage(content=prompt)])
        import json, re
        content = str(response.content)
        # Extract JSON from response
        match = re.search(r'\{.*?\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"Financial extraction error: {e}")
    return {"claim_amount": "N/A", "incident_date": "N/A", "client_summary": ""}

def process_conversation(conversation_text):
    global conversation_history
    conversation_history.append(HumanMessage(content=conversation_text))

    # We no longer emit the raw text here because it's already emitted line-by-line via /emit_transcription

    # Run Sentiment Analysis
    analyze_sentiment_and_emit(conversation_text)

    # Extract financial details and emit client summary
    financial = extract_financial_details(conversation_text)
    if financial.get('client_summary') or financial.get('claim_amount') != 'N/A':
        socketio.emit('client_summary', financial)

    try:
        # Run LangGraph
        initial_state: AgentState = {"messages": conversation_history, "suggestion": "", "validated": False}
        final_state = compiled_graph.invoke(initial_state)

        formatted_response = final_state["suggestion"]
        socketio.emit('new_suggestion', {'response': formatted_response})

        conversation_history.append(AIMessage(content=formatted_response))
        return formatted_response
    except Exception as e:
        print(f"Error in process_conversation: {e}")
        fallback_suggestion = f"⚠️ BPO Suggestion Draft: [Suggestion currently unavailable due to rate limit/error: {str(e)}]"
        socketio.emit('new_suggestion', {'response': fallback_suggestion})
        return fallback_suggestion


# --- Flask Endpoints ---

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

@app.route('/refresh_history', methods=['POST'])
def refresh_history():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "success", "message": "Conversation history cleared"}), 200

@app.route('/start_vat', methods=['POST'])
def start_vat():
    try:
        import sys
        import subprocess
        import os
        
        # Kill any existing background VACT processes to prevent duplicate transcriptions
        subprocess.run(["pkill", "-f", "VACT.py"], capture_output=True)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        vact_path = os.path.join(script_dir, 'VACT.py')
        subprocess.Popen([sys.executable, vact_path])
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
