const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

const transporter = createTransporter();

/**
 * Sends an email to a single recipient or multiple BCC recipients.
 * @param {string|string[]} to - Recipient email(s). If array, they are sent as BCC.
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 */
const sendEmail = async (to, subject, text) => {
  try {
    const isArray = Array.isArray(to);
    const bccList = isArray ? to.filter(Boolean).join(',') : '';
    const toAddr = isArray ? process.env.SMTP_FROM || 'noreply@school-erp.com' : to;

    if (!transporter) {
      console.log('=====================================================');
      console.log('📬 [EMAIL SERVICE MOCK] SMTP not configured.');
      console.log(`TO: ${toAddr}`);
      if (isArray && bccList) console.log(`BCC: ${bccList}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`BODY:\n${text}`);
      console.log('=====================================================');
      return true;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"School ERP" <noreply@school-erp.com>',
      to: toAddr,
      subject,
      text,
    };

    if (isArray && bccList) {
      mailOptions.bcc = bccList;
    }

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
};

module.exports = {
  sendEmail,
};
