import resend from '../config/resend.js';

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
    await resend.emails.send({
        from: `${process.env.RESEND_EMAIL_SENDER}`,
        to: to,
        subject: subject,
        html: html
    });
}