// src/lib/email.ts — Org-aware email sending via Resend
import { Resend } from 'resend';
import { getOrgConfig } from '@/lib/tenant';
import { generateReceiptPDF, generateCertificatePDF } from '@/lib/pdf';
import { htmlToPdfBuffer } from '@/lib/generate-pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

async function getOrgEmail(orgId?: string) {
  if (orgId) {
    try {
      const org = await getOrgConfig(orgId);
      if (org) return {
        name:  org.name,
        email: org.email || process.env.FROM_EMAIL || 'onboarding@resend.dev',
        phone: org.phone || null,
        address: org.address || null,
        org80gNumber: org.org80gNumber || null,
      };
    } catch {}
  }
  return {
    name:  process.env.FROM_NAME  || 'BNZ Impact',
    email: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    phone: null,
    address: null,
    org80gNumber: null,
  };
}

async function buildPdfAttachments(
  data: {
    donorName: string; donorEmail: string; amount: number; numberOfTrees: number;
    campaignName: string; receiptNumber: string; dedicationName?: string;
    donorPan?: string; paymentGatewayId?: string; donationDate: Date;
  },
  orgName: string,
  org80gNumber: string | null,
): Promise<{ filename: string; content: Buffer }[]> {
  try {
    const org = { name: orgName, org80gNumber };

    const receiptHtml = generateReceiptPDF({
      receiptNumber:    data.receiptNumber,
      donorName:        data.donorName,
      donorEmail:       data.donorEmail,
      donorPan:         data.donorPan,
      amount:           data.amount,
      numberOfTrees:    data.numberOfTrees,
      campaignName:     data.campaignName,
      paymentGatewayId: data.paymentGatewayId,
      date:             data.donationDate,
      org,
    });
    const certificateHtml = generateCertificatePDF({
      donorName:      data.donorName,
      numberOfTrees:  data.numberOfTrees,
      campaignName:   data.campaignName,
      dedicationName: data.dedicationName,
      date:           data.donationDate,
      receiptNumber:  data.receiptNumber,
      org,
    });

    const [receiptBuffer, certificateBuffer] = await Promise.all([
      htmlToPdfBuffer(receiptHtml),
      htmlToPdfBuffer(certificateHtml, true),
    ]);

    return [
      { filename: `receipt-${data.receiptNumber}.pdf`,     content: receiptBuffer },
      { filename: `certificate-${data.receiptNumber}.pdf`, content: certificateBuffer },
    ];
  } catch (e) {
    // If PDF rendering ever fails (e.g. Chromium unavailable), the donor
    // still gets the confirmation email with links to view/download both
    // documents online — attachments are a bonus, not a blocker.
    console.error('PDF attachment generation failed, sending email without attachments:', e);
    return [];
  }
}

export async function sendDonationConfirmationEmail(data: {
  donorName:        string;
  donorEmail:       string;
  amount:           number;
  numberOfTrees:    number;
  campaignName:     string;
  receiptNumber:    string;
  dedicationName?:  string;
  donationId:       string;
  donorPan?:        string;
  paymentGatewayId?:string;
  donationDate:     Date;
  orgId?:           string;
}): Promise<boolean> {
  try {
    const { name: orgName, email: fromEmail, phone: orgPhone, address: orgAddress, org80gNumber } = await getOrgEmail(data.orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const certUrl = `${appUrl}/certificate?id=${data.donationId}`;
    const receiptPdfUrl = `${appUrl}/api/receipts/${data.donationId}/pdf`;
    const certPdfUrl    = `${appUrl}/api/certificates/${data.donationId}/pdf`;
    const co2Kg = data.numberOfTrees * 22;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; background: #f9faf8; margin: 0; padding: 20px; }
  .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #1a3a1a; color: white; padding: 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 1px; }
  .header p { margin: 8px 0 0; opacity: 0.7; font-size: 13px; }
  .body { padding: 32px; }
  .amount { text-align: center; margin: 24px 0; }
  .amount .num { font-size: 48px; font-weight: bold; color: #1a3a1a; }
  .amount .label { color: #666; font-size: 14px; margin-top: 4px; }
  .detail { background: #f6faf3; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0ead8; font-size: 13px; }
  .detail-row:last-child { border: none; }
  .detail-row .label { color: #666; }
  .detail-row .value { font-weight: 600; color: #1a3a1a; }
  .co2-box { background: #1a3a1a; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
  .co2-box .num { color: #7fb87f; font-size: 36px; font-weight: bold; }
  .co2-box .label { color: #cfe0cf; font-size: 12px; margin-top: 6px; }
  .cta { text-align: center; margin: 24px 0; }
  .cta a { display: inline-block; background: #2d5a2d; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px; }
  .docs { background: #f6faf3; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; }
  .docs .doc-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
  .docs .doc-row a { color: #1a3a1a; text-decoration: underline; }
  .tax-note { background: #f6faf3; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #4a6a4a; line-height: 1.6; }
  .footer { text-align: center; padding: 20px 32px 32px; color: #999; font-size: 12px; }
  .footer a { color: #999; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>${orgName}</h1>
    <p>Tree Sponsorship Confirmation</p>
  </div>
  <div class="body">
    <p style="color:#444">Dear <strong>${data.donorName}</strong>,</p>
    <p style="color:#666;font-size:14px">Thank you for your generous contribution. Your trees have been registered and will be planted in your name.</p>
    <div class="amount">
      <div class="num">🌳 ${data.numberOfTrees}</div>
      <div class="label">Trees Sponsored</div>
    </div>
    <div class="detail">
      <div class="detail-row"><span class="label">Receipt No.</span><span class="value">#${data.receiptNumber}</span></div>
      <div class="detail-row"><span class="label">Campaign</span><span class="value">${data.campaignName}</span></div>
      <div class="detail-row"><span class="label">Trees Sponsored</span><span class="value">${data.numberOfTrees} Trees 🌳</span></div>
      ${data.paymentGatewayId ? `<div class="detail-row"><span class="label">Transaction ID</span><span class="value">${data.paymentGatewayId}</span></div>` : ''}
      <div class="detail-row"><span class="label">Amount Paid</span><span class="value">₹${data.amount.toLocaleString('en-IN')}</span></div>
      ${data.dedicationName ? `<div class="detail-row"><span class="label">Dedicated To</span><span class="value">${data.dedicationName}</span></div>` : ''}
      ${data.donorPan ? `<div class="detail-row"><span class="label">PAN (80G)</span><span class="value">${data.donorPan}</span></div>` : ''}
      <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(data.donationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
    </div>

    <div class="co2-box">
      <div class="num">↓${co2Kg.toLocaleString('en-IN')}kg</div>
      <div class="label">Estimated CO₂ absorbed per year by your trees</div>
    </div>

    <div class="cta">
      <a href="${certUrl}">View Certificate Online</a>
    </div>

    <div class="docs">
      📎 Documents attached to this email:<br/><br/>
      <div class="doc-row">📄 <a href="${receiptPdfUrl}">receipt-${data.receiptNumber}.pdf</a> — Official Donation Receipt</div>
      <div class="doc-row">📄 <a href="${certPdfUrl}">certificate-${data.receiptNumber}.pdf</a> — Tree Sponsorship Certificate</div>
    </div>

    <div class="tax-note">
      📋 This donation may be eligible for tax exemption under Section 80G of the Income Tax Act, 1961.
      Please retain this email as proof of donation · ${orgName}${org80gNumber ? ` · 80G Reg: ${org80gNumber}` : ''}${fromEmail ? ` · ${fromEmail}` : ''}
    </div>
  </div>
  <div class="footer">
    <p><strong>${orgName}</strong></p>
    <p style="margin-top:4px">
      ${fromEmail ? `<a href="mailto:${fromEmail}">${fromEmail}</a>` : ''}${orgPhone ? ` · ${orgPhone}` : ''}${orgAddress ? ` · ${orgAddress}` : ''}
    </p>
    <p style="margin-top:8px">This is an automated message. Please do not reply directly.</p>
  </div>
</div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from:    `${orgName} <${fromEmail}>`,
      to:      data.donorEmail,
      subject: `🌳 Tree Sponsorship Confirmed — ${data.numberOfTrees} trees · #${data.receiptNumber}`,
      html,
      attachments: await buildPdfAttachments(data, orgName, org80gNumber),
    });

    return !error;
  } catch (e) {
    console.error('Email send error:', e);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string, orgId?: string): Promise<boolean> {
  try {
    const { name: orgName, email: fromEmail } = await getOrgEmail(orgId);
    const { error } = await resend.emails.send({
      from:    `${orgName} <${fromEmail}>`,
      to:      email,
      subject: `Your OTP — ${orgName}`,
      html:    `<p>Your OTP is <strong>${otp}</strong>. Valid for 10 minutes.</p>`,
    });
    return !error;
  } catch { return false; }
}
