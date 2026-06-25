import pika
import json
import os
import sys

# Optional: Set up paths if required
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from document_crew import process_document_with_crewai
from Call_summary import summary_generation
from logger_config import get_logger

logger = get_logger(__name__)

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://localhost:5672")

def callback(ch, method, properties, body):
    try:
        msg = json.loads(body)
        task_type = msg.get("task")
        
        if task_type == "verify_document":
            logger.info(f"Received document verification task for claim: {msg.get('claimID')}")
            file_path = msg.get("filePath")
            claim_id = msg.get("claimID")
            
            # Execute CrewAI verification pipeline
            logger.info(f"Executing CrewAI pipeline for {claim_id} with file {file_path}...")
            try:
                result = process_document_with_crewai(claim_id, file_path, ch)
                result_str = str(result)
                
                # Publish result back
                result_msg = json.dumps({
                    "claimID": claim_id,
                    "status": "completed",
                    "result": result_str
                })
            except Exception as e:
                logger.error(f"CRITICAL ERROR: CrewAI verification failed: {e}")
                # Publish failure status back
                result_msg = json.dumps({
                    "claimID": claim_id,
                    "status": "failed",
                    "result": f"System Error during verification: {str(e)}"
                })
                
            logger.info(f"Finished processing document for claim {claim_id}")
            
            ch.basic_publish(
                exchange='',
                routing_key='verification_results',
                body=result_msg
            )
            logger.info(f"Published verification result for {claim_id}")
            
        elif task_type == "generate_summary":
            logger.info("Received call summary generation task for call.")
            conversation_text = msg.get("conversation_text")
            
            # Generate summary
            summary = summary_generation(conversation_text)
            logger.info(f"Generated Summary: {summary[:100]}...")
            
        else:
            logger.warning(f"Unknown task type: {task_type}")
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        
    finally:
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    try:
        # Use pika.URLParameters to connect to RabbitMQ
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        # Declare the queues
        channel.queue_declare(queue='document_processing', durable=True)
        channel.queue_declare(queue='verification_results', durable=True)

        # Set QoS
        channel.basic_qos(prefetch_count=1)
        
        # Start consuming
        channel.basic_consume(queue='document_processing', on_message_callback=callback)

        logger.info(' [*] Waiting for messages. To exit press CTRL+C')
        channel.start_consuming()
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")

if __name__ == '__main__':
    main()
