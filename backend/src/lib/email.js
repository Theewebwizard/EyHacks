import nodemailer from 'nodemailer';

// Mock SMTP configuration using Ethereal Email for local development
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
        user: process.env.SMTP_USER || 'lennie.collier79@ethereal.email', // Replace with generated ethereal user
        pass: process.env.SMTP_PASS || '6n9P5nKzP11QYdEwKp' // Replace with generated ethereal password
    }
});

export const sendClaimUpdateEmail = async (clientEmail, clientName, claimID, updateMessage) => {
    try {
        const mailOptions = {
            from: '"SAKSHAM AI Support" <support@saksham.ai>',
            to: clientEmail,
            subject: `Update on your Claim: ${claimID}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hello ${clientName},</h2>
                    <p>There is an update regarding your claim (<strong>${claimID}</strong>).</p>
                    <p style="padding: 15px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        ${updateMessage}
                    </p>
                    <p>You can track the live status anytime by logging into the <a href="http://localhost:5173/client/login">Client Portal</a>.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><strong>SAKSHAM AI Support Team</strong></p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent for claim ${claimID}: %s`, info.messageId);
        console.log(`Preview URL: %s`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error(`Failed to send email for claim ${claimID}:`, error);
    }
};
