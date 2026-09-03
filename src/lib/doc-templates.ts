// src/lib/doc-templates.ts — HTML templates for all farmer documents

type DocOrg = { name: string; logoUrl?: string | null; email?: string | null };
const DEFAULT_DOC_ORG: DocOrg = { name: 'BNZ Impact', logoUrl: null, email: null };
type DocSignatory = { name: string; designation: string; signatureImage: string } | null | undefined;

// Renders a single signature block — image if a real signatory/officer
// signature is on file, otherwise the original blank line for a physical
// signature, so documents keep working exactly as before for anyone who
// hasn't set one up yet.
function signatureBlock(label: string, sub: string, printedName: string, signature?: DocSignatory) {
  return `
      <div>
        <div style="${headingStyle}">${label}</div>
        <div style="margin-top:${signature ? '4px' : '40px'};border-top:1px solid #333;padding-top:8px">
          ${signature ? `<img src="${signature.signatureImage}" alt="" style="height:34px;display:block;margin-bottom:2px"/>` : ''}
          <div style="font-size:12px"><strong>${signature?.name || printedName}</strong></div>
          <div style="font-size:11px;color:#666">${signature?.designation || sub}</div>
          <div style="font-size:11px;color:#666">Date: ___________</div>
        </div>
      </div>`;
}

function logoHeader(org: DocOrg = DEFAULT_DOC_ORG) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2d5a1b;padding-bottom:12px;margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px">
      ${org.logoUrl ? `<img src="${org.logoUrl}" alt="${org.name}" style="height:36px;max-width:120px;object-fit:contain"/>` : ''}
      <div>
        <div style="font-size:22px;font-weight:900;color:#2d5a1b;letter-spacing:1px">${org.name.toUpperCase()}</div>
        <div style="font-size:11px;color:#5a8a3a;margin-top:2px">Tree Plantation & Farmer Documentation</div>
      </div>
    </div>
    ${org.email ? `<div style="text-align:right;font-size:10px;color:#888">
      <div>${org.email}</div>
    </div>` : ''}
  </div>`;
}

const baseStyle = `font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;line-height:1.6;`;
const fieldStyle = `border-bottom:1px solid #ccc;display:inline-block;min-width:200px;margin:0 4px;`;
const tableStyle = `width:100%;border-collapse:collapse;margin:16px 0;`;
const thStyle = `background:#2d5a1b;color:white;padding:8px 12px;text-align:left;font-size:12px;`;
const tdStyle = `padding:8px 12px;border:1px solid #ddd;font-size:12px;`;
const sectionStyle = `margin:24px 0;`;
const headingStyle = `font-size:14px;font-weight:700;color:#2d5a1b;border-bottom:1px solid #c9d8b8;padding-bottom:4px;margin-bottom:12px;letter-spacing:0.5px;`;

// ── 1. Landowner Participation Agreement ─────────────────────────────────────
export function generateParticipationAgreement(data: {
  farmerName: string; fatherName?: string; mobile: string;
  aadhaar?: string; village?: string; taluka?: string; district?: string; state?: string;
  surveyNumber?: string; areaAcres?: number; farmerId?: string;
  date?: string; org?: DocOrg; orgSignatory?: DocSignatory;
}) {
  const org = data.org || DEFAULT_DOC_ORG;
  const date = data.date || new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  return `<div style="${baseStyle}">
    ${logoHeader(org)}
    <div style="text-align:center;margin:20px 0">
      <div style="font-size:18px;font-weight:900;color:#2d5a1b;text-transform:uppercase;letter-spacing:2px">Landowner Participation Agreement</div>
      <div style="font-size:11px;color:#888;margin-top:4px">For Tree Plantation, Agroforestry, Afforestation and Environmental Attribute Projects</div>
      <div style="font-size:11px;color:#888">Date: ${date} | Farmer ID: ${data.farmerId || '___________'}</div>
    </div>

    <div style="${sectionStyle}">
      <p>This Landowner Participation Agreement (<strong>"Agreement"</strong>) is executed on this <strong>${date}</strong> between:</p>
      <p><strong>FIRST PARTY:</strong> ${org.name} (<strong>"Project Authority"</strong>)</p>
      <p><strong>AND</strong></p>
      <p><strong>SECOND PARTY:</strong> <strong>${data.farmerName}</strong>, S/o / D/o / W/o <strong>${data.fatherName || '___________'}</strong>, Mobile: <strong>${data.mobile}</strong>, Aadhaar: <strong>${data.aadhaar ? '••••••••'+data.aadhaar.slice(-4) : '___________'}</strong>, residing at Village: <strong>${data.village||'___'}</strong>, Taluka: <strong>${data.taluka||'___'}</strong>, District: <strong>${data.district||'___'}</strong>, State: <strong>${data.state||'___'}</strong> (<strong>"Landowner"</strong>)</p>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">1. LAND DETAILS</div>
      <table style="${tableStyle}">
        <tr><th style="${thStyle}">Survey / Gut No.</th><th style="${thStyle}">Village</th><th style="${thStyle}">Taluka</th><th style="${thStyle}">District</th><th style="${thStyle}">Area (Acres)</th></tr>
        <tr><td style="${tdStyle}">${data.surveyNumber||'___'}</td><td style="${tdStyle}">${data.village||'___'}</td><td style="${tdStyle}">${data.taluka||'___'}</td><td style="${tdStyle}">${data.district||'___'}</td><td style="${tdStyle}">${data.areaAcres||'___'}</td></tr>
      </table>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">2. SCOPE OF PROJECT</div>
      <p style="font-size:13px">The Landowner hereby grants permission to the Project Authority to undertake tree plantation, agroforestry, Miyawaki forests, native species plantation, and related environmental activities on the above land for a period of <strong>25 years</strong> from the Effective Date, extendable by mutual consent.</p>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">3. CARBON RIGHTS</div>
      <p style="font-size:13px">The Landowner acknowledges that all carbon credits, biodiversity credits, nature credits and environmental attributes generated from the plantation activities on the above land shall vest with the Project Authority for the duration of this Agreement. The Landowner shall receive revenue sharing as per the Farmer Benefit Sharing Policy.</p>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">4. LANDOWNER OBLIGATIONS</div>
      <ul style="font-size:13px;padding-left:20px">
        <li>Provide unobstructed access to the land for plantation and monitoring activities.</li>
        <li>Not undertake any activity that would damage, destroy or interfere with planted trees.</li>
        <li>Cooperate with field officers for geo-tagging, photography, and periodic monitoring.</li>
        <li>Notify the Project Authority of any change in land ownership or encumbrance.</li>
      </ul>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">5. PROJECT AUTHORITY OBLIGATIONS</div>
      <ul style="font-size:13px;padding-left:20px">
        <li>Supply saplings, plantation support, and technical guidance at no cost to the Landowner.</li>
        <li>Share carbon and environmental attribute revenues as per the applicable Benefit Sharing Policy.</li>
        <li>Provide plantation incentives as mutually agreed.</li>
        <li>Issue a Plantation Certificate upon successful completion of plantation activities.</li>
      </ul>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">6. DECLARATION</div>
      <p style="font-size:13px">The Landowner confirms that: (a) they are the legal owner / co-owner of the above land; (b) the land is free from any legal dispute; (c) they have voluntarily entered into this Agreement without any coercion or inducement; (d) all information provided is true and correct.</p>
    </div>

    <div style="margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div>
        <div style="${headingStyle}">LANDOWNER</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:12px"><strong>${data.farmerName}</strong></div>
          <div style="font-size:11px;color:#666">${data.mobile}</div>
          <div style="font-size:11px;color:#666">Date: ___________</div>
        </div>
      </div>
      ${signatureBlock('PROJECT AUTHORITY', 'Authorised Signatory', org.name, data.orgSignatory)}
    </div>
  </div>`;
}

// ── 2. Annapatti Praman Patra (NOC for Joint Ownership) ──────────────────────
export function generateJointOwnerNOC(data: {
  ownerName: string; fatherName?: string; age?: string;
  address?: string; aadhaar?: string;
  surveyNumber?: string; village?: string; taluka?: string; district?: string; areaAcres?: number;
  primaryOwnerName: string; date?: string; org?: DocOrg;
}) {
  const org = data.org || DEFAULT_DOC_ORG;
  const date = data.date || new Date().toLocaleDateString('hi-IN', { day:'2-digit', month:'long', year:'numeric' });
  return `<div style="${baseStyle}">
    ${logoHeader(org)}
    <div style="text-align:center;margin:20px 0">
      <div style="font-size:20px;font-weight:900;color:#2d5a1b">अनापत्ति प्रमाण पत्र</div>
      <div style="font-size:14px;color:#555;margin-top:2px">No Objection Certificate</div>
      <div style="font-size:12px;color:#888">(संयुक्त भूमि स्वामियों द्वारा सहमति पत्र)</div>
    </div>

    <div style="${sectionStyle};font-size:14px;line-height:2">
      <p>मैं, <strong style="${fieldStyle}">${data.ownerName}</strong>, पिता/पति <strong style="${fieldStyle}">${data.fatherName||'___________'}</strong>, आयु <strong>${data.age||'___'}</strong> वर्ष, निवासी <strong style="${fieldStyle}">${data.address||'___________'}</strong>, आधार संख्या <strong>${data.aadhaar ? '••••••••'+data.aadhaar.slice(-4) : '___________'}</strong>, यह घोषित करता/करती हूँ कि मैं निम्नलिखित भूमि का संयुक्त स्वामी/सह-स्वामी हूँ:</p>

      <table style="${tableStyle}">
        <tr><th style="${thStyle}">सर्वे/गट संख्या</th><th style="${thStyle}">ग्राम</th><th style="${thStyle}">तहसील</th><th style="${thStyle}">जिला</th><th style="${thStyle}">कुल क्षेत्रफल</th></tr>
        <tr><td style="${tdStyle}">${data.surveyNumber||'___'}</td><td style="${tdStyle}">${data.village||'___'}</td><td style="${tdStyle}">${data.taluka||'___'}</td><td style="${tdStyle}">${data.district||'___'}</td><td style="${tdStyle}">${data.areaAcres||'___'} एकड़</td></tr>
      </table>

      <p>मैं अपनी पूर्ण स्वेच्छा एवं बिना किसी दबाव के यह <strong>अनापत्ति (NOC)</strong> प्रदान करता/करती हूँ कि उपरोक्त भूमि पर <strong>${org.name}</strong> द्वारा संचालित वृक्षारोपण, कृषि-वनीकरण (Agroforestry), मियावाकी वन, प्राकृतिक वनीकरण एवं कार्बन क्रेडिट परियोजनाओं के अंतर्गत <strong>श्री/श्रीमती ${data.primaryOwnerName}</strong> द्वारा भूमि का उपयोग किया जा सकता है।</p>

      <p>मैं इस बात की पुष्टि करता/करती हूँ कि मुझे इस परियोजना से कोई आपत्ति नहीं है और मैं सभी संबंधित कार्यों में पूर्ण सहयोग प्रदान करूँगा/करूँगी।</p>
    </div>

    <div style="margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div>
        <div style="${headingStyle}">NOC देने वाले का हस्ताक्षर</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:12px"><strong>${data.ownerName}</strong></div>
          <div style="font-size:11px;color:#666">दिनांक: ${date}</div>
        </div>
      </div>
      <div>
        <div style="${headingStyle}">साक्षी / Witness</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:12px">नाम: _______________</div>
          <div style="font-size:11px;color:#666">दिनांक: ___________</div>
        </div>
      </div>
    </div>
    <p style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:10px">
      नोट: यह प्रमाण पत्र सभी सम्बंधित पक्षों के हस्ताक्षर के पश्चात् ${org.name} कार्यालय में जमा किया जाना आवश्यक है।
    </p>
  </div>`;
}

// ── 3. Farmer Payment Receipt ─────────────────────────────────────────────────
export function generatePaymentReceipt(data: {
  receiptNo: string; farmerName: string; farmerId?: string;
  village?: string; district?: string; surveyNumber?: string;
  paymentType: string; amount: number; amountWords?: string;
  paymentMode: string; utrNumber?: string; bankName?: string;
  paymentDate: string; period?: string; notes?: string; org?: DocOrg;
  preparedBySignature?: DocSignatory; orgSignatory?: DocSignatory;
}) {
  const org = data.org || DEFAULT_DOC_ORG;
  return `<div style="${baseStyle}">
    ${logoHeader(org)}
    <div style="text-align:center;margin:16px 0">
      <div style="font-size:17px;font-weight:900;color:#2d5a1b;text-transform:uppercase">Farmer Payment Receipt & Acknowledgement</div>
      <div style="font-size:11px;color:#888">Document No.: DOC/OPS/007</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:#f6faf3;padding:12px;border-radius:8px;border:1px solid #c9d8b8">
        <div style="font-size:11px;color:#888;margin-bottom:2px">Receipt No.</div>
        <div style="font-weight:700;color:#2d5a1b">${data.receiptNo}</div>
      </div>
      <div style="background:#f6faf3;padding:12px;border-radius:8px;border:1px solid #c9d8b8">
        <div style="font-size:11px;color:#888;margin-bottom:2px">Payment Date</div>
        <div style="font-weight:700">${data.paymentDate}</div>
      </div>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">A. PROJECT & FARMER DETAILS</div>
      <table style="${tableStyle}">
        ${[['Farmer Name',data.farmerName],['Farmer ID',data.farmerId||'—'],['Village',data.village||'—'],['District',data.district||'—'],['Survey / Gut No.',data.surveyNumber||'—']].map(([k,v])=>`<tr><td style="${tdStyle};color:#666;width:40%">${k}</td><td style="${tdStyle};font-weight:600">${v}</td></tr>`).join('')}
      </table>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">B. PAYMENT DETAILS</div>
      <table style="${tableStyle}">
        <tr><th style="${thStyle}">Particular</th><th style="${thStyle}">Amount (₹)</th></tr>
        <tr><td style="${tdStyle}">${data.paymentType}</td><td style="${tdStyle};font-weight:700">₹${data.amount.toLocaleString('en-IN')}</td></tr>
        <tr style="background:#f6faf3"><td style="${tdStyle};font-weight:700">Net Amount Paid</td><td style="${tdStyle};font-weight:900;font-size:16px;color:#2d5a1b">₹${data.amount.toLocaleString('en-IN')}</td></tr>
      </table>
      ${data.amountWords ? `<p style="font-size:12px"><strong>Amount in Words:</strong> ${data.amountWords}</p>` : ''}
      ${data.period ? `<p style="font-size:12px"><strong>Payment Period:</strong> ${data.period}</p>` : ''}
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">C. PAYMENT MODE</div>
      <table style="${tableStyle}">
        ${[['Mode',data.paymentMode],['UTR / Reference No.',data.utrNumber||'—'],['Bank Name',data.bankName||'—']].map(([k,v])=>`<tr><td style="${tdStyle};color:#666;width:40%">${k}</td><td style="${tdStyle};font-weight:600">${v}</td></tr>`).join('')}
      </table>
    </div>

    ${data.notes ? `<div style="${sectionStyle}"><div style="${headingStyle}">D. NOTES</div><p style="font-size:13px">${data.notes}</p></div>` : ''}

    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
      <div>
        <div style="${headingStyle}">LANDOWNER ACKNOWLEDGEMENT</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:11px;color:#666">${data.farmerName}</div>
          <div style="font-size:11px;color:#666">Date: ___________</div>
        </div>
      </div>
      ${signatureBlock('PREPARED BY', '', '', data.preparedBySignature)}
      ${signatureBlock('AUTHORISED BY', org.name, org.name, data.orgSignatory)}
    </div>
  </div>`;
}

// ── 4. Sapling Receipt ────────────────────────────────────────────────────────
export function generateSaplingReceipt(data: {
  farmerName: string; farmerId?: string; village?: string;
  surveyNumber?: string; date: string; projectName?: string;
  species: Array<{ name: string; qty: number; condition?: string }>;
  totalSaplings: number; fieldOfficer?: string; org?: DocOrg;
  fieldOfficerSignature?: DocSignatory; orgSignatory?: DocSignatory;
}) {
  const org = data.org || DEFAULT_DOC_ORG;
  return `<div style="${baseStyle}">
    ${logoHeader(org)}
    <div style="text-align:center;margin:16px 0">
      <div style="font-size:17px;font-weight:900;color:#2d5a1b;text-transform:uppercase">Sapling Receipt cum Handover Form</div>
      <div style="font-size:11px;color:#888">Document No.: DOC/OPS/001</div>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">PROJECT & FARMER DETAILS</div>
      <table style="${tableStyle}">
        ${[['Farmer Name',data.farmerName],['Farmer ID',data.farmerId||'—'],['Project Name',data.projectName||org.name],['Village',data.village||'—'],['Survey No.',data.surveyNumber||'—'],['Date of Distribution',data.date]].map(([k,v])=>`<tr><td style="${tdStyle};color:#666;width:40%">${k}</td><td style="${tdStyle};font-weight:600">${v}</td></tr>`).join('')}
      </table>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">SAPLING DETAILS</div>
      <table style="${tableStyle}">
        <tr>
          <th style="${thStyle}">Species</th>
          <th style="${thStyle}">Qty Issued</th>
          <th style="${thStyle}">Qty Received</th>
          <th style="${thStyle}">Condition</th>
        </tr>
        ${data.species.map(s=>`<tr><td style="${tdStyle}">${s.name}</td><td style="${tdStyle};text-align:center">${s.qty}</td><td style="${tdStyle}"></td><td style="${tdStyle}">${s.condition||'Good'}</td></tr>`).join('')}
        <tr style="background:#f6faf3;font-weight:700"><td style="${tdStyle}">Total</td><td style="${tdStyle};text-align:center">${data.totalSaplings}</td><td style="${tdStyle}"></td><td style="${tdStyle}"></td></tr>
      </table>
    </div>

    <div style="${sectionStyle}">
      <p style="font-size:13px"><em>I acknowledge receipt of the above saplings in good condition and agree to plant and maintain them in accordance with the ${org.name} Programme.</em></p>
    </div>

    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
      <div>
        <div style="${headingStyle}">FARMER</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:11px;color:#666">${data.farmerName}</div>
          <div style="font-size:11px;color:#888">Signature / Thumb Impression</div>
          <div style="font-size:11px;color:#666">Date: ___________</div>
        </div>
      </div>
      ${signatureBlock('FIELD OFFICER', 'Name & Signature', data.fieldOfficer || '', data.fieldOfficerSignature)}
      ${signatureBlock('AUTHORISED BY', org.name, org.name, data.orgSignatory)}
    </div>
  </div>`;
}

// ── 5. Plantation Certificate ─────────────────────────────────────────────────
export function generatePlantationCertificate(data: {
  farmerName: string; farmerId?: string; village?: string;
  surveyNumber?: string; areaAcres?: number; gisId?: string;
  plantationDate?: string; completionDate?: string;
  species: Array<{ name: string; qty: number }>;
  totalTrees: number; plantationType?: string; fieldOfficer?: string;
  gpsCoords?: string; projectName?: string; date?: string; org?: DocOrg;
  fieldOfficerSignature?: DocSignatory; orgSignatory?: DocSignatory;
}) {
  const org = data.org || DEFAULT_DOC_ORG;
  const date = data.date || new Date().toLocaleDateString('en-IN');
  return `<div style="${baseStyle}">
    ${logoHeader(org)}
    <div style="text-align:center;margin:16px 0;padding:16px;background:#f6faf3;border:2px solid #2d5a1b;border-radius:8px">
      <div style="font-size:18px;font-weight:900;color:#2d5a1b;text-transform:uppercase">Plantation Completion Certificate</div>
      <div style="font-size:11px;color:#888">Document No.: DOC/OPS/002 | Issued: ${date}</div>
      <div style="font-size:11px;color:#888">Farmer ID: ${data.farmerId||'—'} | GIS ID: ${data.gisId||'—'}</div>
      ${data.projectName ? `<div style="font-size:12px;color:#2d5a1b;font-weight:700;margin-top:4px">${data.projectName}</div>` : ''}
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">PROJECT DETAILS</div>
      <table style="${tableStyle}">
        ${[['Farmer / Landowner',data.farmerName],['Village',data.village||'—'],['Survey / Gut No.',data.surveyNumber||'—'],['Area (Acres)',data.areaAcres||'—'],['Date of Plantation',data.plantationDate||'—'],['Date of Completion',data.completionDate||'—'],['Plantation Type',data.plantationType||'—'],['GPS Coordinates',data.gpsCoords||'—'],['GIS Polygon ID',data.gisId||'—']].map(([k,v])=>`<tr><td style="${tdStyle};color:#666;width:45%">${k}</td><td style="${tdStyle};font-weight:600">${v}</td></tr>`).join('')}
      </table>
    </div>

    <div style="${sectionStyle}">
      <div style="${headingStyle}">PLANTATION SUMMARY</div>
      <table style="${tableStyle}">
        <tr><th style="${thStyle}">Species</th><th style="${thStyle}">Qty Planted</th></tr>
        ${data.species.map(s=>`<tr><td style="${tdStyle}">${s.name}</td><td style="${tdStyle};text-align:center">${s.qty}</td></tr>`).join('')}
        <tr style="background:#f6faf3;font-weight:700"><td style="${tdStyle}">Total Trees Planted</td><td style="${tdStyle};text-align:center;color:#2d5a1b;font-size:16px">${data.totalTrees}</td></tr>
      </table>
    </div>

    <div style="${sectionStyle};background:#f6faf3;padding:12px;border-radius:8px;border-left:4px solid #2d5a1b">
      <p style="font-size:13px"><strong>Certification:</strong> This is to certify that the plantation of <strong>${data.totalTrees} trees</strong> has been successfully completed on the above-mentioned land parcel under the ${org.name} Programme. All trees are geo-tagged and will be monitored periodically.</p>
    </div>

    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
      <div>
        <div style="${headingStyle}">LANDOWNER</div>
        <div style="margin-top:40px;border-top:1px solid #333;padding-top:8px">
          <div style="font-size:11px;color:#666">${data.farmerName}</div>
          <div style="font-size:11px;color:#666">Date: ___________</div>
        </div>
      </div>
      ${signatureBlock('FIELD OFFICER', '', data.fieldOfficer || '', data.fieldOfficerSignature)}
      ${signatureBlock('PROJECT AUTHORITY', '', org.name, data.orgSignatory)}
    </div>
  </div>`;
}
