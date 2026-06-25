import nodemailer from 'nodemailer';

// Production SMTP configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
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
    } catch (error) {
        console.error(`Failed to send email for claim ${claimID}. SMTP not configured or failed:`, error.message);
    }
};

const formatIcsDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
};

export const sendTaskScheduleEmail = async (clientEmail, title, description, dueDate, isRescheduled = false) => {
    try {
        const dDate = new Date(dueDate);
        const endDate = new Date(dDate.getTime() + 60 * 60 * 1000); // 1 hour later
        
        const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatIcsDate(dDate)}/${formatIcsDate(endDate)}&details=${encodeURIComponent(description || '')}`;
        
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SAKSHAM AI Support//EN',
            'BEGIN:VEVENT',
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${formatIcsDate(dDate)}`,
            `DTEND:${formatIcsDate(endDate)}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\\r\\n');

        const mailOptions = {
            from: '"SAKSHAM AI Support" <support@saksham.ai>',
            to: clientEmail,
            subject: isRescheduled ? `Rescheduled: ${title}` : `Scheduled: ${title}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hello,</h2>
                    <p>Your agent has ${isRescheduled ? 'rescheduled' : 'scheduled'} an event with you.</p>
                    <div style="padding: 15px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <h3>${title}</h3>
                        <p><strong>Time:</strong> ${dDate.toLocaleString()}</p>
                        <p>${description || ''}</p>
                    </div>
                    <p>
                        <a href="${googleCalUrl}" style="display: inline-block; background: #4285F4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Add to Google Calendar
                        </a>
                    </p>
                    <p style="font-size: 12px; color: #666;">Or use the attached .ics file for Apple Calendar and Outlook.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><strong>SAKSHAM AI Support Team</strong></p>
                </div>
            `,
            icalEvent: {
                filename: 'invite.ics',
                method: 'request',
                content: icsContent
            }
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Calendar invite sent to ${clientEmail}: %s`, info.messageId);
    } catch (error) {
        console.error(`Failed to send calendar invite to ${clientEmail}. SMTP not configured or failed:`, error.message);
    }
};
