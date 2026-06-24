import amqp from 'amqplib';

let channel = null;

export const connectRabbitMQ = async (io) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        channel = await connection.createChannel();
        await channel.assertQueue('document_processing', { durable: true });
        await channel.assertQueue('verification_results', { durable: true });
        console.log("Connected to RabbitMQ");

        // Setup consumer for verification results
        channel.consume('verification_results', (msg) => {
            if (msg !== null) {
                try {
                    const result = JSON.parse(msg.content.toString());
                    console.log("Received verification result:", result);
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
