import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface EmailDeliveryResult {
  delivered: boolean;
  messageId?: string;
  reason?: string;
  url: string;
  deepLink?: string;
}

export class EmailService {
  private static cachedTransporter: Transporter | null = null;

  /**
   * Checks whether real SMTP email delivery has been configured via environment variables.
   */
  static isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && (env.SMTP_USER || env.NODE_ENV === 'test'));
  }

  private static getTransporter(): Transporter | null {
    if (!this.isConfigured()) return null;
    if (!this.cachedTransporter) {
      this.cachedTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      });
    }
    return this.cachedTransporter;
  }

  /**
   * Sends a secure email verification link to a user.
   */
  static async sendVerificationEmail(
    to: string,
    name: string,
    token: string
  ): Promise<EmailDeliveryResult> {
    const verifyUrl = `${env.APP_URL}/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
    const deepLink = `${env.APP_DEEP_LINK_SCHEME}://auth/verify-email?token=${encodeURIComponent(token)}`;

    const transporter = this.getTransporter();
    if (!transporter) {
      logger.warn(
        `[EmailService] Verification email delivery skipped: SMTP credentials are not configured in environment. ` +
        `Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM. ` +
        `Target recipient: ${to}`
      );
      return {
        delivered: false,
        reason: 'SMTP_NOT_CONFIGURED',
        url: verifyUrl,
        deepLink,
      };
    }

    const subject = 'Verify your Decidix account / تأكيد حسابك في منصة ديسيدكس';
    const text = `Hello ${name},\n\nPlease verify your email address for Decidix by visiting the link below:\n${verifyUrl}\n\nAlternatively, open in the app: ${deepLink}\n\nThis verification link expires in 24 hours and can only be used once.\n\n---\nمرحباً ${name}،\n\nيرجى تأكيد بريدك الإلكتروني لمنصة ديسيدكس عبر الرابط أعلاه.\nهذا الرابط صالح لمدة 24 ساعة ويستخدم لمرة واحدة فقط.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin-bottom: 4px;">Decidix Smart National Platform</h2>
          <p style="color: #64748b; margin-top: 0;">منصة ديسيدكس الذكية لدعم القرار</p>
        </div>
        <p style="color: #334155; font-size: 16px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Thank you for registering on Decidix. To complete your account registration and access platform features, please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Verify Email Address / تأكيد البريد الإلكتروني
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This link expires in 24 hours and is single-use. If you did not create a Decidix account, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      logger.info('Verification email sent successfully', { to, messageId: info.messageId });
      return {
        delivered: true,
        messageId: info.messageId,
        url: verifyUrl,
        deepLink,
      };
    } catch (error: any) {
      logger.error('Failed to send verification email via SMTP', { to, error: error.message });
      return {
        delivered: false,
        reason: error.message || 'SMTP_SEND_FAILED',
        url: verifyUrl,
        deepLink,
      };
    }
  }

  /**
   * Sends a secure password reset link to a user.
   */
  static async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string
  ): Promise<EmailDeliveryResult> {
    const resetUrl = `${env.APP_URL}/v1/auth/reset-password?token=${encodeURIComponent(token)}`;
    const deepLink = `${env.APP_DEEP_LINK_SCHEME}://auth/reset-password?token=${encodeURIComponent(token)}`;

    const transporter = this.getTransporter();
    if (!transporter) {
      logger.warn(
        `[EmailService] Password reset email skipped: SMTP credentials are not configured in environment. ` +
        `Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM. ` +
        `Target recipient: ${to}`
      );
      return {
        delivered: false,
        reason: 'SMTP_NOT_CONFIGURED',
        url: resetUrl,
        deepLink,
      };
    }

    const subject = 'Reset your Decidix password / إعادة تعيين كلمة المرور لمنصة ديسيدكس';
    const text = `Hello ${name},\n\nA password reset request was requested for your Decidix account. Click the link below to set a new password:\n${resetUrl}\n\nThis single-use reset link expires in 1 hour.\n\n---\nمرحباً ${name}،\n\nتم طلب إعادة تعيين كلمة المرور لحسابك في منصة ديسيدكس. اضغط على الرابط أعلاه لتعيين كلمة مرور جديدة.\nهذا الرابط صالح لمدة ساعة واحدة ويستخدم لمرة واحدة فقط.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin-bottom: 4px;">Decidix Smart National Platform</h2>
          <p style="color: #64748b; margin-top: 0;">منصة ديسيدكس الذكية لدعم القرار</p>
        </div>
        <p style="color: #334155; font-size: 16px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your Decidix account. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Reset Password / إعادة تعيين كلمة المرور
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This link expires in 1 hour and is single-use. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      logger.info('Password reset email sent successfully', { to, messageId: info.messageId });
      return {
        delivered: true,
        messageId: info.messageId,
        url: resetUrl,
        deepLink,
      };
    } catch (error: any) {
      logger.error('Failed to send password reset email via SMTP', { to, error: error.message });
      return {
        delivered: false,
        reason: error.message || 'SMTP_SEND_FAILED',
        url: resetUrl,
        deepLink,
      };
    }
  }
}
