const { isContactEmailConfigured, sendContactInquiryEmail } = require("../services/contactEmailService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value = "") => String(value).trim();
const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();

const submitContactInquiry = async (req, res, next) => {
  try {
    const name = normalizeText(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeText(req.body?.phone);
    const subject = normalizeText(req.body?.subject);
    const message = normalizeText(req.body?.message);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "Name, email, subject, and message are required.",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address.",
      });
    }

    if (!isContactEmailConfigured()) {
      return res.status(503).json({
        message: "Contact email is not configured yet. Add the SMTP settings before using this form.",
      });
    }

    await sendContactInquiryEmail({
      name,
      email,
      phone,
      subject,
      message,
    });

    return res.status(201).json({
      message: "Your message has been sent. We will get back to you soon.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitContactInquiry,
};
