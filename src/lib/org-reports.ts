// src/lib/org-reports.ts
// Explanatory, org-wide reports — narrative + context around the numbers,
// not a raw table dump. Each one pairs with the equivalent CSV export
// already on the Reports page; the CSV stays as the "give me the raw
// rows" option, this is the "explain what happened" option.
import { PdfOrgBranding } from './pdf';
import { reportHeader, statCards, narrative, sectionTitle, dataTable, barList, photoGrid, footer, wrapReport, DocSignatory } from './report-shell';

type Common = { org: PdfOrgBranding; orgSignatory?: DocSignatory; generatedOn: string };

// ─── 1. Fundraising & Donor Report ─────────────────────────────────────────
export function generateFundraisingReport(d: Common & {
  totalRaised: number; donorCount: number; totalTreesSponsored: number; avgDonation: number;
  campaigns: { name: string; donors: number; trees: number; amount: number }[];
  monthly: { month: string; amount: number }[];
}): string {
  const peakMonth = [...d.monthly].sort((a, b) => b.amount - a.amount)[0];
  return wrapReport(
    reportHeader('Fundraising & Donor Report', d.org.name, 'All-time, across every campaign', d.org, d.generatedOn) +
    statCards([
      { value: '₹' + Math.round(d.totalRaised).toLocaleString('en-IN'), label: 'Total Raised' },
      { value: String(d.donorCount), label: 'Unique Donors' },
      { value: String(d.totalTreesSponsored), label: 'Trees Sponsored' },
      { value: '₹' + Math.round(d.avgDonation).toLocaleString('en-IN'), label: 'Average Donation' },
    ]) +
    narrative(
      `${d.donorCount} donor${d.donorCount === 1 ? ' has' : 's have'} contributed a total of
      ₹${Math.round(d.totalRaised).toLocaleString('en-IN')} across ${d.campaigns.length} campaign${d.campaigns.length === 1 ? '' : 's'},
      sponsoring ${d.totalTreesSponsored} trees.` +
      (peakMonth ? ` The strongest month was <strong>${peakMonth.month}</strong>, raising ₹${Math.round(peakMonth.amount).toLocaleString('en-IN')}.` : '')
    ) +
    sectionTitle('By Campaign') +
    dataTable(['Campaign', 'Donors', 'Trees', 'Amount Raised'],
      d.campaigns.map(c => [c.name, c.donors, c.trees, '₹' + Math.round(c.amount).toLocaleString('en-IN')])) +
    sectionTitle('Monthly Trend') +
    dataTable(['Month', 'Amount Raised'],
      d.monthly.map(m => [m.month, '₹' + Math.round(m.amount).toLocaleString('en-IN')])) +
    footer(d.org, d.orgSignatory,
      'Figures include only completed, payment-verified donations. Pending or failed transactions are excluded.',
      d.generatedOn)
  );
}

// ─── 2. Land Owner / Farmer Onboarding Report ──────────────────────────────
export function generateLandOwnerReport(d: Common & {
  total: number; verified: number; docsPending: number; registered: number;
  totalLandAcres: number; districts: { name: string; count: number }[];
}): string {
  const verifiedPct = d.total > 0 ? Math.round((d.verified / d.total) * 100) : 0;
  return wrapReport(
    reportHeader('Land Owner Onboarding Report', d.org.name, 'Registration and verification status', d.org, d.generatedOn) +
    statCards([
      { value: String(d.total), label: 'Total Land Owners' },
      { value: `${verifiedPct}%`, label: 'Fully Verified' },
      { value: String(d.docsPending), label: 'Documents Pending' },
      { value: Math.round(d.totalLandAcres).toLocaleString('en-IN'), label: 'Total Acres Registered' },
    ]) +
    narrative(
      `${d.total} land owner${d.total === 1 ? ' has' : 's have'} been registered on the platform, of whom
      <strong>${d.verified} (${verifiedPct}%)</strong> have completed full document and land verification.
      ${d.docsPending > 0 ? `${d.docsPending} registration${d.docsPending === 1 ? ' is' : 's are'} still awaiting document review.` : 'No registrations are currently awaiting document review.'}
      Together, they've registered ${Math.round(d.totalLandAcres).toLocaleString('en-IN')} acres of land for plantation.`
    ) +
    sectionTitle('By District') +
    dataTable(['District', 'Land Owners'], d.districts.map(dd => [dd.name, dd.count])) +
    footer(d.org, d.orgSignatory,
      'Verification status reflects the admin document-review workflow — a land owner counts as "Fully Verified" only once every required identity and land document has been individually approved.',
      d.generatedOn)
  );
}

// ─── 3. Plantation Progress Report ─────────────────────────────────────────
export function generatePlantationReport(d: Common & {
  totalPlanted: number; totalPlanned: number; siteCount: number; totalAcres: number;
  sites: { name: string; phase: string; planted: number; planned: number; district: string }[];
  species: { name: string; count: number; pct: number }[];
}): string {
  const progressPct = d.totalPlanned > 0 ? Math.round((d.totalPlanted / d.totalPlanned) * 100) : null;
  return wrapReport(
    reportHeader('Plantation Progress Report', d.org.name, 'Site-by-site status across the organisation', d.org, d.generatedOn) +
    statCards([
      { value: String(d.totalPlanted), label: 'Trees Planted' },
      { value: progressPct != null ? `${progressPct}%` : '—', label: 'Of Planned Target' },
      { value: String(d.siteCount), label: 'Active Sites' },
      { value: Math.round(d.totalAcres).toLocaleString('en-IN'), label: 'Total Acres' },
    ]) +
    narrative(
      `${d.totalPlanted.toLocaleString('en-IN')} trees have been planted across ${d.siteCount} active site${d.siteCount === 1 ? '' : 's'}` +
      (progressPct != null ? `, reaching ${progressPct}% of the combined planned target of ${d.totalPlanned.toLocaleString('en-IN')} trees.` : '.')
    ) +
    sectionTitle('By Site') +
    dataTable(['Site', 'District', 'Phase', 'Planted', 'Planned'],
      d.sites.map(s => [s.name, s.district || '—', s.phase.replace(/_/g, ' '), s.planted, s.planned || '—'])) +
    (d.species.length > 0 ? sectionTitle('Species Mix (Org-Wide)') + barList(d.species) : '') +
    footer(d.org, d.orgSignatory,
      '"Planted" reflects trees confirmed via field officer data entry, not the original sponsorship count — a tree sponsored but not yet physically planted is not counted here.',
      d.generatedOn)
  );
}

// ─── 4. Carbon / Environmental Impact Report ───────────────────────────────
export function generateCarbonReport(d: Common & {
  totalTrees: number; totalCO2Kg: number;
  sites: { name: string; trees: number; co2Kg: number }[];
}): string {
  return wrapReport(
    reportHeader('Environmental Impact Report', d.org.name, 'Estimated carbon sequestration', d.org, d.generatedOn) +
    statCards([
      { value: d.totalTrees.toLocaleString('en-IN'), label: 'Trees Contributing' },
      { value: (d.totalCO2Kg / 1000).toFixed(1) + ' t', label: 'Estimated CO₂ / yr' },
      { value: Math.round(d.totalCO2Kg / Math.max(d.totalTrees, 1)) + ' kg', label: 'Avg. per Tree / yr' },
      { value: d.sites.length.toString(), label: 'Sites Included' },
    ]) +
    narrative(
      `Based on ${d.totalTrees.toLocaleString('en-IN')} planted trees across ${d.sites.length} site${d.sites.length === 1 ? '' : 's'},
      the estimated annual carbon sequestration is <strong>${(d.totalCO2Kg / 1000).toFixed(1)} tonnes of CO₂</strong>.
      This is a standardised estimate, not a certified carbon credit measurement — see the methodology note below.`
    ) +
    sectionTitle('By Site') +
    dataTable(['Site', 'Trees', 'Est. CO₂ (kg/yr)'],
      d.sites.map(s => [s.name, s.trees, Math.round(s.co2Kg).toLocaleString('en-IN')])) +
    footer(d.org, d.orgSignatory,
      'Methodology: a fixed per-tree absorption estimate (22kg CO₂/year at 87% survival, over a 25-year growth horizon average) applied uniformly across species and sites. This is an indicative planning estimate, not a verified carbon-credit-grade calculation — those require species-specific growth models and third-party MRV audit, which this report does not perform.',
      d.generatedOn)
  );
}

// ─── 5. BRSR Environmental Data Extract (Principle 6) ──────────────────────
export function generateBRSRExtract(d: Common & {
  donorName?: string; financialYear: string;
  totalExpenditure: number; areaHectares: number; treesPlanted: number;
  survivalPct: number | null; co2TonnesPerYear: number; landOwnersEngaged: number;
  sites: { name: string; district: string; state: string; gpsVerified: boolean }[];
}): string {
  return wrapReport(
    reportHeader('BRSR Environmental Data Extract', d.donorName ? `Prepared for ${d.donorName}` : d.org.name,
      `Principle 6 (Environment) · Financial Year ${d.financialYear}`, d.org, d.generatedOn) +
    narrative(
      `This extract provides the afforestation-related data points relevant to <strong>Principle 6</strong> of the
      National Guidelines on Responsible Business Conduct (NGRBC), as disclosed under SEBI's Business Responsibility
      and Sustainability Reporting (BRSR) framework. It covers only the environmental restoration activity carried
      out through ${d.org.name} — it is <strong>not a complete BRSR filing</strong>. Other principles (governance,
      employee wellbeing, supply chain, product responsibility) require data outside this platform's scope and
      should be sourced separately.`
    ) +
    statCards([
      { value: '₹' + Math.round(d.totalExpenditure).toLocaleString('en-IN'), label: 'CSR Expenditure (FY)' },
      { value: d.areaHectares.toFixed(1) + ' ha', label: 'Area Under Afforestation' },
      { value: d.treesPlanted.toLocaleString('en-IN'), label: 'Trees Planted' },
      { value: d.co2TonnesPerYear.toFixed(1) + ' tCO₂e', label: 'Est. Sequestration / yr' },
    ]) +
    sectionTitle('Suggested BRSR Disclosure Mapping') +
    dataTable(['BRSR Reference', 'Disclosure', 'Value from this Program'], [
      ['Principle 6, Essential Indicator', 'Area of land restored/reforested', `${d.areaHectares.toFixed(1)} hectares`],
      ['Principle 6, Essential Indicator', 'Number of trees planted', d.treesPlanted.toLocaleString('en-IN')],
      ['Principle 6, Leadership Indicator', 'Estimated GHG sequestration (indicative)', `${d.co2TonnesPerYear.toFixed(1)} tCO₂e/year`],
      ['Principle 8', 'Local communities engaged (land owners)', d.landOwnersEngaged.toLocaleString('en-IN')],
      ['Principle 6', 'Survival / verification rate', d.survivalPct != null ? `${d.survivalPct}%` : 'Not yet measured'],
    ]) +
    sectionTitle('Sites Included in This Extract') +
    dataTable(['Site', 'District', 'State', 'GPS-Verified'],
      d.sites.map(s => [s.name, s.district || '—', s.state || '—', s.gpsVerified ? 'Yes' : 'Pending'])) +
    footer(d.org, d.orgSignatory,
      `Figures cover Financial Year ${d.financialYear} (1 April – 31 March), matching standard Indian reporting periods. GPS coordinates, timestamps, and field officer identity for every tree referenced are retained and available for third-party audit on request. This extract does not itself constitute assurance — a company's statutory auditor or an independent assurance provider remains responsible for verifying figures before filing.`,
      d.generatedOn)
  );
}

// ─── 6. GIS Annexure ────────────────────────────────────────────────────
export function generateGISAnnexure(d: Common & {
  sites: {
    name: string; district: string; state: string;
    gpsLatitude: number | null; gpsLongitude: number | null;
    areaAcres: number | null;
    parcels: { farmerName: string; polygon: { type: 'Polygon'; coordinates: number[][][] } | null }[];
  }[];
}): string {
  const totalParcels = d.sites.reduce((s, x) => s + x.parcels.length, 0);
  const withBoundary = d.sites.reduce((s, x) => s + x.parcels.filter(p => p.polygon).length, 0);
  const totalAcres = d.sites.reduce((s, x) => s + (x.areaAcres || 0), 0);

  return wrapReport(
    reportHeader('GIS Annexure', d.org.name, 'Site boundaries and coordinate reference', d.org, d.generatedOn) +
    statCards([
      { value: String(d.sites.length), label: 'Sites Included' },
      { value: String(withBoundary), label: 'Parcels With Mapped Boundary' },
      { value: String(totalParcels), label: 'Total Land Parcels' },
      { value: Math.round(totalAcres).toLocaleString('en-IN'), label: 'Total Acres' },
    ]) +
    narrative(
      `This annexure lists the GPS reference point and, where a KML boundary has been parsed, the polygon coordinate
      count for each land parcel across ${d.sites.length} site${d.sites.length === 1 ? '' : 's'}. Coordinates use the
      WGS84 (EPSG:4326) reference system in decimal degrees, consistent with standard registry GIS submission format.`
    ) +
    d.sites.map(s =>
      sectionTitle(`${s.name} — ${[s.district, s.state].filter(Boolean).join(', ') || 'Location not recorded'}`) +
      dataTable(['Land Owner', 'Reference Point (Lat, Lng)', 'Boundary Points', 'Status'],
        s.parcels.length > 0 ? s.parcels.map(p => [
          p.farmerName,
          s.gpsLatitude != null ? `${s.gpsLatitude.toFixed(6)}, ${(s.gpsLongitude ?? 0).toFixed(6)}` : '—',
          p.polygon ? String(p.polygon.coordinates[0].length) : '0',
          p.polygon ? 'Boundary mapped' : 'GPS point only',
        ]) : [])
    ).join('') +
    footer(d.org, d.orgSignatory,
      'Boundary coordinates are derived from KML files uploaded and verified through the platform\'s document workflow, then parsed into GeoJSON polygons. A parcel listed as "GPS point only" has a single reference location on file but no surveyed boundary — its trees are still individually GPS-tagged regardless.',
      d.generatedOn)
  );
}

// ─── 7. Photo Evidence Annexure ────────────────────────────────────────
export function generatePhotoAnnexure(d: Common & {
  totalPhotosAvailable: number;
  photos: { url: string; siteName: string; farmerName: string; capturedAt: Date | string; hasChainOfCustody: boolean }[];
}): string {
  const withHash = d.photos.filter(p => p.hasChainOfCustody).length;
  return wrapReport(
    reportHeader('Photo Evidence Annexure', d.org.name, 'Representative sample of field-captured evidence', d.org, d.generatedOn) +
    statCards([
      { value: d.totalPhotosAvailable.toLocaleString('en-IN'), label: 'Total Photos on File' },
      { value: String(d.photos.length), label: 'Shown in This Annexure' },
      { value: String(withHash), label: 'With Chain-of-Custody Hash' },
    ]) +
    narrative(
      `Every photo referenced here was captured directly through the field officer mobile app at the time of the
      site visit — GPS coordinates and capture timestamp are recorded server-side, not supplied by the uploader.
      This annexure shows a representative sample of ${d.photos.length} out of ${d.totalPhotosAvailable.toLocaleString('en-IN')}
      photos on file; the complete set is retained and available for third-party audit on request.`
    ) +
    photoGrid(d.photos.map(p => ({
      url: p.url,
      caption: `${p.siteName} · ${p.farmerName} · ${new Date(p.capturedAt).toLocaleDateString('en-IN')}${p.hasChainOfCustody ? ' · ✓ hash on file' : ''}`,
    })), 3) +
    footer(d.org, d.orgSignatory,
      'Chain-of-custody hash availability reflects when a photo was captured relative to when that verification layer was introduced — its absence on an older photo doesn\'t indicate a problem with that photo, only that the check didn\'t exist yet at the time it was taken.',
      d.generatedOn)
  );
}
