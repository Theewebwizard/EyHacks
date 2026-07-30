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
                logger.info(f"Finished processing document for claim {claim_id}")

                ch.basic_publish(
                    exchange='',
                    routing_key='verification_results',
                    body=result_msg,
                    properties=pika.BasicProperties(delivery_mode=2)  # persistent
                )
                logger.info(f"Published verification result for {claim_id}")
                # Acknowledge only after a successful publish to avoid data loss.
                ch.basic_ack(delivery_tag=method.delivery_tag)

            except Exception as e:
                logger.error(f"CRITICAL ERROR: CrewAI verification failed for {claim_id}: {e}")
                # Dead-letter the message so it can be inspected without being lost.
                # requeue=False routes it to dlq_documents via the configured DLX.
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return  # Do not fall through to the outer ack.

        elif task_type == "generate_summary":
            logger.info("Received call summary generation task for call.")
            conversation_text = msg.get("conversation_text")

            # Generate summary
            summary = summary_generation(conversation_text)
            logger.info(f"Generated Summary: {summary[:100]}...")
            ch.basic_ack(delivery_tag=method.delivery_tag)

        else:
            logger.warning(f"Unknown task type: {task_type}")
            ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error(f"Error processing message (non-CrewAI): {e}")
        # Ack to prevent an unparseable/corrupt message from poisoning the consumer.
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    try:
        # Use pika.URLParameters to connect to RabbitMQ
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        # --- Dead-Letter Exchange & Queue Setup ---
        # Declare the DLX (fanout so routing-key matching is not required).
        channel.exchange_declare(exchange='dlx_documents', exchange_type='fanout', durable=True)
        # Declare the DLQ and bind it to the DLX.
        channel.queue_declare(queue='dlq_documents', durable=True)
        channel.queue_bind(queue='dlq_documents', exchange='dlx_documents')
        logger.info("Dead-letter exchange 'dlx_documents' and queue 'dlq_documents' configured.")

        # Declare the main processing queue with the DLX argument so that
        # nacked (requeue=False) messages are automatically routed to dlq_documents.
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
