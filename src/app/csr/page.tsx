'use client';
// src/app/csr/page.tsx
import { useState } from 'react';
import { Building2, FileBarChart, Award, Leaf } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { INDIVIDUAL_TREE_PRICE, formatCurrency } from '@/lib/utils';

const CSR_BENEFITS = [
  { icon: FileBarChart, title: 'ESG Reporting', desc: 'Receive geo-tagged data and impact reports compatible with GRI, BRSR, and SEBI ESG standards.' },
  { icon: Award, title: 'Brand Visibility', desc: 'Your company name and logo on plantation site boards, certificates, and our public impact dashboard.' },
  { icon: Leaf, title: 'Carbon Credits', desc: 'Offsetting data that can be used toward your Scope 3 emissions reporting and net-zero commitments.' },
  { icon: Building2, title: 'CSR Compliance', desc: 'Fully compliant with Section 135 of Companies Act 2013. Certificates and audited reports provided.' },
];

export default function CSRPage() {
  const org = useOrgConfig();
  const [form, setForm] = useState({ company: '', contact: '', email: '', phone: '', requirement: '', budget: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await fetch('/api/csr-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#fafdf7]">
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-block bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">Corporate CSR</div>
            <h1 className="font-display text-5xl text-sage-950 mb-4">Green your CSR mandate</h1>
            <p className="text-sage-600 text-lg max-w-xl mx-auto">
              Partner with us to plant thousands of trees, meet your ESG targets, and build a lasting green brand legacy.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {CSR_BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-sage-100 rounded-2xl p-6">
                <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-sage-700" />
                </div>
                <h3 className="font-semibold text-sage-900 mb-2">{title}</h3>
                <p className="text-sage-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Inquiry Form */}
            <div className="bg-white border border-sage-100 rounded-2xl p-8">
              <h2 className="font-display text-2xl text-sage-950 mb-6">Get in Touch</h2>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🌳</div>
                  <h3 className="font-display text-xl text-sage-900 mb-2">Thank you!</h3>
                  <p className="text-sage-600">Our CSR team will reach out within 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'company', label: 'Company Name *', placeholder: 'Acme Corp Pvt. Ltd.' },
                    { key: 'contact', label: 'Contact Person *', placeholder: 'Rajesh Sharma' },
                    { key: 'email', label: 'Email *', placeholder: 'rajesh@acmecorp.com' },
                    { key: 'phone', label: 'Phone *', placeholder: '+91 98765 43210' },
                    { key: 'budget', label: 'Approximate CSR Budget', placeholder: '₹5,00,000' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm text-sage-700 font-medium mb-1">{f.label}</label>
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border border-forest-200 rounded-xl px-4 py-3 text-sage-900 placeholder-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm text-sage-700 font-medium mb-1">Your Requirement</label>
                    <textarea
                      rows={3}
                      placeholder="Number of trees, location preference, timeline..."
                      value={form.requirement}
                      onChange={e => setForm(prev => ({ ...prev, requirement: e.target.value }))}
                      className="w-full border border-forest-200 rounded-xl px-4 py-3 text-sage-900 placeholder-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-sage-600 hover:bg-forest-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit Inquiry'}
                  </button>
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="space-y-6">
              <div className="bg-sage-800 text-white rounded-2xl p-8">
                <h3 className="font-display text-2xl mb-4 text-sage-300">Why corporates choose us</h3>
                <ul className="space-y-3 text-sage-300 text-sm">
                  {[
                    '500+ corporate partners across India',
                    'Geo-tagged proof of every tree planted',
                    'BRSR and GRI-compatible impact reports',
                    '80G and CSR certificate for compliance',
                    'Dedicated CSR account manager',
                    'Custom plantation sites on request',
                    'Employee volunteering programs',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-sage-500 mt-0.5">✓</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-sage-100 rounded-2xl p-6 text-center">
                <div className="font-display text-3xl text-sage-900 font-bold mb-1">{formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}</div>
                <div className="text-sage-600 text-sm">per tree (bulk pricing available)</div>
                <div className="text-sage-500 text-xs mt-2">Minimum 50 trees for CSR packages</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
