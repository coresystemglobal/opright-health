import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email
 */
const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
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
  
  const emailPayload: EmailPayload = {
    to,
    subject: 'Email Verification - Hospital Management System',
    text: `Please verify your email address by clicking on the link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Hospital Management System</h2>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't register for an account, you can safely ignore this email.</p>
      </div>
    `,
  };

  return sendEmail(emailPayload);
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
  
  const emailPayload: EmailPayload = {
    to,
    subject: 'Password Reset - Hospital Management System',
    text: `Reset your password by clicking on the link: ${resetUrl}. This link will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Hospital Management System</h2>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  };

  return sendEmail(emailPayload);
};

export default sendEmail;