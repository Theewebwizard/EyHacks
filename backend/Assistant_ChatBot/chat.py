import os
from pinecone import Pinecone
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sentence_transformers import CrossEncoder

# Initialize embeddings, cross-encoder, and index name.
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
index_name = "langchain-chatbot"

def initialize_pinecone():
    try:
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pc = Pinecone(api_key=pinecone_api_key, pool_threads=8)
        os.environ["PINECONE_API_KEY"] = pinecone_api_key
        return pc
    except Exception:
        return None

def setup_vector_store():
    try:
        vector_store = LangchainPinecone.from_existing_index(
            index_name=index_name,
            embedding=embeddings
        )
        return vector_store
    except Exception:
        return None

def rerank_documents(query, documents, top_k=3):
    """Re-rank documents using the Cross-Encoder."""
    if not documents:
        return []
    
    # Create pairs of (query, document_text)
    pairs = [[query, doc.page_content] for doc, _ in documents]
    
    # Score pairs
    scores = cross_encoder.predict(pairs)
    
    # Sort documents by score descending
    scored_docs = zip(documents, scores)
    sorted_docs = sorted(scored_docs, key=lambda x: x[1], reverse=True)
    
    # Return top_k documents (stripping out the score and relevance from similarity search)
    return [doc for (doc, _), score in sorted_docs[:top_k]]

def initialize_gemini():
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.7,
            google_api_key=google_api_key
        )
        prompt_template = (
                "You are a strict claims process validator. Answer ONLY using the provided context.\n\n"
                "Context:\n{context}\n\n"
                "Response Rules:\n"
                "1. If context contains the exact answer:\n"
                "   1. State requirements verbatim.\n"
                "   2. List exact process steps from context, numerated.\n"
                "   3. Quote exception clauses directly.\n\n"
                "2. If the exact answer is missing but related information exists:\n"
                "   1. Provide relevant details from context that may assist the agent.\n"
                "   2. Clearly state that related guidelines are provided.\n\n"
                "3. If no relevant information exists:\n"
                "   1. \"This claim pattern isn't recognized in our current records.\"\n"
                "   2. Do NOT suggest alternatives or make assumptions.\n\n"
                "Agent's Question:\n{question}"
        )
        prompt = PromptTemplate.from_template(prompt_template)
        rag_chain = prompt | llm | StrOutputParser()
        return rag_chain
    except Exception:
        return None

def query_interface(vector_store, rag_chain):
    while True:
        try:
            user_input = input("").strip()
            if user_input.lower() in ['exit', 'quit']:
                break

            # 1. Fetch larger batch using similarity search (Dense)
            results = vector_store.similarity_search_with_relevance_scores(
                user_input,
                k=15, # Increased K for re-ranking pool
                score_threshold=0.3
            )

            if not results:
                continue
                
            # 2. Re-rank with Cross-Encoder
            top_docs = rerank_documents(user_input, results, top_k=3)

            # 3. Pass to Gemini
            context = "\n".join([doc.page_content for doc in top_docs])
            response = rag_chain.invoke({"context": context, "question": user_input})
            print(response)
            
        except KeyboardInterrupt:
            break
        except Exception:
            pass

def main():
    pc = initialize_pinecone()
    if not pc:
        return
    vector_store = setup_vector_store()
    if not vector_store:
        return
    rag_chain = initialize_gemini()
    if not rag_chain:
        return
    query_interface(vector_store, rag_chain)

if __name__ == "__main__":
    main()
