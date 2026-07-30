import os
import litellm
from crewai import Agent, Task, Crew, Process, LLM
import pytesseract
from PIL import Image
from PyPDF2 import PdfReader
from logger_config import get_logger

litellm.drop_params = True

_orig_completion = litellm.completion
def _clean_messages(kwargs):
    if "messages" in kwargs and isinstance(kwargs["messages"], list):
        for msg in kwargs["messages"]:
            if isinstance(msg, dict):
                msg.pop("cache_breakpoint", None)

def _patched_completion(*args, **kwargs):
    _clean_messages(kwargs)
    return _orig_completion(*args, **kwargs)

litellm.completion = _patched_completion

_orig_acompletion = litellm.acompletion
async def _patched_acompletion(*args, **kwargs):
    _clean_messages(kwargs)
    return await _orig_acompletion(*args, **kwargs)

litellm.acompletion = _patched_acompletion

logger = get_logger(__name__)

import json

def process_document_with_crewai(claim_id: str, file_path: str, channel=None):
    """
    Trigger the CrewAI pipeline to process the uploaded document.
    """
    def publish_progress(message):
        if channel:
            try:
                msg = json.dumps({"claimID": claim_id, "message": f"Processing: {message}"})
                channel.basic_publish(exchange='', routing_key='verification_progress', body=msg)
                logger.info(f"Published progress: {message}")
            except Exception as e:
                logger.error(f"Failed to publish progress: {e}")

    publish_progress("Booting AI Agents & reading document...")
    api_key = os.getenv("API_KEY", "")
    os.environ["GROQ_API_KEY"] = api_key
    os.environ["LITELLM_DROP_PARAMS"] = "true"
    llm_model = LLM(model="groq/llama-3.1-8b-instant", api_key=api_key)

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

    # Define Enterprise Agents
    ocr_specialist = Agent(
        role='Medical OCR & Entity Extraction Specialist',
        goal='Accurately extract essential clinical and financial entities from claim documents.',
        backstory='Certified medical coding and OCR parser specialized in identifying Patient Names, Provider Credentials, Dates of Service, Diagnosis (ICD-10/CPT), Itemized Costs, and Payment Receipts.',
        verbose=True,
        allow_delegation=False,
        llm=llm_model
    )

    fraud_detector = Agent(
        role='Health Insurance Fraud & Risk Analyst',
        goal='Evaluate claim data against industry anti-fraud heuristics (NHCAA & CMS FPS guidelines).',
        backstory='Expert Healthcare Fraud Investigator proficient in detecting billing anomalies (unbundling, upcoding, duplicate claims), identity theft, clinical misalignments, and temporal/financial contradictions.',
        verbose=True,
        allow_delegation=False,
        llm=llm_model
    )

    policy_aligner = Agent(
        role='Medical Claims Compliance & Policy Officer',
        goal='Cross-reference extracted document data against insurance policy rules to render a binding claim decision.',
        backstory='Senior Medical Claims Adjudicator who applies standard adjudication guidelines to approve legitimate claims, send high-value/ambiguous claims to manual review, and reject fraudulent or unreadable submissions.',
        verbose=True,
        allow_delegation=False,
        llm=llm_model
    )

    # Define Standardized Verification Tasks
    extract_task = Task(
        description=f"Analyze the following raw OCR text extracted from document for Claim ID {claim_id}.\n"
                    f"Extract key entities into structured format:\n"
                    f"- Claim ID & Patient Full Name\n"
                    f"- Healthcare Provider / Facility Name & Credentials\n"
                    f"- Date of Service & Document Issue Date\n"
                    f"- Medical Diagnosis / Procedure Description\n"
                    f"- Itemized Charges & Total Amount\n"
                    f"- Payment & Receipt Status\n\n"
                    f"Raw Text:\n{extracted_text}",
        expected_output="Structured summary of extracted clinical and financial entities.",
        agent=ocr_specialist,
        callback=lambda out: publish_progress("Extracting & structuring clinical entities...")
    )

    fraud_task = Task(
        description=f"Evaluate the extracted data for Claim ID {claim_id} against standard Healthcare Fraud Indicators (CMS/NHCAA):\n"
                    f"1. Temporal Integrity: Service dates in 2025/2026 are valid current dates. (Flag only if date is completely unreadable or missing).\n"
                    f"2. Financial Integrity: Check if itemized charges match the total amount. (Flag only if there is a severe arithmetic contradiction).\n"
                    f"3. Clinical Alignment: Verify that the treatment logically corresponds to the reported diagnosis.\n"
                    f"4. Document Authenticity: Check for signs of blatant fabrication or completely garbled noise.\n"
                    f"Assign an Overall Risk Rating: 'Low', 'Medium', or 'High' with clear reasoning.",
        expected_output="Fraud Risk Assessment Report with risk level and breakdown.",
        agent=fraud_detector,
        callback=lambda out: publish_progress("Running CMS/NHCAA anti-fraud heuristics...")
    )

    align_task = Task(
        description=f"Adjudicate Claim ID {claim_id} according to Standard Insurance Policy Rules:\n\n"
                    f"POLICY RULES:\n"
                    f"• RULE 101 (APPROVAL): If the document is a legible medical certificate/invoice containing Patient Name, Provider Name, Service Date, Diagnosis, and Total Amount with LOW fraud risk, decision MUST be 'Approved'.\n"
                    f"• RULE 102 (MANUAL REVIEW): If the claim is eligible but total amount exceeds $5,000.00 or contains minor OCR ambiguities requiring human verification, decision MUST be 'Pending Manual Review'.\n"
                    f"• RULE 103 (REJECTION): If the document is completely unreadable, lacks patient/provider identity, has severe billing contradictions, or has HIGH fraud risk, decision MUST be 'Rejected'.\n\n"
                    f"Output your final adjudication strictly starting with:\n"
                    f"**Final Decision:** Approved (or Pending Manual Review / Rejected)\n\n"
                    f"Followed by a concise 2-3 sentence policy justification.",
        expected_output="Final claim decision starting with '**Final Decision:** Approved' (or Pending Manual Review / Rejected) with policy rationale.",
        agent=policy_aligner,
        callback=lambda out: publish_progress("Applying adjudication policy rules & finalizing verdict...")
    )

    # Assemble Crew
    crew = Crew(
        agents=[ocr_specialist, fraud_detector, policy_aligner],
        tasks=[extract_task, fraud_task, align_task],
        process=Process.sequential,
        verbose=True,
        cache=False
    )

    # Execute
    logger.info(f"Starting CrewAI document verification for Claim ID {claim_id}...")
    try:
        result = crew.kickoff()
        logger.info(f"CrewAI Final Result for Claim {claim_id}:\n{result}")
        return result
    except Exception as e:
        logger.error(f"CRITICAL ERROR: CrewAI execution failed for Claim {claim_id}: {e}")
        raise RuntimeError(f"CrewAI execution failed: {e}")
