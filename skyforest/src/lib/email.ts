import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailOptions {
  /** Override the From mailbox (e.g. support@skyforest.ai). Falls back to SMTP_FROM/SMTP_USER. */
  from?: string;
  /** Display name shown before the address (defaults to "Skyforest"). */
  fromName?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: SendEmailOptions = {},
) {
  const fromAddress =
    options.from || process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = options.fromName || "Skyforest";
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
  });
}
