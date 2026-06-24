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
from typing import Annotated, Sequence, cast, List, Dict, Any
from typing_extensions import TypedDict
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
chat = ChatGroq(temperature=0, model="gemma2-9b-it", groq_api_key=api_key)  # type: ignore
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

def generate_suggestion(state: AgentState):
    """Draft a suggestion based on the conversation and tools."""
    messages = state["messages"]
    sys_msg = SystemMessage(content="You are a helpful BPO assistant. Use tools to look up claim status and policy vectors. Draft a clear suggestion for the agent.")
    response = chat.invoke([sys_msg] + list(messages))
    return {"suggestion": response.content}

def reflect(state: AgentState):
    """Reflect on the suggestion to ensure policy compliance."""
    suggestion = state["suggestion"]
    reflection_prompt = HumanMessage(content=f"Review this suggestion for strict policy compliance and clarity:\n\n{suggestion}\n\nDoes it meet the standards? Answer YES or NO, followed by the refined suggestion if needed.")
    response = chat.invoke([reflection_prompt])
    
    response_content = response.content
    if isinstance(response_content, str):
        validated = "YES" in response_content.upper()
    else:
        validated = "YES" in str(response_content).upper()
    return {"validated": validated, "suggestion": response_content}

def router(state: AgentState):
    if state.get("validated", False):
        return END
    return "generate"

graph = StateGraph(AgentState)  # type: ignore
graph.add_node("generate", generate_suggestion)
graph.add_node("reflect", reflect)
# Simplified graph without cyclical tool forcing for stability
graph.add_edge("generate", "reflect")
graph.add_conditional_edges("reflect", router, {END: END, "generate": "generate"})
graph.set_entry_point("generate")

compiled_graph = graph.compile()

conversation_history = []

def analyze_sentiment_and_emit(text: str):
    """Analyze the text and emit an alert if negative sentiment is high."""
    try:
        results = sentiment_analyzer(text)
        # Results is a list of lists of dicts: [[{'label': 'sadness', 'score': 0.9}, ...]]
        emotions = {}
        if isinstance(results, list) and len(results) > 0:
            first_res = results[0]
            if isinstance(first_res, list):
                res_list = cast(List[Dict[str, Any]], first_res)
                for item in res_list:
                    emotions[str(item.get('label'))] = float(item.get('score', 0.0))
        
        anger_score = emotions.get('anger', 0.0)
        sadness_score = emotions.get('sadness', 0.0)
        fear_score = emotions.get('fear', 0.0)
        
        # We consider negative sentiment to be anger
        if anger_score > 0.70:
            socketio.emit('sentiment_alert', {
                'emotion': 'Anger/Frustration',
                'score': round(anger_score, 2),
                'message': 'Client appears highly frustrated! Please handle with care and escalate if necessary.'
            })
            print(f"🚨 SENTIMENT ALERT: Anger detected ({anger_score:.2f})")
    except Exception as e:
        print(f"Sentiment analysis error: {e}")

def extract_financial_details(conversation_text: str) -> dict:
    """Extract claim amount and date from conversation using LLM."""
    try:
        prompt = f"""Extract financial details from this insurance call conversation. Return ONLY a JSON object with these exact keys:
- "claim_amount": the monetary amount mentioned (e.g. "₹50,000" or "N/A" if not mentioned)
- "incident_date": the date of incident mentioned (e.g. "15 Jan 2025" or "N/A" if not mentioned)
- "client_summary": a 1-2 sentence summary of the client's situation

Conversation:
{conversation_text}

Return ONLY valid JSON, no other text."""
        response = chat.invoke([HumanMessage(content=prompt)])
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

    # Emit the raw transcription text to the frontend
    socketio.emit('live_transcription', {'text': conversation_text})

    # Run Sentiment Analysis
    analyze_sentiment_and_emit(conversation_text)

    # Extract financial details and emit client summary
    financial = extract_financial_details(conversation_text)
    if financial.get('client_summary') or financial.get('claim_amount') != 'N/A':
        socketio.emit('client_summary', financial)

    # Run LangGraph
    initial_state: AgentState = {"messages": conversation_history, "suggestion": "", "validated": False}
    final_state = compiled_graph.invoke(initial_state)

    formatted_response = final_state["suggestion"]
    socketio.emit('new_suggestion', {'response': formatted_response})

    conversation_history.append(AIMessage(content=formatted_response))
    return formatted_response


# --- Flask Endpoints ---

@app.route('/process_conversation', methods=['POST'])
def receive_transcription():
    data = request.json
    if not data or 'conversation_text' not in data:
        return jsonify({"error": "Invalid request"}), 400
    response = process_conversation(data['conversation_text'])
    return jsonify({"response": response})

@app.route('/refresh_history', methods=['POST'])
def refresh_history():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "success", "message": "Conversation history cleared"}), 200

@app.route('/start_vat', methods=['POST'])
def start_vat():
    try:
        subprocess.Popen(['python', 'VACT.py'])
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
