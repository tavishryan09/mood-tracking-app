import { Resend } from 'resend';

// Lazy-load Resend only when email functions are called
let resend: Resend | null = null;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set. Email functionality is disabled.');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
const APP_NAME = process.env.APP_NAME || 'Time Tracking App';
const APP_URL = process.env.APP_URL || 'http://localhost:8081';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  try {
    const client = getResendClient();
    const data = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    console.log(`Email sent successfully to ${to}:`, data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendInviteEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  role: string
) => {
  const subject = `Welcome to ${APP_NAME}!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #6200ee;
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f5f5f5;
            padding: 30px 20px;
          }
          .card {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .credentials {
            background-color: #f9f9f9;
            border-left: 4px solid #6200ee;
            padding: 15px;
            margin: 20px 0;
          }
          .credentials p {
            margin: 8px 0;
          }
          .credentials strong {
            color: #6200ee;
          }
          .button {
            display: inline-block;
            background-color: #6200ee;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .role-badge {
            display: inline-block;
            background-color: #e3f2fd;
            color: #1976d2;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
          <div class="card">
            <h2>Welcome ${firstName} ${lastName}!</h2>
            <p>You've been invited to join ${APP_NAME} as a <span class="role-badge">${role}</span>.</p>

            <p>An administrator has created an account for you. You can log in using the credentials below:</p>

            <div class="credentials">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> ${password}</p>
            </div>

            <p><strong>⚠️ Important:</strong> For security reasons, please change your password after your first login.</p>

            <a href="${APP_URL}" class="button">Log In Now</a>

            <p style="margin-top: 30px;">If you have any questions, please contact your administrator.</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated email from ${APP_NAME}.</p>
          <p>If you did not expect this email, please contact your administrator.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  newPassword: string
) => {
  const subject = `Your Password Has Been Reset - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #6200ee;
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f5f5f5;
            padding: 30px 20px;
          }
          .card {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .credentials {
            background-color: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
          }
          .credentials p {
            margin: 8px 0;
          }
          .credentials strong {
            color: #ff9800;
          }
          .button {
            display: inline-block;
            background-color: #6200ee;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .warning {
            background-color: #ffebee;
            border-left: 4px solid #f44336;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
          <div class="card">
            <h2>Password Reset</h2>
            <p>Hi ${firstName},</p>

            <p>Your password has been reset by an administrator.</p>

            <div class="credentials">
              <p><strong>New Temporary Password:</strong> ${newPassword}</p>
            </div>

            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <p>Please change this password immediately after logging in to ensure your account security.</p>
            </div>

            <a href="${APP_URL}" class="button">Log In Now</a>

            <p style="margin-top: 30px;">If you did not request this password reset, please contact your administrator immediately.</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated email from ${APP_NAME}.</p>
          <p>For security reasons, never share your password with anyone.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
};
