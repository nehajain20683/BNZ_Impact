export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Privacy Policy</h1>
        <p className="text-sage-400 text-sm mb-10">Last updated: June 2026</p>
        {[
          { h:'1. Data We Collect', p:'We collect your name, email address, mobile number, PAN number (optional), and payment information when you make a donation. For farmer registrations, we collect Aadhaar, bank account details, and land information as required for the programme.' },
          { h:'2. How We Use Your Data', p:'Your data is used to process donations, generate 80G tax receipts, issue tree sponsorship certificates, send confirmation emails, and communicate programme updates. We do not sell your data to third parties.' },
          { h:'3. Data Storage & Security', p:'All data is stored on Supabase (PostgreSQL), hosted on AWS. Payment data is processed through Razorpay and is PCI-DSS compliant. We use encryption in transit (TLS) and at rest.' },
          { h:'4. Cookies', p:'We use essential cookies for authentication and session management only. We do not use tracking or advertising cookies.' },
          { h:'5. Third-Party Services', p:'We use Razorpay for payment processing, Resend for transactional emails, and Supabase for database storage. Each service has its own privacy policy.' },
          { h:'6. Your Rights', p:'You may request access to, correction of, or deletion of your personal data by contacting mumbaizoneJES@jito.org. We will respond within 30 days.' },
          { h:'7. Contact', p:'For privacy concerns, contact us at mumbaizoneJES@jito.org or +91 91377 41905.' },
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
