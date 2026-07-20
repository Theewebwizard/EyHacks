import os
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_experimental.text_splitter import SemanticChunker

# Shared embeddings model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Data directory (relative to /app in the Docker container)
DATA_DIR = os.path.join(os.path.dirname(__file__), "Data")

def load_docs(directory):
    """Load .txt documents from the Data directory."""
    try:
        loader = DirectoryLoader(directory, glob="*.txt", loader_cls=TextLoader)
        documents = loader.load()
        print(f"Loaded {len(documents)} documents from {directory}")
        return documents
    except Exception as e:
        print(f"Error loading documents: {e}")
        return []

def split_docs(documents):
    """Split documents into semantic chunks."""
    try:
        text_splitter = SemanticChunker(embeddings)
        docs = text_splitter.split_documents(documents)
        print(f"Split into {len(docs)} semantic chunks")
        return docs
    except Exception as e:
        print(f"Error splitting documents: {e}")
        return []

def initialize_pinecone():
    """Initialize Pinecone client."""
    try:
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY is not set")
        pc = Pinecone(api_key=pinecone_api_key)
        return pc
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None

def ensure_index_exists(pc, index_name):
    """Create Pinecone index if it does not already exist."""
    try:
        existing = [idx.name for idx in pc.list_indexes()]
        if index_name not in existing:
            pc.create_index(
                name=index_name,
                dimension=384,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            print(f"Created new Pinecone index: {index_name}")
        else:
            print(f"Index '{index_name}' already exists — skipping creation.")
        return True
    except Exception as e:
        print(f"Error with Pinecone index: {e}")
        return False

def main():
    """Ingest documents into Pinecone. Idempotent — skips if index already exists."""
    index_name = "langchain-chatbot"

    pc = initialize_pinecone()
    if not pc:
        print("❌ Pinecone initialization failed. Skipping ingestion.")
        return

    # If index already exists and has vectors, skip ingestion
    try:
        existing = [idx.name for idx in pc.list_indexes()]
        if index_name in existing:
            stats = pc.Index(index_name).describe_index_stats()
            total_vectors = stats.get("total_vector_count", 0)
            if total_vectors and total_vectors > 0:
                print(f"✅ Index '{index_name}' already has {total_vectors} vectors. Skipping ingestion.")
                return
    except Exception as e:
        print(f"Could not check index stats: {e}")

    documents = load_docs(DATA_DIR)
    if not documents:
        print("❌ No documents loaded. Skipping ingestion.")
        return

    docs = split_docs(documents)
    if not docs:
        print("❌ No chunks produced. Skipping ingestion.")
        return

    if not ensure_index_exists(pc, index_name):
        return

    try:
        PineconeVectorStore.from_documents(
            documents=docs,
            embedding=embeddings,
            index_name=index_name
        )
        print("✅ Documents ingested into Pinecone successfully.")
    except Exception as e:
        print(f"❌ Error ingesting documents: {e}")

if __name__ == "__main__":
    main()
