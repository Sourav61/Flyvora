const nodemailer = require("nodemailer");

const DEFAULT_CONTACT_RECEIVER_EMAIL = "flyvora18@gmail.com";

let transporter;
let transporterKey = "";

const normalizeText = (value = "") => String(value).trim();

const toBoolean = (value = "") => String(value).trim().toLowerCase() === "true";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getContactMailConfig = () => {
  const host = normalizeText(process.env.CONTACT_SMTP_HOST);
  const port = Number(process.env.CONTACT_SMTP_PORT || 0);
  const secure = toBoolean(process.env.CONTACT_SMTP_SECURE || (port === 465 ? "true" : "false"));
  const user = normalizeText(process.env.CONTACT_SMTP_USER);
  const pass = normalizeText(process.env.CONTACT_SMTP_PASS);
  const from = normalizeText(process.env.CONTACT_FROM_EMAIL || user);
  const to = normalizeText(process.env.CONTACT_RECEIVER_EMAIL || DEFAULT_CONTACT_RECEIVER_EMAIL);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
  };
};

const isContactEmailConfigured = () => {
  const { host, port, user, pass, from, to } = getContactMailConfig();
  return Boolean(host && port && user && pass && from && to);
};

const getTransporter = () => {
  const { host, port, secure, user, pass } = getContactMailConfig();
  const nextTransporterKey = JSON.stringify({ host, port, secure, user });

  if (!transporter || transporterKey !== nextTransporterKey) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    transporterKey = nextTransporterKey;
  }

  return transporter;
};

const sendContactInquiryEmail = async ({ name, email, phone, subject, message }) => {
  const { from, to } = getContactMailConfig();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");

  try {
    await getTransporter().sendMail({
      from: `Flyvora Contact <${from}>`,
      to,
      replyTo: email,
      subject: `[Flyvora Contact] ${subject}`,
      text: [
        "New message from the Flyvora contact page",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Subject: ${subject}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #191c1e; line-height: 1.6;">
          <h2 style="margin-bottom: 16px;">New message from the Flyvora contact page</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong><br />${safeMessage}</p>
        </div>
      `,
    });
  } catch (error) {
    error.statusCode = 502;
    error.message = "We could not deliver your message right now. Please verify the contact email settings.";
    throw error;
  }
};

module.exports = {
  isContactEmailConfigured,
  sendContactInquiryEmail,
};
