// src/lib/labels.ts — Bilingual field labels (English / Hindi)
export const L = {
  // Personal
  fullName:       { en: 'Full Name',          hi: 'पूरा नाम' },
  fatherName:     { en: "Father's Name",       hi: 'पिता का नाम' },
  dateOfBirth:    { en: 'Date of Birth',       hi: 'जन्म तिथि' },
  gender:         { en: 'Gender',              hi: 'लिंग' },
  aadhaar:        { en: 'Aadhaar Number',      hi: 'आधार नंबर' },
  pan:            { en: 'PAN Number',          hi: 'पैन नंबर' },
  mobile:         { en: 'Mobile Number',       hi: 'मोबाइल नंबर' },
  alternateMobile:{ en: 'Alternate Mobile',    hi: 'वैकल्पिक मोबाइल' },
  email:          { en: 'Email',               hi: 'ईमेल' },
  occupation:     { en: 'Occupation',          hi: 'व्यवसाय' },
  isFarmer:       { en: 'Are you a Farmer?',   hi: 'क्या आप किसान हैं?' },
  farmingExp:     { en: 'Farming Experience',  hi: 'खेती का अनुभव' },
  // Address
  village:        { en: 'Village',             hi: 'गांव' },
  taluka:         { en: 'Taluka',              hi: 'तालुका' },
  district:       { en: 'District',            hi: 'जिला' },
  state:          { en: 'State',               hi: 'राज्य' },
  pincode:        { en: 'Pincode',             hi: 'पिन कोड' },
  // Land
  surveyGut:      { en: 'Survey / Gut Number', hi: 'सर्वे नंबर / गट नंबर' },
  khata:          { en: 'Khata Number',        hi: 'खाता नंबर' },
  areaAcres:      { en: 'Total Area (Acres)',  hi: 'कुल क्षेत्र (एकड़)' },
  areaOffered:    { en: 'Area Offered for Project', hi: 'परियोजना हेतु उपलब्ध भूमि' },
  landType:       { en: 'Land Type',           hi: 'भूमि प्रकार' },
  gps:            { en: 'GPS Coordinates',     hi: 'GPS निर्देशांक' },
  ownershipType:  { en: 'Ownership Type',      hi: 'स्वामित्व प्रकार' },
  // Species
  species:        { en: 'Preferred Species',   hi: 'पसंदीदा प्रजातियाँ' },
  plantationType: { en: 'Plantation Type',     hi: 'रोपण प्रकार' },
  treeCount:      { en: 'Number of Trees',     hi: 'पेड़ों की संख्या' },
  startDate:      { en: 'Preferred Start Date',hi: 'पसंदीदा प्रारंभ तिथि' },
  // Bank
  accountName:    { en: 'Account Holder Name', hi: 'खाताधारक का नाम' },
  bankName:       { en: 'Bank Name',           hi: 'बैंक का नाम' },
  accountNo:      { en: 'Account Number',      hi: 'खाता संख्या' },
  ifsc:           { en: 'IFSC Code',           hi: 'IFSC कोड' },
  // Nominee
  nomineeName:    { en: 'Nominee Name',        hi: 'नामांकित व्यक्ति का नाम' },
  nomineeRel:     { en: 'Relationship',        hi: 'संबंध' },
  nomineeDob:     { en: 'Date of Birth',       hi: 'जन्म तिथि' },
  nomineeMobile:  { en: 'Mobile Number',       hi: 'मोबाइल नंबर' },
  nomineeAddress: { en: 'Address',             hi: 'पता' },
  nomineeAadhaar: { en: 'Aadhaar Number (Optional)', hi: 'आधार नंबर (वैकल्पिक)' },
} as const;

// Render bilingual label
export function biLabel(key: keyof typeof L): string {
  return `${L[key].en} / ${L[key].hi}`;
}
