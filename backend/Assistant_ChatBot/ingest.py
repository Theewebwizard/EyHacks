import os
from pinecone import Pinecone, ServerlessSpec
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_huggingface import HuggingFaceEmbeddings

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Directory configuration
directory = './Data'

def load_docs(directory):
    """Loads documents from the specified directory."""
    try:
        loader = DirectoryLoader(directory, glob="*.txt", loader_cls=TextLoader)
        documents = loader.load()
        print(f"Successfully loaded {len(documents)} documents from {directory}")
        return documents
    except Exception as e:
        print(f"Error loading documents: {e}")
        return []

from langchain_experimental.text_splitter import SemanticChunker

def split_docs(documents):
    """Splits long documents into smaller chunks using SemanticChunker."""
    try:
        text_splitter = SemanticChunker(embeddings)
        docs = text_splitter.split_documents(documents)
        print(f"Split documents into {len(docs)} semantic chunks")
        return docs
    except Exception as e:
        print(f"Error splitting documents: {e}")
        return []

def initialize_pinecone():
    """Initialize Pinecone with hardcoded API key."""
    try:
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pc = Pinecone(
            api_key=pinecone_api_key,
            pool_threads=8
        )
        os.environ["PINECONE_API_KEY"] = pinecone_api_key
        return pc
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None

def create_or_get_index(pc, index_name):
    """Create Pinecone index if it doesn't exist or get existing index."""
    try:
        if index_name not in pc.list_indexes().names():
            pc.create_index(
                name=index_name,
                dimension=384,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            print(f"Created new index: {index_name}")
        return True
    except Exception as e:
        print(f"Error with Pinecone index: {e}")
        return False

def setup_vector_store(pc, docs, embeddings, index_name):
    """Set up the vector store with the provided documents."""
    try:
        vector_store = LangchainPinecone.from_documents(
            documents=docs,
            embedding=embeddings,
            index_name=index_name
        )
        print("Successfully created vector store")
        return vector_store
    except Exception as e:
        print(f"Error setting up vector store: {e}")
        return None

def main():
    index_name = "langchain-chatbot"

    documents = load_docs(directory)
    if not documents:
        return

    docs = split_docs(documents)
    if not docs:
        return

    pc = initialize_pinecone()
    if not pc:
        return

    if not create_or_get_index(pc, index_name):
        return

    vector_store = setup_vector_store(pc, docs, embeddings, index_name)
    if vector_store:
        print("Index creation and population completed successfully")

if __name__ == "__main__":
    main()