const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;
const fromEmail = process.env.SMTP_FROM || 'noreply@ems.institution.edu';

let transporter = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: smtpPort === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[SMTP DEV MODE - NOT SENT]: Email to ${to} | Subject: "${subject}" | Content: ${text || html?.substring(0, 100)}...`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR]: Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
};
