'use client';
// src/app/contact/page.tsx
import { useState } from 'react';
import Image from 'next/image';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { useOrgConfig } from '@/components/OrgConfigProvider';

const inputCls = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white";

export default function ContactPage() {
  const org = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const [form, setForm]     = useState({ name:'', mobile:'', email:'', subject:'', message:'' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res  = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) setSent(true);
    else setError(data.error || 'Failed to send. Please try again.');
  }

  return (
    <div className="min-h-screen bg-cream-50">
           <div className="pt-16">

        {/* Hero — a real photo shown as itself, plain dark overlay only
            for text contrast, no org-color tint over the image. */}
        <section className="relative text-white py-16 px-4 text-center overflow-hidden">
          <Image src="/images/banners/hands-holding-tree.png" alt="" fill className="object-cover" priority/>
          <div className="absolute inset-0 bg-black/45"/>
          <div className="relative">
            <p className="text-white/80 text-sm tracking-widest uppercase mb-2">Get In Touch</p>
            <h1 className="font-display text-4xl mb-3">Contact Us</h1>
            <p className="text-white/85 max-w-xl mx-auto">We'd love to hear from you. Reach out for any questions about tree sponsorship, partnerships, or the {org.loaded ? org.name : 'BNZ Impact'} programme.</p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">

            {/* Contact Info */}
            <div className="space-y-5">
              <h2 className="font-display text-xl text-forest-950 mb-4">Contact Information</h2>
              {[
                { icon: Mail,    label:'Email',   value: org.email || 'info@bnzgreen.io', href:`mailto:${org.email || 'info@bnzgreen.io'}` },
                { icon: Phone,   label:'Phone',   value: org.phone || '+91 9372989074',   href:`tel:${(org.phone || '+919372989074').replace(/\s/g,'')}` },
                { icon: MapPin,  label:'Address', value:'Mumbai, Maharashtra, India', href:null },
              ].map(c=>(
                <div key={c.label} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <c.icon className="w-5 h-5 text-sage-600"/>
                  </div>
                  <div>
                    <div className="text-sage-400 text-xs font-semibold uppercase tracking-wide">{c.label}</div>
                    {c.href
                      ? <a href={c.href} className="text-forest-950 font-medium text-sm hover:text-sage-700">{c.value}</a>
                      : <div className="text-forest-950 font-medium text-sm">{c.value}</div>
                    }
                  </div>
                </div>
              ))}

              <div className="bg-sage-50 rounded-2xl border border-sage-100 p-5 mt-6">
                <p className="text-sage-600 text-sm leading-relaxed">
                  For tree sponsorship enquiries, please visit our{' '}
                  <a href="/campaigns" className="text-sage-700 font-semibold hover:underline">Campaigns page</a>.
                  For farmer partnership enquiries, please use the form.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2">
              {sent ? (
                <div className="bg-green-50 border border-green-200 rounded-3xl p-10 text-center">
                  <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4"/>
                  <h3 className="font-display text-2xl text-forest-950 mb-2">Message Sent!</h3>
                  <p className="text-sage-600">Thank you for reaching out. We'll get back to you within 24 hours at <strong>{form.email}</strong>.</p>
                  <button onClick={()=>{setSent(false); setForm({name:'',mobile:'',email:'',subject:'',message:''}); }}
                    className="mt-5 text-sage-600 hover:underline text-sm">Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-sage-100 p-7 shadow-sm space-y-4">
                  <h2 className="font-display text-xl text-forest-950 mb-2">Send a Message</h2>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">{error}</div>}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1">Full Name *</label>
                      <input required type="text" placeholder="Your name" value={form.name}
                        onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inputCls}/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1">Mobile *</label>
                      <input required type="tel" placeholder="+91 98765 43210" value={form.mobile}
                        onChange={e=>setForm(f=>({...f,mobile:e.target.value}))} className={inputCls}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-1">Email *</label>
                    <input required type="email" placeholder="you@example.com" value={form.email}
                      onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inputCls}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-1">Subject *</label>
                    <select required value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} className={inputCls}>
                      <option value="">Select a subject</option>
                      <option>Tree Sponsorship Enquiry</option>
                      <option>Farmer Partnership</option>
                      <option>Corporate / CSR Partnership</option>
                      <option>Media & Press</option>
                      <option>Volunteer Enquiry</option>
                      <option>General Enquiry</option>
                      <option>Technical Support</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-1">Message *</label>
                    <textarea required rows={5} placeholder="Write your message here..." value={form.message}
                      onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                      className={inputCls + " resize-none"}/>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full text-white font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                    style={{ backgroundColor: primaryColor }}>
                    <Send className="w-4 h-4"/>
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
      </div>
  );
}
