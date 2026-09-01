const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const isEnabled = process.env.ENABLE_EMAIL_DISPATCH === 'true';
    
    if (isEnabled && process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // In-memory or stub transporter for development
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('[MAILER STUB] Email dispatch simulated:');
          console.log(`  To: ${mailOptions.to}`);
          console.log(`  Subject: ${mailOptions.subject}`);
          console.log(`  Preview: ${mailOptions.text ? mailOptions.text.slice(0, 100) : 'HTML content'}...`);
          return { messageId: `mock-${Date.now()}` };
        }
      };
    }
  }
  return transporter;
}

/**
 * Send alert email to student and supervisor
 * @param {Object} options { to, subject, html, text }
 */
async function sendAlertEmail({ to, subject, html, text }) {
  try {
    const mail = getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ML-SPMS UNICAL" <alerts@cs.unical.edu.ng>',
      to,
      subject,
      text,
      html
    };

    const info = await mail.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to dispatch alert email:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getTransporter,
  sendAlertEmail
};
