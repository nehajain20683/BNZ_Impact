// src/lib/consent-declaration.ts
// Landowner Consent & Participation Declaration (भूमि स्वामी की सहमति एवं
// सहभागिता घोषणा पत्र). Clause wording is the organisation's own legal text,
// reproduced verbatim from the source document — the ONLY substitution made
// is the name of the "project authority" (originally hardcoded to JITO
// मुंबई ज़ोन), which now resolves per organisation. That name is the entity
// clauses 6 and 7 irrevocably assign carbon rights to, so it comes from
// Organization.consent_authority_name when set (an exact legal name set by
// Super Admin) and only falls back to the display name otherwise.
//
// Server-side only (uses node:crypto for the integrity hash).
import { createHash } from 'crypto';

export const CONSENT_TEMPLATE_VERSION = 'LANDOWNER_CONSENT_v1';
export const CONSENT_AGREEMENT_TYPE = 'LANDOWNER_CONSENT';
export const CONSENT_TITLE = 'Landowner Consent & Participation Declaration / भूमि स्वामी की सहमति एवं सहभागिता घोषणा पत्र';

// Every value that reaches the HTML goes through this. The existing
// doc-templates.ts interpolates farmer-entered text raw; a farmer who
// registers with a name like <img src=x onerror=…> would otherwise get
// script executed in the admin's session when the document is opened.
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type ConsentInput = {
  farmer: {
    fullName: string; fatherName?: string | null; mobile?: string | null; aadhaarNumber?: string | null;
    village?: string | null; taluka?: string | null; district?: string | null; state?: string | null; pincode?: string | null;
  };
  land?: { surveyGutNumber?: string | null; village?: string | null; taluka?: string | null; district?: string | null } | null;
  org: { name: string; logoUrl?: string | null; email?: string | null; consentAuthorityName?: string | null };
  // Printed name/designation only. Deliberately NOT a signature image: the
  // authority's signature should be applied by a person who has actually
  // reviewed this signed declaration, not auto-stamped at generation time.
  authorityRep?: { name: string; designation: string } | null;
  generatedAt?: Date;
  consentRecordedAt?: Date | null;
};

export function resolveAuthorityName(org: ConsentInput['org']): string {
  return (org.consentAuthorityName && org.consentAuthorityName.trim()) || org.name;
}

// Aadhaar is never printed in full — same convention as doc-templates.ts.
function maskAadhaar(a?: string | null): string {
  const d = (a || '').replace(/\D/g, '');
  return d.length >= 4 ? `XXXX XXXX ${d.slice(-4)}` : '';
}

const BLANK = '____________________';
function field(v?: string | null, width = 180): string {
  const t = (v || '').trim();
  return t
    ? `<strong style="border-bottom:1px solid #999;padding:0 4px">${esc(t)}</strong>`
    : `<span style="display:inline-block;min-width:${width}px;border-bottom:1px solid #666">&nbsp;</span>`;
}
function row(label: string, v?: string | null): string {
  const t = (v || '').trim();
  return `<div style="margin:6px 0;font-size:13.5px">${label}: ${t ? `<strong>${esc(t)}</strong>` : `<span style="display:inline-block;min-width:260px;border-bottom:1px solid #666">&nbsp;</span>`}</div>`;
}

const FONT = `'Nirmala UI','Noto Sans Devanagari','Mangal','Segoe UI',Arial,sans-serif`;
const H = `font-size:15px;font-weight:700;color:#2d5a1b;border-bottom:1px solid #c9d8b8;padding-bottom:4px;margin:26px 0 10px`;

export function generateConsentDeclarationHtml(d: ConsentInput): string {
  const authority = esc(resolveAuthorityName(d.org));
  const f = d.farmer;
  const land = d.land || {};
  const residence = [f.village, f.taluka, f.district, f.state, f.pincode].filter(x => x && String(x).trim()).join(', ');
  const village = land.village || f.village;
  const taluka = land.taluka || f.taluka;
  const district = land.district || f.district;
  const aadhaar = maskAadhaar(f.aadhaarNumber);

  const clauses = [
    'मैं अपनी भूमि पर वृक्षारोपण, कृषि-वनीकरण (Agroforestry), मियावाकी वन, प्राकृतिक वन पुनर्स्थापन अथवा अन्य पर्यावरण संरक्षण गतिविधियों के लिए अपनी स्वैच्छिक सहमति प्रदान करता/करती हूँ।',
    'मैं परियोजना के अंतर्गत निर्धारित स्थान पर वृक्षारोपण एवं उससे संबंधित सभी आवश्यक कार्यों की अनुमति देता/देती हूँ।',
    'मैं यह सुनिश्चित करूँगा/करूँगी कि परियोजना के अंतर्गत लगाए गए वृक्षों की सुरक्षा एवं यथासंभव देखभाल की जाएगी।',
    `<strong>मैं परियोजना के अंतर्गत लगाए गए किसी भी वृक्ष को परियोजना प्राधिकरण – ${authority} की पूर्व लिखित अनुमति के बिना नहीं काटूँगा/काटूँगी, न ही कटवाऊँगा/कटवाऊँगी अथवा किसी प्रकार की क्षति पहुँचाऊँगा/पहुँचाऊँगी।</strong>`,
    `मैं परियोजना प्राधिकरण – ${authority} के अधिकृत प्रतिनिधियों, तकनीकी टीम, निरीक्षकों, ऑडिटरों एवं सत्यापन एजेंसियों को परियोजना की प्रगति, वृक्षों की गणना, जियो-टैगिंग, ड्रोन सर्वेक्षण, फोटो दस्तावेजीकरण, कार्बन मापन तथा अन्य आवश्यक निरीक्षण हेतु उचित समय पर भूमि का निरीक्षण करने की अनुमति प्रदान करता/करती हूँ।`,
    'मैं अपनी भूमि पर इस परियोजना के अंतर्गत किए गए वृक्षारोपण एवं अन्य पर्यावरणीय गतिविधियों से उत्पन्न होने वाले सभी कार्बन क्रेडिट, कार्बन अधिकार (Carbon Rights), पर्यावरणीय लाभ (Environmental Attributes), जैव विविधता क्रेडिट, हरित प्रमाणपत्र (Green Certificates) तथा भविष्य में विकसित होने वाले किसी भी पर्यावरणीय अथवा जलवायु संबंधी क्रेडिट अथवा अधिकार पर स्वयं किसी प्रकार का दावा नहीं करूँगा/करूँगी।',
    `मैं अपनी स्वैच्छिक एवं पूर्ण सहमति से इन सभी अधिकारों के पंजीकरण, दावा करने, स्वामित्व रखने, जारी कराने, विक्रय, हस्तांतरण एवं अन्य सभी संबंधित अधिकार परियोजना प्राधिकरण – ${authority} अथवा ${authority} द्वारा इस उद्देश्य हेतु नामित/नियुक्त किसी विधिक इकाई, कंपनी, ट्रस्ट, सेक्शन 8 कंपनी या अन्य सक्षम संस्था को अपरिवर्तनीय रूप से प्रदान करता/करती हूँ। भविष्य में मैं अथवा मेरे उत्तराधिकारी, प्रतिनिधि या किसी अन्य व्यक्ति द्वारा इन अधिकारों पर किसी प्रकार का दावा नहीं किया जाएगा।`,
    'मैं यह घोषणा करता/करती हूँ कि मेरे द्वारा उपलब्ध कराए गए भूमि संबंधी दस्तावेज, स्वामित्व संबंधी जानकारी एवं अन्य विवरण सत्य एवं सही हैं।',
    'यदि भूमि का स्वामित्व एक से अधिक व्यक्तियों के नाम पर है, तो सभी सह-स्वामियों की सहमति प्राप्त करना मेरी जिम्मेदारी होगी।',
    // The source document has a stray Latin "I" at the start of this clause
    // (a typo); it is omitted here. Wording is otherwise unchanged.
    'मैं इस परियोजना के उद्देश्यों को समझता/समझती हूँ तथा परियोजना के सफल क्रियान्वयन हेतु आवश्यक सहयोग प्रदान करने के लिए सहमत हूँ।',
    'मैं यह घोषणा करता/करती हूँ कि यह सहमति मैंने अपनी स्वतंत्र इच्छा से, बिना किसी दबाव, भय, धोखे या प्रलोभन के प्रदान की है।',
  ];
  // Clauses 4 and 7 contain only already-escaped authority text; the rest
  // are static. Nothing farmer-supplied is interpolated into clause text.

  const rep = d.authorityRep;
  const generated = (d.generatedAt || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const accepted = d.consentRecordedAt
    ? `<div style="margin-top:6px;font-size:11px;color:#2d5a1b">भूमि स्वामी द्वारा इलेक्ट्रॉनिक रूप से स्वीकार किया गया / Electronically accepted by landowner: <strong>${esc(d.consentRecordedAt.toLocaleString('en-IN'))}</strong></div>`
    : '';

  const sigBlock = (title: string, rows: string) =>
    `<div style="break-inside:avoid"><div style="${H}">${title}</div>${rows}</div>`;

  return `<div style="font-family:${FONT};max-width:800px;margin:0 auto;padding:36px 40px;color:#1a1a1a;line-height:1.75;font-size:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2d5a1b;padding-bottom:12px;margin-bottom:22px">
    <div style="display:flex;align-items:center;gap:10px">
      ${d.org.logoUrl ? `<img src="${esc(d.org.logoUrl)}" alt="" style="height:38px;max-width:120px;object-fit:contain"/>` : ''}
      <div>
        <div style="font-size:20px;font-weight:900;color:#2d5a1b;letter-spacing:.5px">${esc(d.org.name.toUpperCase())}</div>
        <div style="font-size:11px;color:#5a8a3a">Tree Plantation &amp; Farmer Documentation</div>
      </div>
    </div>
    ${d.org.email ? `<div style="font-size:10px;color:#888;text-align:right">${esc(d.org.email)}</div>` : ''}
  </div>

  <h1 style="text-align:center;font-size:21px;color:#2d5a1b;margin:6px 0 4px">भूमि स्वामी की सहमति एवं सहभागिता घोषणा पत्र</h1>
  <div style="text-align:center;font-size:12px;color:#777;margin-bottom:20px">Landowner Consent &amp; Participation Declaration</div>

  <p style="text-align:justify">मैं, श्री/श्रीमती ${field(f.fullName, 220)}, पिता/पति ${field(f.fatherName, 160)}, निवासी ${field(residence, 240)}, आधार संख्या ${field(aadhaar, 130)}, सर्वे/गट संख्या ${field(land.surveyGutNumber, 120)}, ग्राम ${field(village, 120)}, तहसील ${field(taluka, 120)}, जिला ${field(district, 120)}, अपनी पूर्ण स्वेच्छा एवं बिना किसी दबाव, प्रलोभन अथवा बाध्यता के निम्नलिखित घोषणा एवं सहमति प्रदान करता/करती हूँ—</p>

  <ol style="padding-left:22px;text-align:justify">
    ${clauses.map(c => `<li style="margin:9px 0">${c}</li>`).join('\n    ')}
  </ol>

  ${sigBlock('भूमि स्वामी का विवरण', [
    row('नाम', f.fullName), row('पिता/पति का नाम', f.fatherName), row('मोबाइल नंबर', f.mobile),
    row('आधार संख्या', aadhaar), row('भूमि का सर्वे/गट नंबर', land.surveyGutNumber),
    row('ग्राम', village), row('तहसील', taluka), row('जिला', district),
  ].join(''))}

  ${sigBlock('भूमि स्वामी के हस्ताक्षर / अंगूठा निशान', [
    row('नाम', f.fullName), row('हस्ताक्षर / अंगूठा निशान', ''), row('दिनांक', ''), row('स्थान', ''),
  ].join(''))}

  ${sigBlock(`परियोजना प्राधिकरण – ${authority}`, [
    row('अधिकृत प्रतिनिधि का नाम', rep?.name), row('पद', rep?.designation), row('हस्ताक्षर', ''), row('दिनांक', ''),
  ].join(''))}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
    ${sigBlock('गवाह – 1', row('नाम', '') + row('मोबाइल', '') + row('हस्ताक्षर', ''))}
    ${sigBlock('गवाह – 2', row('नाम', '') + row('मोबाइल', '') + row('हस्ताक्षर', ''))}
  </div>

  <div style="margin-top:28px;border-top:1px solid #e5e5e5;padding-top:10px;font-size:10.5px;color:#888">
    Generated ${esc(generated)} · ${esc(CONSENT_TEMPLATE_VERSION)}
    ${accepted}
  </div>
</div>`;
}

// What gets stored alongside the HTML snapshot. The hash lets anyone later
// show the stored wording hasn't changed since the farmer consented to it.
export function buildConsentSnapshot(input: ConsentInput, extra: Record<string, unknown> = {}) {
  const html = generateConsentDeclarationHtml(input);
  const documentHash = createHash('sha256').update(html).digest('hex');
  return {
    html,
    templateData: {
      templateVersion: CONSENT_TEMPLATE_VERSION,
      documentHash,
      authorityName: resolveAuthorityName(input.org),
      ...extra,
    },
  };
}

// Full standalone page (toolbar + document) used by the registration
// preview. Same visual language as the existing /api/farmer/agreements/[id]
// viewer so "View" behaves identically everywhere.
export function renderConsentPreviewPage(innerHtml: string, banner?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(CONSENT_TITLE)}</title>
<style>
  @page{margin:16mm}
  @media print{.no-print{display:none!important}.wrap{padding:0!important}.card{box-shadow:none!important}}
  body{margin:0;background:#f3f4f1;font-family:${FONT}}
  .bar{position:fixed;top:0;left:0;right:0;background:#1a2e0a;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;z-index:10}
  .bar button{background:#2d5a1b;border:0;color:#fff;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px}
  .wrap{padding:${banner ? '104px' : '64px'} 12px 28px}
  .card{background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:860px;margin:0 auto}
  .note{position:fixed;top:48px;left:0;right:0;background:#fff8e1;color:#7a5b00;font-size:12px;padding:6px 14px;border-bottom:1px solid #f0dca0;z-index:9}
</style></head><body>
<div class="bar no-print"><span style="font-size:13px;font-weight:600">📄 ${esc(CONSENT_TITLE)}</span><button onclick="window.print()">⬇ Download / Print PDF</button></div>
${banner ? `<div class="note no-print">${esc(banner)}</div>` : ''}
<div class="wrap"><div class="card">${innerHtml}</div></div></body></html>`;
}
