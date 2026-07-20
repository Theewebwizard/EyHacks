import os
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Shared embeddings model and index name
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
index_name = "langchain-chatbot"

def initialize_pinecone():
    try:
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pc = Pinecone(api_key=pinecone_api_key, pool_threads=8)
        return pc
    except Exception:
        return None

def setup_vector_store():
    """Connect to an existing Pinecone index and return a LangChain vector store."""
    try:
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not set")
        pc = Pinecone(api_key=pinecone_api_key)
        index = pc.Index(index_name)
        vector_store = PineconeVectorStore(index=index, embedding=embeddings)
        print(f"Successfully connected to Pinecone index: {index_name}")
        return vector_store
    except Exception as e:
        print(f"Failed to setup vector store: {e}")
        return None

def initialize_llm():
    try:
        groq_api_key = os.getenv("API_KEY") or os.getenv("GROQ_API_KEY")
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.7,
            api_key=groq_api_key
        )
        prompt_template = (
            "You are a strict claims process validator. Answer ONLY using the provided context.\n\n"
            "Context:\n{context}\n\n"
            "Style Directives:\n{style_directives}\n\n"
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
    except Exception as e:
        print(f"Failed to initialize LLM: {e}")
        return None

# Alias for backwards compatibility
initialize_gemini = initialize_llm
