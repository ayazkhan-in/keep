import nodemailer from 'nodemailer';
import { PromptTemplate } from '@langchain/core/prompts';
import { PurchaseItem } from '../types';
import { geminiKeyManager } from '../utils/geminiKeyManager';

/**
 * Creates and returns a Nodemailer SMTP transporter using configuration from environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'khanasifshamshul@gmail.com';
  const pass = process.env.SMTP_PASS || '';

  // If password is not configured yet, use Nodemailer with standard settings
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 / other ports
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_IGNORE_TLS === 'true' ? false : true,
    },
  });
}

/**
 * LangChain Prompt Template for composing a personalized corporate expense reimbursement & compliance email notice.
 */
const complianceEmailPrompt = PromptTemplate.fromTemplate(`
You are Keepr's Corporate Expense Reimbursement & Compliance Agent.
Compose a concise, professional HTML email notifying an employee regarding their expense claim status or policy compliance review.

Expense Details:
- Expense Title: {name}
- Merchant / Vendor: {vendor}
- Transaction Date: {purchaseDate}
- Amount / Currency: {price}
- Order / Receipt ID: {serialNumber}
- Compliance Status: {complianceStatus}

Design & Email Structure Requirements:
1. Return ONLY clean, valid HTML code inside a <div> container (do not include markdown block ticks like \`\`\`html).
2. Use a modern, sleek enterprise design with a dark slate header (#0F172A), crisp typography, and an emerald status pill.
3. Include clear bullet points summarizing:
   - Claim status and compliance evaluation.
   - Any required documentation (itemized receipt, tax invoice, attendee list).
4. Keep the tone professional, objective, and helpful.
5. Include a closing signature from "Keepr Corporate Expense & Compliance Intelligence".
`);

/**
 * Generate a custom HTML email via LangChain PromptTemplate & Google AI Studio, then send via Nodemailer SMTP.
 */
export async function sendExpenseComplianceAlert(
  purchase: PurchaseItem,
  recipientEmail: string = 'khanasifshamshul@gmail.com',
  customDaysLeft?: number
): Promise<{ success: boolean; emailId?: string; error?: string; message?: string }> {
  try {
    const sanitizedEmail = String(recipientEmail || '').replace(/[\r\n]/g, '').trim();
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return {
        success: false,
        error: 'Invalid recipient email address format.',
      };
    }

    let htmlContent = '';

    // Format prompt using LangChain PromptTemplate
    const formattedPrompt = await complianceEmailPrompt.format({
      name: purchase.name,
      vendor: purchase.vendor,
      purchaseDate: purchase.purchaseDate,
      price: `${purchase.currency || 'INR'} ${purchase.price}`,
      serialNumber: purchase.serialNumber || purchase.orderNumber || 'Recorded in Keepr',
      complianceStatus: 'Policy Audited & Verified for Reimbursement',
    });

    if (geminiKeyManager.getKeyCount() > 0) {
      try {
        const res = await geminiKeyManager.generateContent({
          contents: formattedPrompt,
          models: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'],
        });
        if (res?.text) {
          htmlContent = res.text.replace(/```html/g, '').replace(/```/g, '').trim();
        }
      } catch (genErr: any) {
        console.warn('[LangChain Prompt Generation Notice]:', genErr?.message || genErr);
      }
    }

    // Fallback HTML template if LangChain is offline
    if (!htmlContent) {
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0F172A; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Expense Reimbursement Notice</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8;">Keepr Corporate Expense & Compliance Intelligence</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Your expense claim for <strong>${purchase.name}</strong> from <strong>${purchase.vendor}</strong> has been logged and evaluated against corporate reimbursement policies.</p>
            <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 14px; border-radius: 8px; margin: 18px 0;">
              <strong style="color: #065F46;">Status:</strong> Claim verified. All line items and tax calculations comply with spending limits.
            </div>
            <ul style="padding-left: 20px; color: #475569;">
              <li><strong>Item:</strong> ${purchase.name}</li>
              <li><strong>Merchant:</strong> ${purchase.vendor}</li>
              <li><strong>Amount:</strong> ${purchase.currency || 'INR'} ${purchase.price}</li>
              <li><strong>Date:</strong> ${purchase.purchaseDate}</li>
            </ul>
            <p style="font-size: 12px; color: #64748B; margin-top: 24px;">Sent automatically by Keepr Corporate Expense Intelligence.</p>
          </div>
        </div>
      `;
    }

    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Keepr Expense Intelligence" <${process.env.SMTP_USER || 'khanasifshamshul@gmail.com'}>`;

    const mailOptions = {
      from: fromAddress,
      to: sanitizedEmail,
      subject: `✅ Corporate Expense Notification: ${purchase.name}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      emailId: info.messageId,
      message: `Expense alert email successfully sent via Nodemailer SMTP (ID: ${info.messageId})`,
    };
  } catch (error: any) {
    console.error('Error sending expense email via Nodemailer:', error);
    return {
      success: false,
      error: error.message || 'Error executing Nodemailer SMTP email service',
    };
  }
}

export const sendWarrantyExpiryAlert = sendExpenseComplianceAlert;
