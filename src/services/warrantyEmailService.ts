import nodemailer from 'nodemailer';
import { PromptTemplate } from '@langchain/core/prompts';
import { GoogleGenAI } from '@google/genai';
import { PurchaseItem } from '../types';

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
      rejectUnauthorized: false,
    },
  });
}

/**
 * LangChain Prompt Template for composing a personalized, high-precision warranty expiry email notice.
 */
const warrantyEmailPrompt = PromptTemplate.fromTemplate(`
You are Keepr's Automated Warranty Intelligence Agent.
Compose a concise, professional HTML email alerting a user that their product warranty is expiring very soon.

Product Details:
- Product Name: {name}
- Vendor / Store: {vendor}
- Purchase Date: {purchaseDate}
- Warranty Expiry Date: {expiryDate}
- Days Remaining: {daysLeft} days
- Serial / Order ID: {serialNumber}
- Warranty Terms Summary: {warrantyTerms}

Design & Email Structure Requirements:
1. Return ONLY clean, valid HTML code inside a <div> container (do not include markdown block ticks like \`\`\`html).
2. Use a modern, sleek design with a slate blue header, bold typography, and a highlighted callout box for the expiration date.
3. Include clear bullet points summarizing:
   - What to check before coverage ends (hardware diagnostics, display, power ports, etc.).
   - Instructions on how to file a claim with {vendor} if any issues are detected.
4. Keep the tone urgent yet helpful and reassuring.
5. Include a closing signature from "Keepr Automated Asset Protection".
`);

/**
 * Generate a custom HTML email via LangChain PromptTemplate & Google AI Studio, then send via Nodemailer SMTP.
 */
export async function sendWarrantyExpiryAlert(
  purchase: PurchaseItem,
  recipientEmail: string = 'khanasifshamshul@gmail.com',
  customDaysLeft?: number
): Promise<{ success: boolean; emailId?: string; error?: string; message?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    
    // Calculate actual real days remaining
    let daysLeft = customDaysLeft;
    if (daysLeft === undefined || daysLeft === null) {
      const expiryStr = purchase.warranty?.expiryDate || purchase.returnWindow?.deadlineDate;
      if (expiryStr) {
        const expiryDate = new Date(expiryStr);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        daysLeft = 30;
      }
    }

    let htmlContent = '';

    // Format prompt using LangChain PromptTemplate
    const formattedPrompt = await warrantyEmailPrompt.format({
      name: purchase.name,
      vendor: purchase.vendor,
      purchaseDate: purchase.purchaseDate,
      expiryDate: purchase.warranty?.expiryDate || 'Expiring Soon',
      daysLeft: daysLeft.toString(),
      serialNumber: purchase.serialNumber || purchase.orderNumber || 'Recorded in Keepr',
      warrantyTerms: purchase.warranty?.terms || 'Standard limited manufacturer hardware warranty.',
    });

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const tryModels = [
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
        ];
        let responseText = '';

        for (const m of tryModels) {
          try {
            const res = await ai.models.generateContent({
              model: m,
              contents: formattedPrompt,
            });
            if (res.text) {
              responseText = res.text;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[LangChain Model ${m} busy/unavailable]:`, modelErr.message);
          }
        }

        if (responseText) {
          htmlContent = responseText.replace(/```html/g, '').replace(/```/g, '').trim();
        }
      } catch (genErr: any) {
        console.warn('[LangChain Prompt Generation Notice]:', genErr.message);
      }
    }

    // Fallback HTML template if LangChain is bypassed or offline
    if (!htmlContent) {
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0F172A; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Warranty Expiration Notice</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8;">Keepr Asset & Protection Intelligence</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Your warranty for <strong>${purchase.name}</strong> from <strong>${purchase.vendor}</strong> is set to expire in <strong style="color: #DC2626;">${daysLeft} days</strong> (Expiration Date: ${purchase.warranty?.expiryDate}).</p>
            <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px; border-radius: 8px; margin: 18px 0;">
              <strong style="color: #991B1B;">Action Recommended:</strong> Inspect all device ports, screen functions, and power adapters before your coverage officially ends.
            </div>
            <ul style="padding-left: 20px; color: #475569;">
              <li><strong>Item:</strong> ${purchase.name}</li>
              <li><strong>Serial Number:</strong> ${purchase.serialNumber || 'Recorded in Keepr Vault'}</li>
              <li><strong>Vendor:</strong> ${purchase.vendor}</li>
            </ul>
            <p style="font-size: 12px; color: #64748B; margin-top: 24px;">Sent automatically by Keepr Automated Warranty Intelligence.</p>
          </div>
        </div>
      `;
    }

    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Keepr Warranty Intelligence" <${process.env.SMTP_USER || 'khanasifshamshul@gmail.com'}>`;

    const mailOptions = {
      from: fromAddress,
      to: recipientEmail,
      subject: `🚨 Warranty Expiring Soon (${daysLeft} Days Remaining): ${purchase.name}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      emailId: info.messageId,
      message: `Warranty alert email successfully sent via Nodemailer SMTP (ID: ${info.messageId})`,
    };
  } catch (error: any) {
    console.error('Error sending warranty expiry email via Nodemailer:', error);
    return {
      success: false,
      error: error.message || 'Error executing Nodemailer SMTP email service',
    };
  }
}
