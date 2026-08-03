export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-16 max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-forest-950 mb-2">Refund Policy</h1>
        <p className="text-sage-400 text-sm mb-10">Last updated: June 2026</p>
        {[
          { h:'General Policy', p:'Donations made to JITO Green Legacy are generally non-refundable, as they are used directly for tree plantation activities and farmer livelihood support.' },
          { h:'Exceptional Refunds', p:'Refunds may be considered in exceptional circumstances at the sole discretion of JITO Green Legacy. To request a refund, please contact mumbaizoneJES@jito.org within 7 days of donation with your receipt number and reason.' },
          { h:'Failed Transactions', p:'In the event of a payment failure where money is deducted but no donation is recorded, the amount will be automatically refunded to your account within 5–7 business days as per Razorpay payment gateway policies.' },
          { h:'Duplicate Payments', p:'If you have made a duplicate payment, please contact us immediately at mumbaizoneJES@jito.org with both receipt numbers. We will investigate and process a refund for the duplicate within 10 business days.' },
          { h:'How to Contact Us', p:'Email: mumbaizoneJES@jito.org\nPhone: +91 91377 41905\nPlease include your receipt number, name, and email in all refund requests.' },
        ].map(s=>(
          <div key={s.h} className="mb-8">
            <h2 className="font-display text-xl text-forest-950 mb-2">{s.h}</h2>
            <p className="text-sage-600 leading-relaxed whitespace-pre-line">{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
