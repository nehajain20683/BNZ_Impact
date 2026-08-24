// src/lib/email.ts — Org-aware email sending via Resend
import { Resend } from 'resend';
import { getOrgConfig } from '@/lib/tenant';

const resend = new Resend(process.env.RESEND_API_KEY);

async function getOrgEmail(orgId?: string) {
  if (orgId) {
    try {
      const org = await getOrgConfig(orgId);
      if (org) return { name: org.name, email: org.email || process.env.FROM_EMAIL || 'onboarding@resend.dev' };
    } catch {}
  }
  return {
    name:  process.env.FROM_NAME  || 'BNZ Impact',
    email: process.env.FROM_EMAIL || 'onboarding@resend.dev',
  };
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
    const { name: orgName, email: fromEmail } = await getOrgEmail(data.orgId);

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
  .footer { text-align: center; padding: 20px 32px 32px; color: #999; font-size: 12px; }
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
      <div class="detail-row"><span class="label">Amount Paid</span><span class="value">₹${data.amount.toLocaleString('en-IN')}</span></div>
      <div class="detail-row"><span class="label">Campaign</span><span class="value">${data.campaignName}</span></div>
      ${data.dedicationName ? `<div class="detail-row"><span class="label">Dedicated To</span><span class="value">${data.dedicationName}</span></div>` : ''}
      ${data.donorPan ? `<div class="detail-row"><span class="label">PAN (80G)</span><span class="value">${data.donorPan}</span></div>` : ''}
      <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(data.donationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
    </div>
    <p style="font-size:13px;color:#666">Your digital certificate will be emailed separately. You can also download it from our website.</p>
  </div>
  <div class="footer">
    <p>${orgName} · Powered by BNZ Green Technologies</p>
    <p style="margin-top:4px">This is an automated confirmation. Please keep this for your records.</p>
  </div>
</div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from:    `${orgName} <${fromEmail}>`,
      to:      data.donorEmail,
      subject: `🌳 Tree Sponsorship Confirmed — ${data.numberOfTrees} trees · #${data.receiptNumber}`,
      html,
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
