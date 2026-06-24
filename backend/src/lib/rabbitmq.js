import amqp from 'amqplib';
import Claim from '../models/claim.model.js';
import { sendClaimUpdateEmail } from './email.js';

let channel = null;

export const connectRabbitMQ = async (io) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        channel = await connection.createChannel();
        await channel.assertQueue('document_processing', { durable: true });
        await channel.assertQueue('verification_results', { durable: true });
        console.log("Connected to RabbitMQ");

        // Setup consumer for verification results
        channel.consume('verification_results', async (msg) => {
            if (msg !== null) {
                try {
                    const result = JSON.parse(msg.content.toString());
                    console.log("Received verification result:", result);
                    
                    // The result contains claimID, status, and the crewAI output
                    // Let's determine verification_status based on CrewAI output.
                    // For demo, we parse 'Approved' or 'Rejected' from the text
                    let validationStatus = 'Verified';
                    if (result.result && result.result.includes('Rejected')) {
                        validationStatus = 'Rejected';
                    }

                    // Update the claim in MongoDB
                    const claim = await Claim.findOne({ claimID: result.claimID });
                    if (claim) {
                        claim.validation_status = validationStatus;
                        await claim.save();

                        // Send Email Notification
                        await sendClaimUpdateEmail(
                            claim.clientEmail,
                            claim.clientName,
                            claim.claimID,
                            `Your document verification has been completed. Status: ${validationStatus}.`
                        );
                    }

                    // Emit to frontend clients via Socket.IO
                    io.emit('verification_update', result);
                    channel.ack(msg);
                } catch (err) {
                    console.error("Error processing verification result:", err);
                    channel.nack(msg, false, false);
                }
            }
        });

    } catch (error) {
        console.error("RabbitMQ connection error:", error);
    }
};

export const getChannel = () => {
    return channel;
};
