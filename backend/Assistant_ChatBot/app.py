from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
from chat import initialize_pinecone, setup_vector_store, initialize_gemini, rerank_documents
from ingest import main as run_ingestion
import os

load_dotenv(find_dotenv())

app = Flask(__name__)
CORS(app)

# Initialize services
print("🚀 Starting data ingestion...")
run_ingestion()

print("🔧 Initializing chatbot components...")
pc = initialize_pinecone()
vector_store = setup_vector_store()
rag_chain = initialize_gemini()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ready",
        "services": {
            "pinecone": bool(pc),
            "vector_store": bool(vector_store),
            "gemini": bool(rag_chain)
        }
    })

@app.route('/api/query', methods=['POST'])
def handle_query():
    try:
        data = request.get_json()
        user_input = data.get('question', '').strip()
        style = data.get('style', 'balanced').lower()
        
        if not user_input:
            return jsonify({"error": "Empty query"}), 400

        if style == 'aggressive':
            style_directives = "Provide exhaustive recommendations and highly detailed step-by-step guidance. Be extremely proactive."
        elif style == 'conservative':
            style_directives = "Only provide high confidence answers. Be extremely brief and literal. Do not add any extra guidance."
        else:
            style_directives = "Provide a balanced, helpful, and reasonably detailed response."
        
        # Perform fast similarity search directly (no heavy local CrossEncoder)
        results = vector_store.similarity_search_with_relevance_scores(
            user_input,
            k=3,
            score_threshold=0.3
        )

        if not results:
            return jsonify({
                "response": "This claim pattern isn't recognized in our current records."
            })

        # Generate response using top 3 Pinecone results
        context = "\n".join([doc.page_content for doc, _ in results])
        response = rag_chain.invoke({"context": context, "question": user_input, "style_directives": style_directives})
        
        return jsonify({"response": response})

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)