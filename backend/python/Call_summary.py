import os

from flask import Flask, jsonify
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from flask_cors import CORS
from logger_config import get_logger

logger = get_logger(__name__)

load_dotenv()
api_key = os.getenv("API_KEY")
chat = ChatGroq(temperature=0, model="mixtral-8x7b-32768",
                groq_api_key=api_key)  # type: ignore

app = Flask(__name__)
CORS(app)


def summary_generation(conversation):
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that summarizes conversations between a customer and an agent. "
                   "Your task is to create a concise summary of the conversation, capturing all the important points."),
        ("user", "Here is the conversation:\n\n{conversation}\n\nPlease provide a summary.")
    ])

    prompt = prompt_template.format_prompt(conversation=conversation)
    response = chat.invoke(prompt)
    return response.content


def read_transcription(filepath):
    with open(filepath, "r") as file:
        conversation = file.read()
    return conversation


@app.route('/create_summary', methods=['POST'])
def create_summary():
    filepath = "conversation_log.txt"
    conversation = read_transcription(filepath)
    summary = summary_generation(conversation)

    return jsonify({"summary": summary})