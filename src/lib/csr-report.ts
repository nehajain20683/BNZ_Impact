// src/lib/csr-report.ts
// A CSR Impact Report is scoped to one donor (typically one company),
// aggregated across every completed donation they've made — not per
// campaign, since a real CSR relationship is usually "this company funded
// us," which can span several campaigns over time. Reuses the same
// org-branding and signature pattern as every other generated document
// this session, rather than inventing a separate styling system.
import { PdfOrgBranding } from './pdf';

type DocSignatory = { name: string; designation: string; signatureImage: string } | null | undefined;

export type CSRReportData = {
  donorName: string;
  reportPeriod: string; // e.g. "Apr 2025 – Mar 2026" or "All-time"
  generatedOn: string;
  totalDonated: number;
  totalTreesSponsored: number;
  totalTreesPlanted: number;
  survivalPct: number | null;
  estimatedCO2Kg: number;
  campaigns: { name: string; trees: number; amount: number }[];
  sites: { name: string; district: string; state: string; trees: number; survivalPct: number | null }[];
  species: { name: string; count: number; pct: number }[];
  samplePhotos: string[]; // real GPS-captured tree photos, not stock images
  org: PdfOrgBranding;
  orgSignatory?: DocSignatory;
};

function fmtINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function generateCSRImpactReport(d: CSRReportData): string {
  const org = d.org;
  const logo = org.logoUrl
    ? `<img src="${org.logoUrl}" style="height:44px" alt="${org.name}"/>`
    : `<div style="font-size:20px;font-weight:900;color:#1a3a1a">${org.name}</div>`;

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;color:#1f2a1a;font-size:13px;line-height:1.5">

    <!-- Cover header -->
    <div style="background:#1a3a1a;color:#fff;padding:36px 40px;border-radius:0 0 16px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px">
        ${logo}
        <div style="text-align:right;font-size:11px;color:#c8dcc0">Generated ${d.generatedOn}</div>
      </div>
      <div style="font-size:12px;letter-spacing:2px;color:#9fc08f;font-weight:700;text-transform:uppercase">CSR Impact Report</div>
      <div style="font-size:28px;font-weight:900;margin-top:6px">${d.donorName}</div>
      <div style="font-size:13px;color:#c8dcc0;margin-top:4px">Reporting period: ${d.reportPeriod}</div>
    </div>

    <!-- Headline stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px 40px 0">
      ${[
        [fmtINR(d.totalDonated), 'Total CSR Contribution'],
        [String(d.totalTreesSponsored), 'Trees Sponsored'],
        [d.survivalPct != null ? `${d.survivalPct}%` : '—', 'Verified Survival Rate'],
        [`${Math.round(d.estimatedCO2Kg).toLocaleString('en-IN')} kg`, 'Estimated CO₂ Sequestered / yr'],
      ].map(([v, l]) => `
        <div style="background:#f2f7ee;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:22px;font-weight:900;color:#1a3a1a">${v}</div>
          <div style="font-size:10.5px;color:#5a6b52;margin-top:2px">${l}</div>
        </div>`).join('')}
    </div>

    <!-- Narrative -->
    <div style="margin:28px 40px 0;padding:18px 20px;background:#fbfbf8;border-left:3px solid #9fc08f;border-radius:0 8px 8px 0">
      <p style="margin:0">
        Through ${d.donorName}'s support, ${org.name} has sponsored <strong>${d.totalTreesSponsored} trees</strong>
        across ${d.sites.length} plantation site${d.sites.length === 1 ? '' : 's'}, of which
        <strong>${d.totalTreesPlanted}</strong> have been physically planted and geo-tagged to date.
        Every tree in this report carries a GPS-verified, timestamped photo captured by a field officer at
        the time of planting — not a summary count.
      </p>
    </div>

    <!-- Campaigns funded -->
    ${d.campaigns.length > 0 ? `
    <div style="margin:28px 40px 0">
      <div style="font-size:14px;font-weight:800;color:#1a3a1a;margin-bottom:10px">Campaigns Supported</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:#f2f7ee;text-align:left">
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Campaign</th>
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Trees</th>
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Amount</th>
        </tr></thead>
        <tbody>
          ${d.campaigns.map(c => `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${c.name}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${c.trees}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${fmtINR(c.amount)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Site breakdown -->
    ${d.sites.length > 0 ? `
    <div style="margin:28px 40px 0">
      <div style="font-size:14px;font-weight:800;color:#1a3a1a;margin-bottom:10px">Where the Trees Are Growing</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:#f2f7ee;text-align:left">
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Site</th>
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Location</th>
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Trees</th>
          <th style="padding:8px 10px;border-bottom:1px solid #dde5d6">Survival</th>
        </tr></thead>
        <tbody>
          ${d.sites.map(s => `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${s.name}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${[s.district, s.state].filter(Boolean).join(', ') || '—'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${s.trees}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${s.survivalPct != null ? s.survivalPct + '%' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Species mix -->
    ${d.species.length > 0 ? `
    <div style="margin:28px 40px 0">
      <div style="font-size:14px;font-weight:800;color:#1a3a1a;margin-bottom:10px">Species Planted</div>
      ${d.species.slice(0, 8).map(sp => `
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#3a4a34;margin-bottom:2px">
            <span>${sp.name}</span><span>${sp.count} (${sp.pct}%)</span>
          </div>
          <div style="height:6px;background:#eef2ea;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${sp.pct}%;background:#5f8a4c"></div>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Evidence photos -->
    ${d.samplePhotos.length > 0 ? `
    <div style="margin:28px 40px 0">
      <div style="font-size:14px;font-weight:800;color:#1a3a1a;margin-bottom:10px">Field Evidence — Real Trees, Real Photos</div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(d.samplePhotos.length, 4)},1fr);gap:8px">
        ${d.samplePhotos.slice(0, 4).map(p => `<img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"/>`).join('')}
      </div>
    </div>` : ''}

    <!-- Signature -->
    <div style="margin:40px 40px 0;padding-top:20px;border-top:1px solid #dde5d6;display:flex;justify-content:space-between;align-items:flex-end">
      <div style="font-size:10.5px;color:#8a9782">
        This report reflects verified data as of ${d.generatedOn}. GPS coordinates and capture timestamps
        for every tree referenced are available on request.
      </div>
      ${d.orgSignatory ? `
        <div style="text-align:center;flex-shrink:0;margin-left:20px">
          <img src="${d.orgSignatory.signatureImage}" style="height:34px;display:block;margin:0 auto 2px"/>
          <div style="font-size:11px;font-weight:700;color:#1a3a1a">${d.orgSignatory.name}</div>
          <div style="font-size:10px;color:#8a9782">${d.orgSignatory.designation}</div>
        </div>` : ''}
    </div>

    <div style="margin:24px 40px 40px;text-align:center;font-size:10px;color:#a5b09c">
      ${org.name} · Generated by BNZ Impact
    </div>
  </div>`;
}
