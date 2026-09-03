// src/lib/pdf.ts — Tenant-branded PDF receipts & certificates
// Every string that used to be hardcoded to JITO is now sourced from an
// `org` parameter, mirroring the pattern already used in src/lib/email.ts.
import { BNZ_LOGO_B64 } from './logo-data';

export type PdfOrgBranding = {
  name:         string;
  logoUrl?:     string | null;
  org80gNumber?:string | null;
};

const DEFAULT_ORG: PdfOrgBranding = { name: 'BNZ Impact', logoUrl: null, org80gNumber: null };

function logoImgTag(org: PdfOrgBranding, cssClass: string): string {
  const src = org.logoUrl || BNZ_LOGO_B64;
  return `<img src="${src}" class="${cssClass}" alt="${org.name}"/>`;
}

// ─── Tier badge from tree count ───────────────────────────────────────────────
function getTierBadge(trees: number): { badge: string; emoji: string; badgeEn: string } {
  if (trees >= 108) return { badge: 'विरासत निर्माता', emoji: '💎', badgeEn: 'Diamond Legacy' };
  if (trees >= 54)  return { badge: 'समर्पित',         emoji: '🏆', badgeEn: 'Platinum Legacy' };
  if (trees >= 27)  return { badge: 'संकल्पी',          emoji: '🥇', badgeEn: 'Gold Legacy' };
  if (trees >= 11)  return { badge: 'प्रेरक',           emoji: '🥈', badgeEn: 'Silver Legacy' };
  return               { badge: 'प्रेरक',               emoji: '🌱', badgeEn: 'Tree Sponsor' };
}

// ─── Receipt PDF ────────────────────────────────────────────────────────────
export function generateReceiptPDF(data: {
  receiptNumber: string;
  donorName: string;
  certificateName?: string;
  donorEmail: string;
  donorPan?: string;
  amount: number;
  numberOfTrees: number;
  campaignName: string;
  isIndividual?: boolean;
  paymentGatewayId?: string;
  date: Date;
  org?: PdfOrgBranding;
  signatory?: { name: string; designation: string; signatureImage: string } | null;
}): string {
  const org     = data.org || DEFAULT_ORG;
  const dateStr = data.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const tier    = getTierBadge(data.numberOfTrees);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;background:#fff;width:794px;margin:0 auto;color:#1a2e1a}
    .page{padding:40px}
    .border{border:3px solid #aecfa4;padding:32px;min-height:960px;position:relative;border-radius:4px}
    .inner-border{border:1px solid #d3e6cc;position:absolute;inset:10px;border-radius:2px;pointer-events:none}
    /* Header with both logos */
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #eaf2e6}
    .header-logos{display:flex;align-items:center;gap:12px}
    .logo-jito{width:66px;height:66px;object-fit:contain;background:transparent;flex-shrink:0}
    .logo-env{width:60px;height:60px;object-fit:contain;background:transparent;flex-shrink:0}
    .header-text{text-align:center;flex:1}
    .org-name{font-family:'EB Garamond',serif;font-size:22px;color:#264422;font-weight:600}
    .org-tag{font-size:12px;color:#448039;margin-top:3px}
    .receipt-title{text-align:center;font-family:'EB Garamond',serif;font-size:26px;color:#264422;font-style:italic;margin:14px 0 4px}
    .receipt-number{text-align:center;font-size:12px;color:#448039;margin-bottom:20px}
    .section{margin:14px 0}
    .section-title{font-size:10px;text-transform:uppercase;letter-spacing:2.5px;color:#448039;border-bottom:1px solid #eaf2e6;padding-bottom:4px;margin-bottom:10px;font-weight:600}
    .row{display:flex;margin:8px 0;font-size:13px}
    .label{width:180px;color:#448039}
    .value{flex:1;color:#264422;font-weight:600}
    .amount-box{background:#f6f9f4;border:2px solid #aecfa4;border-radius:10px;padding:18px;margin:18px 0;text-align:center}
    .amount-label{font-size:10px;color:#448039;text-transform:uppercase;letter-spacing:2px;font-weight:600}
    .amount-value{font-family:'EB Garamond',serif;font-size:40px;color:#264422;font-weight:700;margin:6px 0}
    .trees-badge{font-size:14px;color:#448039;font-weight:600}
    .tax-note{font-size:10px;color:#448039;text-align:center;margin:14px 0;font-style:italic;line-height:1.6}
    .footer-bar{border-top:1px solid #eaf2e6;padding-top:12px;margin-top:16px;display:flex;align-items:center;justify-content:space-between}
    .footer-text{text-align:center;font-size:10px;color:#448039;flex:1}
    .logo-mz{width:53px;height:auto;object-fit:contain}
    .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-family:'EB Garamond',serif;font-size:64px;color:rgba(68,128,57,.04);font-weight:900;text-transform:uppercase;pointer-events:none;white-space:nowrap}
  </style>
</head>
<body>
<div class="page">
  <div class="border">
    <div class="inner-border"></div>
    <div class="watermark">${org.name.toUpperCase()}</div>
    <div class="header">
      ${logoImgTag(org, 'logo-jito')}
      <div class="header-text">
        <div class="org-name">${org.name}</div>
        <div class="org-tag">Tree Sponsorship & Carbon Impact Receipt</div>
      </div>
    </div>
    <div class="receipt-title">Official Donation Receipt</div>
    <div class="receipt-number">Receipt No: <strong>#${data.receiptNumber}</strong> &nbsp;|&nbsp; Date: ${dateStr}</div>
    <div class="section">
      <div class="section-title">Donor Information</div>
      <div class="row"><span class="label">Name</span><span class="value">${data.donorName}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${data.donorEmail}</span></div>
      ${data.donorPan ? `<div class="row"><span class="label">PAN</span><span class="value">${data.donorPan}</span></div>` : ''}
    </div>
    <div class="section">
      <div class="section-title">Donation Details</div>
      <div class="row"><span class="label">${data.isIndividual ? 'Donation Type' : 'Campaign'}</span><span class="value">${data.isIndividual ? 'Individual Tree Donation' : data.campaignName}</span></div>
      <div class="row"><span class="label">Trees Sponsored</span><span class="value">${data.numberOfTrees} Trees ${tier.emoji}</span></div>
      <div class="row"><span class="label">Tier</span><span class="value">${tier.emoji} ${tier.badge} · ${tier.badgeEn}</span></div>
      <div class="row"><span class="label">CO₂ Removed/yr</span><span class="value">↓ ${(data.numberOfTrees * 22).toLocaleString('en-IN')} kg</span></div>
      ${data.paymentGatewayId ? `<div class="row"><span class="label">Transaction ID</span><span class="value">${data.paymentGatewayId}</span></div>` : ''}
      <div class="row"><span class="label">Payment Mode</span><span class="value">Online (Razorpay)</span></div>
    </div>
    <div class="amount-box">
      <div class="amount-label">Total Amount Donated</div>
      <div class="amount-value">₹${data.amount.toLocaleString('en-IN')}</div>
      <div class="trees-badge">${tier.emoji} ${tier.badge} · ${tier.badgeEn} · ${data.numberOfTrees} Trees · ${org.name}</div>
    </div>
    <div class="tax-note">
      This receipt is issued as proof of donation${org.org80gNumber ? ` and may be eligible for tax exemption under<br/>Section 80G of the Income Tax Act, 1961 · ${org.name} · 80G Reg: ${org.org80gNumber}` : `.<br/>${org.name}`}
    </div>
    <!-- Footer -->
    <div class="footer-bar">
      <div class="footer-text">
        ${data.signatory ? `<img src="${data.signatory.signatureImage}" alt="" style="height:30px;display:block;margin-bottom:2px"/>` : ''}
        ${data.signatory ? `${data.signatory.name} · ${data.signatory.designation}` : 'Authorised Signatory'} · ${org.name}<br/>This is a computer-generated receipt.
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Certificate PDF ──────────────────────────────────────────────────────
export function generateCertificatePDF(data: {
  donorName: string;
  certificateName?: string;
  numberOfTrees: number;
  campaignName: string;
  isIndividual?: boolean;
  individualMessage?: string;
  dedicationName?: string;
  date: Date;
  receiptNumber: string;
  chapter?: string;
  org?: PdfOrgBranding;
  signatory?: { name: string; designation: string; signatureImage: string } | null;
}): string {
  const org     = data.org || DEFAULT_ORG;
  const dateStr = data.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const co2     = data.numberOfTrees * 22;
  const tier    = getTierBadge(data.numberOfTrees);
  const chapter = data.chapter || org.name;
  const sponsorshipLine = data.isIndividual
    ? (data.individualMessage || `the ${org.name} Tree Plantation Programme`)
    : data.campaignName;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&family=Cinzel:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    html, body {
      width:1123px; height:794px;
      background:#fffef9;
      font-family:'DM Sans',sans-serif;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
      overflow:hidden;
    }

    /* ── Page: fixed landscape frame ── */
    .page {
      width:1123px; height:794px;
      background:#fffef9;
      position:relative;
      overflow:hidden;
      display:flex;
      flex-direction:column;
    }

    /* ── z-index stack (low → high): watermark(1) border(5) corner(6) content(10) logos(20) ── */

    /* Borders */
    .outer-border { position:absolute; inset:12px; border:2.5px solid #c9a84c; border-radius:2px; pointer-events:none; z-index:5; }
    .inner-border { position:absolute; inset:18px; border:1px solid rgba(201,168,76,0.35); border-radius:1px; pointer-events:none; z-index:5; }

    /* Corners */
    .corner { position:absolute; width:46px; height:46px; z-index:6; }
    .c-tl { top:24px;  left:24px;  border-top:2px solid #8a9e3a; border-left:2px solid #8a9e3a; }
    .c-tr { top:24px;  right:24px; border-top:2px solid #8a9e3a; border-right:2px solid #8a9e3a; }
    .c-bl { bottom:24px; left:24px;  border-bottom:2px solid #8a9e3a; border-left:2px solid #8a9e3a; }
    .c-br { bottom:24px; right:24px; border-bottom:2px solid #8a9e3a; border-right:2px solid #8a9e3a; }

    /* Watermark — lowest z-index, sits behind everything */
    .watermark {
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      font-family:'Cinzel',serif; font-size:100px;
      color:rgba(138,158,58,0.04);
      font-weight:700; text-transform:uppercase; pointer-events:none;
      white-space:nowrap; letter-spacing:10px; z-index:1;
    }

    /* Org logo — top left, z:20 */
    .logo-jito {
      position:absolute; top:22px; left:30px;
      width:100px; height:auto;
      object-fit:contain; z-index:20;
    }
    /* ENV logo — top right, 2× current (28→56px), z:20 */
    .logo-env {
      position:absolute; top:22px; right:30px;
      width:56px; height:auto;
      object-fit:contain; z-index:20;
    }

    /* ── MAIN LAYOUT: one flex column fills the whole page ── */
    /* top-band + content-body + footer-band = 794px */

    /* Top band: logos are absolute, this band just reserves space */
    .top-band {
      height:110px;
      flex-shrink:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      padding:0 180px;   /* clear of logos */
      position:relative;
      z-index:10;
    }
    .org-eyebrow {
      font-family:'Cinzel',serif; font-size:13px; letter-spacing:4px;
      color:#8a9e3a; text-transform:uppercase; display:block;
      margin-bottom:3px;
    }
    .org-tagline {
      font-size:10.5px; color:#6a8050; letter-spacing:0.3px;
      font-family:'DM Sans',sans-serif;
    }

    /* Content body — grows to fill remaining height, distributes children evenly */
    .content {
      flex:1;
      padding:0 44px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:space-between;
      text-align:center;
      z-index:10;
      position:relative;
      /* Outer border sits 12px from the page edge, inner border 18px — this
         must clear both so footer text never overlaps/crosses the border. */
      padding-bottom:26px;
    }

    /* Gold divider */
    .gold-divider { display:flex; align-items:center; gap:8px; width:100%; justify-content:center; }
    .gold-line { flex:1; max-width:200px; height:1px; background:linear-gradient(to right,transparent,#c9a84c,transparent); }
    .gold-diamond { width:6px; height:6px; background:#c9a84c; transform:rotate(45deg); flex-shrink:0; }

    /* Title */
    .cert-title {
      font-family:'Cinzel',serif; font-size:28px;
      font-weight:700; color:#1a2e0a; letter-spacing:2px; line-height:1.15;
    }
    .cert-sub {
      font-family:'DM Sans',sans-serif; font-size:9.5px; letter-spacing:3.5px;
      text-transform:uppercase; color:#7a9e3a; margin-top:3px; display:block;
    }

    /* Recipient */
    .certifies-text {
      font-family:'Playfair Display',serif; font-size:14px;
      color:#5a7a3a; font-style:italic; display:block; margin-bottom:4px;
    }
    .donor-name {
      font-family:'Playfair Display',serif; font-size:52px; font-weight:700;
      font-style:italic; color:#1a2e0a; line-height:1.0;
      border-bottom:2px solid #c9a84c; padding-bottom:4px;
      min-width:340px; display:inline-block; margin-bottom:3px;
    }
    .chapter-line {
      font-family:'DM Sans',sans-serif; font-size:16px;
      font-weight:600; color:#7a9e3a; display:block; margin-top:3px;
    }

    /* Body text */
    .body-text {
      font-family:'Playfair Display',serif; font-size:14px;
      color:#3a5a2a; line-height:1.5; max-width:740px;
    }
    .text-highlight { color:#1a2e0a; font-weight:700; }
    .text-dedication { color:#7a9e3a; font-style:italic; font-size:15px; }

    /* Badge */
    .badge {
      display:inline-block; border:1.5px solid #c9a84c; border-radius:50px;
      padding:4px 22px; font-family:'Cinzel',serif; font-size:11px; letter-spacing:2px;
      text-transform:uppercase; color:#8a7020;
      background:linear-gradient(135deg,#fffef0 0%,#fdf8e1 100%);
      box-shadow:0 2px 8px rgba(201,168,76,0.15);
    }

    /* Impact row — equal widths, joined */
    .impact-row { display:flex; gap:0; justify-content:center; width:70%; max-width:520px; }
    .impact-item {
      flex:1; text-align:center; padding:6px 4px;
      background:#f4f8f0; border:1px solid #d0e0c0; border-right:none;
    }
    .impact-item:first-child { border-radius:8px 0 0 8px; }
    .impact-item:last-child  { border-radius:0 8px 8px 0; border-right:1px solid #d0e0c0; }
    .impact-number { font-family:'Cinzel',serif; font-size:18px; font-weight:700; color:#264422; display:block; line-height:1.2; }
    .co2-arrow { color:#4a8a3a; font-weight:900; }
    .impact-label { font-family:'DM Sans',sans-serif; font-size:7.5px; color:#7a9e3a; text-transform:uppercase; letter-spacing:1.5px; margin-top:2px; display:block; }

    /* Footer row — 3 equal columns, anchored to bottom */
    .cert-footer {
      width:100%; display:flex; justify-content:space-between; align-items:flex-end;
      border-top:1px solid #e0eccc; padding-top:6px;
      flex-shrink:0;
    }
    .footer-item { text-align:center; flex:1; }
    .footer-label { font-family:'DM Sans',sans-serif; font-size:7.5px; color:#8a9e3a; text-transform:uppercase; letter-spacing:1.5px; display:block; margin-bottom:2px; }
    .footer-value { font-family:'DM Sans',sans-serif; font-size:9.5px; color:#264422; font-weight:600; }
    .seal-left { width:38px; height:38px; border:1.5px solid #c9a84c; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:17px; margin:0 auto 3px; background:#fffef0; }
    
    .seal-mz { width:110px; height:auto; object-fit:contain; display:block; margin:0 auto 3px; }

    /* ── Print: mirror screen exactly ── */
    @page { size:297mm 210mm landscape; margin:0; }
    @media print {
      html, body { width:297mm; height:210mm; overflow:hidden; }
      .page { width:297mm; height:210mm; }
      .watermark, .outer-border, .inner-border, .corner { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      * { page-break-inside:avoid; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- z:1 — Watermark (behind everything) -->
  <div class="watermark">CERTIFIED</div>

  <!-- z:5 — Borders -->
  <div class="outer-border"></div>
  <div class="inner-border"></div>

  <!-- z:6 — Corner accents -->
  <div class="corner c-tl"></div>
  <div class="corner c-tr"></div>
  <div class="corner c-bl"></div>
  <div class="corner c-br"></div>

  <!-- z:20 — Logo (absolutely positioned, floats above all) -->
  ${logoImgTag(org, 'logo-jito')}

  <!-- ── TOP BAND: org title + tagline ── -->
  <div class="top-band">
    <span class="org-eyebrow">${org.name}</span>
    <span class="org-tagline">Tree Sponsorship & Carbon Impact Certificate</span>
  </div>

  <!-- ── CONTENT BODY: flex column, space-between fills 794px ── -->
  <div class="content">

    <!-- 1. Gold divider -->
    <div class="gold-divider">
      <div class="gold-line"></div>
      <div class="gold-diamond"></div>
      <div class="gold-line"></div>
    </div>

    <!-- 2. Certificate title -->
    <div>
      <div class="cert-title">Certificate of Tree Sponsorship</div>
      <span class="cert-sub">Presented by ${org.name}</span>
    </div>

    <!-- 3. Thin divider -->
    <div class="gold-divider">
      <div class="gold-line" style="max-width:100px"></div>
      <div class="gold-diamond"></div>
      <div class="gold-line" style="max-width:100px"></div>
    </div>

    <!-- 4. Recipient section -->
    <div>
      <span class="certifies-text">This certificate is proudly presented to</span>
      <div class="donor-name">${data.certificateName || data.donorName}</div>
      <span class="chapter-line">Chapter: ${chapter}</span>
    </div>

    <!-- 5. Sponsorship description -->
    <div class="body-text">
      for generously sponsoring
      <span class="text-highlight">${data.numberOfTrees} ${data.numberOfTrees === 1 ? 'Tree' : 'Trees'}</span>
      under the <span class="text-highlight">${sponsorshipLine}</span>
      ${data.dedicationName ? `<br/>in loving honour of <span class="text-dedication">${data.dedicationName}</span>` : ''}
    </div>

    <!-- 6. Tier badge -->
    <div>
      <span class="badge">${tier.emoji} ${tier.badge} · ${tier.badgeEn} ${tier.emoji}</span>
    </div>

    <!-- 7. Impact stats row -->
    <div class="impact-row">
      <div class="impact-item">
        <span class="impact-number">${data.numberOfTrees}</span>
        <span class="impact-label">Trees Planted</span>
      </div>
      <div class="impact-item">
        <span class="impact-number"><span class="co2-arrow">↓</span>${co2.toLocaleString('en-IN')} kg</span>
        <span class="impact-label">CO₂ Removed / Year</span>
      </div>
      <div class="impact-item">
        <span class="impact-number">25+ yrs</span>
        <span class="impact-label">Lasting Impact</span>
      </div>
    </div>

    <!-- 8. Bottom bar: verified | date+cert | authorised by -->
    <div class="cert-footer">
      <div class="footer-item">
        <div class="seal-left">📍</div>
        <span class="footer-label">Verified Plantation</span>
        <span class="footer-value">Geo-tagged &amp; Monitored</span>
      </div>
      <div class="footer-item">
        <span class="footer-label">Date of Issue</span>
        <span class="footer-value" style="display:block;margin-bottom:3px">${dateStr}</span>
        <span class="footer-label">Certificate No.</span>
        <span class="footer-value">#${data.receiptNumber}</span>
      </div>
      <div class="footer-item">
        <div class="seal-left" style="margin:0 auto 3px">🌳</div>
        <span class="footer-label">Authorised By</span>
        ${data.signatory ? `<img src="${data.signatory.signatureImage}" alt="" style="height:24px;display:block;margin:2px auto"/>` : ''}
        <span class="footer-value">${data.signatory ? `${data.signatory.name}, ${data.signatory.designation}` : org.name}</span>
      </div>
    </div>

  </div><!-- /content -->
</div><!-- /page -->
</body>
</html>`;
}
