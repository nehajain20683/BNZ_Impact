export default function Terms() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Terms & Conditions</h1>
        <p className="text-sage-400 text-sm mb-10">Last updated: June 2026</p>
        {[
          { h:'1. Donations', p:'All donations made through JITO Green Legacy are voluntary. Donations are used exclusively for tree plantation activities, farmer payments, and programme operations. Donations of ₹500 per tree are eligible for 80G tax deduction subject to verification.' },
          { h:'2. Tree Sponsorships', p:'Each tree sponsorship of ₹500 entitles the donor to a geo-tagged tree allocated on verified private land in Palghar district, Maharashtra. The donor receives a personalised digital certificate and access to a monitoring dashboard.' },
          { h:'3. Tree Plantation Process', p:'Trees are planted by our partner farmers on their registered land parcels. Planting timelines are subject to seasonal and agricultural factors. JITO Green Legacy commits to planting all sponsored trees within 12 months of donation.' },
          { h:'4. User Responsibilities', p:'Users must provide accurate information during registration and donation. Providing false information, particularly PAN numbers for 80G claims, is a legal offence.' },
          { h:'5. Limitation of Liability', p:'JITO Green Legacy shall not be liable for force majeure events including floods, drought, or natural disasters that affect plantation survival rates. We commit to best-effort replacement of trees with a survival rate below 80%.' },
          { h:'6. Governing Law', p:'These terms are governed by the laws of India and subject to the jurisdiction of courts in Mumbai, Maharashtra.' },
        ].map(s=>(
          <div key={s.h} className="mb-8">
            <h2 className="font-display text-xl text-forest-950 mb-2">{s.h}</h2>
            <p className="text-sage-600 leading-relaxed">{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
