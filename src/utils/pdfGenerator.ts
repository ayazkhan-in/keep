import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice } from '../types';

/**
 * Generate and download a high-resolution PDF of an invoice from an HTML element.
 */
export async function generateInvoicePdfFromElement(
  element: HTMLElement,
  invoiceNumber: string = 'Invoice'
): Promise<Blob> {
  // Ensure the element is rendered and visible
  const canvas = await html2canvas(element, {
    scale: 2, // 2x scale for sharp text and crisp lines
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF',
    windowWidth: 800,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Add extra pages if invoice is longer than single page
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const safeFilename = `${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  pdf.save(safeFilename);

  return pdf.output('blob');
}

/**
 * Fallback programmatic PDF generator using jsPDF text & vector drawing
 * in case DOM capturing is not available or user triggers quick programmatic export.
 */
export function generateProgrammaticPdf(invoice: Invoice): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(invoice.sender.companyName || invoice.sender.name || 'INVOICE', margin, y);

  // Status Badge on top right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusText = invoice.status.toUpperCase();
  const statusX = pageWidth - margin - 80;
  doc.setFillColor(
    invoice.status === 'paid'
      ? 220
      : invoice.status === 'overdue'
      ? 254
      : 241,
    invoice.status === 'paid'
      ? 252
      : invoice.status === 'overdue'
      ? 226
      : 245,
    invoice.status === 'paid'
      ? 231
      : invoice.status === 'overdue'
      ? 226
      : 249
  );
  doc.roundedRect(statusX, y - 14, 80, 20, 4, 4, 'F');
  doc.setTextColor(
    invoice.status === 'paid'
      ? 22
      : invoice.status === 'overdue'
      ? 185
      : 71,
    invoice.status === 'paid'
      ? 101
      : invoice.status === 'overdue'
      ? 28
      : 85,
    invoice.status === 'paid'
      ? 52
      : invoice.status === 'overdue'
      ? 28
      : 105
  );
  doc.text(statusText, statusX + 40, y, { align: 'center' });

  y += 24;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (invoice.sender.email) doc.text(`Email: ${invoice.sender.email}`, margin, y);
  if (invoice.sender.phone) doc.text(`Phone: ${invoice.sender.phone}`, margin, (y += 12));
  if (invoice.sender.address) {
    const addressLine = [invoice.sender.address, invoice.sender.city, invoice.sender.state, invoice.sender.zip]
      .filter(Boolean)
      .join(', ');
    doc.text(addressLine, margin, (y += 12));
  }
  if (invoice.sender.taxId) doc.text(`Tax ID: ${invoice.sender.taxId}`, margin, (y += 12));

  // Invoice Number & Dates (Right side)
  let rightY = 74;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice #${invoice.invoiceNumber}`, pageWidth - margin, rightY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date: ${invoice.issueDate}`, pageWidth - margin, (rightY += 14), { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, pageWidth - margin, (rightY += 14), { align: 'right' });
  if (invoice.paymentTerms) {
    doc.text(`Terms: ${invoice.paymentTerms}`, pageWidth - margin, (rightY += 14), { align: 'right' });
  }

  y = Math.max(y, rightY) + 30;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 20;

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', margin, y);

  y += 14;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client.companyName || invoice.client.name, margin, y);

  if (invoice.client.companyName && invoice.client.name) {
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Attn: ${invoice.client.name}`, margin, y);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (invoice.client.email) doc.text(invoice.client.email, margin, (y += 12));
  if (invoice.client.address) {
    const clientAddr = [invoice.client.address, invoice.client.city, invoice.client.state, invoice.client.zip]
      .filter(Boolean)
      .join(', ');
    doc.text(clientAddr, margin, (y += 12));
  }
  if (invoice.client.taxId) doc.text(`Tax ID: ${invoice.client.taxId}`, margin, (y += 12));

  y += 24;

  // Table Header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION', margin + 8, y + 15);
  doc.text('QTY', pageWidth - margin - 220, y + 15, { align: 'right' });
  doc.text('RATE', pageWidth - margin - 130, y + 15, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 8, y + 15, { align: 'right' });

  y += 24;

  // Line Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  invoice.items.forEach((item) => {
    y += 18;
    const descLines = doc.splitTextToSize(item.description, pageWidth - margin * 2 - 250);
    doc.text(descLines, margin + 8, y);
    doc.text(String(item.quantity), pageWidth - margin - 220, y, { align: 'right' });
    doc.text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, pageWidth - margin - 130, y, { align: 'right' });
    doc.text(`${invoice.currency} ${item.amount.toFixed(2)}`, pageWidth - margin - 8, y, { align: 'right' });

    y += (descLines.length - 1) * 10 + 6;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, pageWidth - margin, y);
  });

  y += 20;

  // Totals Breakdown
  const totalsX = pageWidth - margin - 180;
  const valuesX = pageWidth - margin - 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  doc.text('Subtotal:', totalsX, y);
  doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, valuesX, y, { align: 'right' });

  if (invoice.discountTotal > 0) {
    y += 14;
    doc.text('Discount:', totalsX, y);
    doc.text(`-${invoice.currency} ${invoice.discountTotal.toFixed(2)}`, valuesX, y, { align: 'right' });
  }

  if (invoice.taxTotal > 0) {
    y += 14;
    doc.text('Tax / VAT:', totalsX, y);
    doc.text(`+${invoice.currency} ${invoice.taxTotal.toFixed(2)}`, valuesX, y, { align: 'right' });
  }

  if (invoice.shippingFee && invoice.shippingFee > 0) {
    y += 14;
    doc.text('Shipping / Fee:', totalsX, y);
    doc.text(`+${invoice.currency} ${invoice.shippingFee.toFixed(2)}`, valuesX, y, { align: 'right' });
  }

  y += 18;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(totalsX - 10, y - 6, pageWidth - margin, y - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', totalsX, y + 6);
  doc.text(`${invoice.currency} ${invoice.grandTotal.toFixed(2)}`, valuesX, y + 6, { align: 'right' });

  if (invoice.amountPaid > 0) {
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('Amount Paid:', totalsX, y);
    doc.text(`-${invoice.currency} ${invoice.amountPaid.toFixed(2)}`, valuesX, y, { align: 'right' });

    y += 16;
    doc.setTextColor(15, 23, 42);
    doc.text('Balance Due:', totalsX, y);
    doc.text(`${invoice.currency} ${invoice.balanceDue.toFixed(2)}`, valuesX, y, { align: 'right' });
  }

  // Payment Details & Notes footer
  y += 35;
  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    y = 50;
  }

  if (invoice.paymentDetails?.bankName || invoice.paymentDetails?.accountNumber || invoice.notes) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 6, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT INSTRUCTIONS & NOTES', margin + 12, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    let infoY = y + 30;
    if (invoice.paymentDetails?.bankName) {
      doc.text(`Bank: ${invoice.paymentDetails.bankName} | Account: ${invoice.paymentDetails.accountNumber || 'N/A'} | Routing/SWIFT: ${invoice.paymentDetails.routingNumber || 'N/A'}`, margin + 12, infoY);
      infoY += 12;
    }
    if (invoice.paymentDetails?.paypalEmail) {
      doc.text(`PayPal: ${invoice.paymentDetails.paypalEmail}`, margin + 12, infoY);
      infoY += 12;
    }
    if (invoice.notes) {
      doc.text(`Note: ${invoice.notes}`, margin + 12, infoY);
    }
  }

  const safeFilename = `${(invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(safeFilename);
}
