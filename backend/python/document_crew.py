import os
from crewai import Agent, Task, Crew, Process, LLM
import pytesseract
from PIL import Image
from PyPDF2 import PdfReader

def process_document_with_crewai(claim_id: str, file_path: str):
    """
    Trigger the CrewAI pipeline to process the uploaded document.
    """
    llm = LLM(model="groq/llama-3.1-8b-instant", api_key=os.getenv("API_KEY", ""))

    extracted_text: str = ""
    try:
        if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            extracted_text = str(pytesseract.image_to_string(Image.open(file_path)))
        elif file_path.lower().endswith('.pdf'):
            reader = PdfReader(file_path)
            extracted_text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()])
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
    except Exception as e:
        raise ValueError(f"CRITICAL ERROR: Failed to extract text from document {file_path}. Details: {e}")
        
    if not isinstance(extracted_text, str) or not extracted_text.strip():
        raise ValueError(f"CRITICAL ERROR: Extracted text is empty or invalid for document {file_path}.")

    # Define Agents
    ocr_specialist = Agent(
        role='OCR and Data Extraction Specialist',
        goal='Extract clean, structured information from raw document text.',
        backstory='An expert in optical character recognition and parsing unstructured data from medical and financial documents.',
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    fraud_detector = Agent(
        role='Fraud Detection Analyst',
        goal='Analyze the extracted document data for inconsistencies, anomalies, or common fraud indicators.',
        backstory='A seasoned investigator with a sharp eye for detail, specializing in catching fraudulent insurance claims.',
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    policy_aligner = Agent(
        role='Policy Alignment Agent',
        goal='Cross-reference the verified document data with the active policy rules to determine claim validity.',
        backstory='A strict compliance officer who knows the company policies inside out and ensures every claim aligns with the rules.',
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    # Define Tasks
    extract_task = Task(
        description=f"Analyze the following raw text extracted from a document for Claim ID {claim_id}. Extract the key entities (names, dates, amounts, diagnosis/financial terms).\n\nRaw Text:\n{extracted_text}",
        expected_output="A structured JSON or bulleted list of key entities found in the document.",
        agent=ocr_specialist
    )

    fraud_task = Task(
        description=f"Review the structured entities extracted by the OCR Specialist for Claim ID {claim_id}. Check for logical inconsistencies (e.g., dates in the future, suspiciously round numbers, mismatched names).",
        expected_output="A fraud risk assessment report indicating 'Low', 'Medium', or 'High' risk with explanations.",
        agent=fraud_detector
    )

    align_task = Task(
        description=f"Given the extracted data and the fraud assessment, determine if the document supports a valid claim payout for Claim ID {claim_id}. Output a final decision ('Approved', 'Pending Manual Review', 'Rejected').",
        expected_output="Final decision string with a brief justification.",
        agent=policy_aligner
    )

    # Assemble Crew
    crew = Crew(
        agents=[ocr_specialist, fraud_detector, policy_aligner],
        tasks=[extract_task, fraud_task, align_task],
        process=Process.sequential,
        verbose=True
    )

    # Execute
    print(f"Starting CrewAI document verification for Claim ID {claim_id}...", flush=True)
    try:
        result = crew.kickoff()
        print(f"--- CrewAI Final Result for Claim {claim_id} ---")
        print(result)
        return result
    except Exception as e:
        print(f"CRITICAL ERROR: CrewAI execution failed for Claim {claim_id}: {e}", flush=True)
        raise RuntimeError(f"CrewAI execution failed: {e}")
