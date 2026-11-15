import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

export const initTransporter = () => {
  if (transporter) return transporter;

  if (env.SMTP_USER && env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT, 10),
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      console.log('Nodemailer SMTP Transporter initialized successfully.');
      return transporter;
    } catch (err) {
      console.warn('Failed to initialize SMTP transporter:', err.message);
    }
  }

  // Fallback logger transporter for testing / dev without crashing
  transporter = {
    sendMail: async (mailOptions) => {
      console.log(`[Email Simulated] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
      return { messageId: `mock_${Date.now()}` };
    },
  };
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transport = initTransporter();
    const mailOptions = {
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || subject,
    };
    const info = await transport.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Error] Failed to send to ${to}:`, err.message);
    // Never crash the server on email delivery failure
    return { success: false, error: err.message };
  }
};

// Responsive HTML Email Templates with high legibility
const baseEmailWrapper = (content, previewText = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareCircle Health Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #059669; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 32px 28px; }
    .card { background: #f0fdf4; border-radius: 14px; border: 1px solid #bbf7d0; padding: 20px; margin: 20px 0; }
    .alert-card { background: #fff1f2; border-radius: 14px; border: 1px solid #fecdd3; padding: 20px; margin: 20px 0; }
    .info-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 2px; }
    .info-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; text-align: center; margin: 20px 0 10px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CareCircle</h1>
      <p>Never miss a dose. Never miss a moment.</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      This automated alert was sent to authorized circle members of CareCircle.<br>
      AI and notifications do not replace medical advice.
    </div>
  </div>
</body>
</html>
`;

export const getUpcomingDoseHtml = ({ elderlyName, medicineName, dosage, time, mealRelation, appUrl }) => baseEmailWrapper(`
  <h2 style="margin-top:0; font-size: 22px; color: #0f172a;">Upcoming Dose Reminder</h2>
  <p style="font-size: 16px; color: #334155;">
    A scheduled dose for <strong>${elderlyName}</strong> is due in 10 minutes.
  </p>
  <div class="card">
    <div class="info-label">Medication</div>
    <div class="info-value">${medicineName} (${dosage})</div>
    <div class="info-label">Scheduled Time</div>
    <div class="info-value">${time}</div>
    <div class="info-label">Instructions</div>
    <div style="font-size: 15px; font-weight: 600; color: #059669;">${mealRelation ? mealRelation.replace('_', ' ') : 'Anytime'}</div>
  </div>
  <center>
    <a href="${appUrl}" class="btn">View & Mark Taken</a>
  </center>
`);

export const getMissedDoseHtml = ({ elderlyName, medicineName, dosage, time, appUrl }) => baseEmailWrapper(`
  <h2 style="margin-top:0; font-size: 22px; color: #e11d48;">Attention: Missed Dose Alert</h2>
  <p style="font-size: 16px; color: #334155;">
    <strong>${elderlyName}</strong> has not logged their scheduled medication dose after 30 minutes.
  </p>
  <div class="alert-card">
    <div class="info-label" style="color:#be123c;">Missed Medication</div>
    <div class="info-value" style="color:#9f1239;">${medicineName} (${dosage})</div>
    <div class="info-label" style="color:#be123c;">Scheduled Time</div>
    <div class="info-value" style="color:#9f1239;">${time}</div>
    <p style="margin: 0; font-size: 13px; color: #be123c;">
      Please call or coordinate with circle members to ensure this dose was not forgotten.
    </p>
  </div>
  <center>
    <a href="${appUrl}" class="btn" style="background:#e11d48;">I'm Handling This</a>
  </center>
`);

export const getAppointmentReminderHtml = ({ elderlyName, doctor, specialty, time, location, appUrl, timeframe }) => baseEmailWrapper(`
  <h2 style="margin-top:0; font-size: 22px; color: #0f172a;">Upcoming Doctor Appointment (${timeframe})</h2>
  <p style="font-size: 16px; color: #334155;">
    Doctor visit for <strong>${elderlyName}</strong> scheduled in ${timeframe}.
  </p>
  <div class="card" style="background:#eff6ff; border-color:#bfdbfe;">
    <div class="info-label">Doctor</div>
    <div class="info-value" style="color:#1e3a8a;">${doctor} (${specialty})</div>
    <div class="info-label">Date & Time</div>
    <div class="info-value" style="color:#1e3a8a;">${time}</div>
    <div class="info-label">Location / Clinic</div>
    <div style="font-size: 15px; font-weight: 600; color: #2563eb;">${location}</div>
  </div>
  <center>
    <a href="${appUrl}" class="btn" style="background:#2563eb;">View & Accompany</a>
  </center>
`);

export const getDailySummaryHtml = ({ elderlyName, takenCount, missedCount, appUrl }) => baseEmailWrapper(`
  <h2 style="margin-top:0; font-size: 22px; color: #0f172a;">Daily CareCircle Health Summary</h2>
  <p style="font-size: 16px; color: #334155;">
    Here is the daily healthcare summary for <strong>${elderlyName}</strong>.
  </p>
  <div class="card">
    <div style="display:flex; justify-content:space-between; margin-bottom: 12px;">
      <div>
        <div class="info-label">Doses Taken</div>
        <div class="info-value" style="color:#059669;">${takenCount}</div>
      </div>
      <div>
        <div class="info-label">Doses Missed</div>
        <div class="info-value" style="color:${missedCount > 0 ? '#e11d48' : '#64748b'};">${missedCount}</div>
      </div>
    </div>
  </div>
  <center>
    <a href="${appUrl}" class="btn">Open CareCircle Dashboard</a>
  </center>
`);

export const getSosAlertHtml = ({ elderlyName, senderName, time, appUrl, phone }) => baseEmailWrapper(`
  <h2 style="margin-top:0; font-size: 24px; color: #e11d48;">EMERGENCY SOS ALERT</h2>
  <p style="font-size: 17px; font-weight:bold; color: #9f1239;">
    ${elderlyName} or a circle member triggered an Emergency SOS signal at ${time}.
  </p>
  <div class="alert-card">
    <p style="margin:0 0 10px 0; font-size:15px; color:#be123c;">
      Triggered by: <strong>${senderName}</strong>
    </p>
    ${phone ? `<p style="margin:0; font-size:15px; color:#be123c;">Phone: <strong>${phone}</strong></p>` : ''}
  </div>
  <center>
    <a href="${appUrl}" class="btn" style="background:#be123c; font-size:18px; padding: 16px 32px;">
      Open CareCircle & Call Family
    </a>
  </center>
`);
