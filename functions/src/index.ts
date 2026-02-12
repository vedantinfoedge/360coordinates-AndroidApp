import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as cors from "cors";

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, you may need to use an App Password if 2FA is enabled.
// Configuration:
// firebase functions:config:set gmail.email="your-email@gmail.com" gmail.password="your-app-password"

// Helper to get transporter
const getTransporter = () => {
    const gmailEmail = functions.config().gmail?.email;
    const gmailPassword = functions.config().gmail?.password;

    if (!gmailEmail || !gmailPassword) {
        console.error("Missing gmail config. Run: firebase functions:config:set gmail.email=\"...\" gmail.password=\"...\"");
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailEmail,
            pass: gmailPassword,
        },
    });
};

export const sendContactEmail = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Validation
    const { name, email, subject, message } = data;

    if (!name || !email || !message) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with arguments 'name', 'email', and 'message'."
        );
    }

    // 2. Setup Transporter
    const transporter = getTransporter();
    if (!transporter) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Server email configuration is missing."
        );
    }

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: "info@360coordinates.com",
        subject: subject || `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully!" };
    } catch (error) {
        console.error("Error sending email:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Unable to send email. Please try again later."
        );
    }
});
