import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

const emailWrapper = (content: string) => `
  <div style="font-family: ${FONT_STACK}; background-color: #f0f4ff; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto;">

      <!-- Header -->
      <div style="background-color: #1e3a8a; border-radius: 8px 8px 0 0; padding: 20px 32px;">
        <span style="color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.01em;">
          Hospital Management System
        </span>
      </div>

      <!-- Body -->
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 16px 32px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #475569; line-height: 16px;">
          This email was sent by Hospital Management System. If you have questions, contact your system administrator.
        </p>
      </div>

    </div>
  </div>
`;

const ctaButton = (href: string, label: string) =>
  `<div style="text-align: center; margin: 24px 0;">
    <a href="${href}"
       style="display: inline-block; background-color: #1d4ed8; color: #ffffff;
              font-family: ${FONT_STACK}; font-size: 14px; font-weight: 500;
              padding: 12px 28px; border-radius: 8px; text-decoration: none;
              letter-spacing: 0.01em;">
      ${label}
    </a>
  </div>`;

const fallbackLink = (href: string) =>
  `<p style="font-size: 12px; color: #475569; margin-top: 8px;">
    If the button doesn't work, copy and paste this link into your browser:<br/>
    <a href="${href}" style="color: #1d4ed8; word-break: break-all;">${href}</a>
  </p>`;

/**
 * Send an email
 */
const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Hospital Management" <no-reply@hospital-management.com>',
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (
  to: string,
  verificationToken: string
): Promise<boolean> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const body = `
    <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #0f172a;">
      Verify your email address
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 20px;">
      Thank you for registering. Please verify your email address to activate your account.
    </p>
    ${ctaButton(verificationUrl, 'Verify Email')}
    ${fallbackLink(verificationUrl)}
    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; line-height: 16px;">
      This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  `;

  return sendEmail({
    to,
    subject: 'Verify your email — Hospital Management System',
    text: `Please verify your email address: ${verificationUrl} (expires in 24 hours)`,
    html: emailWrapper(body),
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string
): Promise<boolean> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const body = `
    <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #0f172a;">
      Reset your password
    </h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 20px;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${ctaButton(resetUrl, 'Reset Password')}
    ${fallbackLink(resetUrl)}
    <div style="margin-top: 24px; padding: 12px 16px; background-color: #fef3c7;
                border-left: 3px solid #d97706; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 16px;">
        This link expires in 1 hour. If you did not request a password reset, please ignore this email — your password will not change.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset your password — Hospital Management System',
    text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
    html: emailWrapper(body),
  });
};

export default sendEmail;