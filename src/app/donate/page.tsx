'use client';
// src/app/donate/page.tsx — Light theme
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CAMPAIGNS, CAMPAIGN_PACKAGES, INDIVIDUAL_TREE_PRICE, DEDICATION_TYPES, formatCurrency, BRAND, NATURE_IMAGES } from '@/lib/utils';
import { Shield, FileText, TreePine, Minus, Plus } from 'lucide-react';

declare global { interface Window { Razorpay: any; } }

function DonateForm() {
  const params = useSearchParams();
  const router = useRouter();

  const initType     = (params.get('type') || 'campaign') as 'campaign' | 'individual';
  const initCampaign = params.get('campaign') || 'maa';
  const initTrees = (() => {
    const t = params.get('trees');
    if (t) return parseInt(t);
    // Default recommended package per campaign (Dadi=108💎, Maa=54🏆, Beti=27🥇, Poti=11🥈)
    const defaults: Record<string,number> = { dadi:108, maa:54, beti:27, poti:11, individual:11 };
    return defaults[initCampaign] ?? 54;
  })();
  const initAmount   = parseFloat(params.get('amount') || '24300');

  const [donationType, setDonationType]     = useState<'campaign'|'individual'>(initType);
  const [selectedCampaign, setSelectedCampaign] = useState(initCampaign);
  const [selectedTrees, setSelectedTrees]   = useState(initTrees);
  const [amount, setAmount]                 = useState(initAmount);
  const [customTrees, setCustomTrees]       = useState(1);
  const [form, setForm] = useState({ name:'', email:'', mobile:'', address:'', pan:'', dedicationName:'', chapter:'', chapterCustom:'', certificateName:'' });
  const [dbCampaigns, setDbCampaigns]       = useState<any[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : { campaigns: [] })
      .then(d => setDbCampaigns(d.campaigns || []))
      .catch(() => setDbCampaigns([]));
  }, []);

  useEffect(() => {
    if (donationType === 'campaign') {
      const pkg = CAMPAIGN_PACKAGES.find(p=>p.trees===selectedTrees);
      if (pkg) setAmount(pkg.price);
    } else {
      setAmount(customTrees * INDIVIDUAL_TREE_PRICE);
    }
  }, [donationType, selectedTrees, customTrees]);

  const campaign   = CAMPAIGNS.find(c=>c.slug===selectedCampaign) || CAMPAIGNS[0];
  const totalTrees = donationType==='campaign' ? selectedTrees : customTrees;
  // Match DB campaign by slug; fall back to a synthetic object so payment still works
  // even if /api/campaigns hasn't loaded yet
  const dbCampaign = dbCampaigns.find(c =>
    donationType === 'individual'
      ? (c.slug === 'individual' || c.name?.toLowerCase().includes('individual'))
      : c.slug === selectedCampaign
  ) || dbCampaigns[0] || {
    // Fallback: use slug directly — create-order API will find it in DB by slug
    slug: donationType === 'individual' ? 'individual' : selectedCampaign,
    name: donationType === 'individual' ? 'Individual Tree Purchase' : campaign.name,
  };

  async function handlePay() {
    setError('');
    if (!form.name||!form.email||!form.mobile) { setError('Please fill in Name, Email, and Mobile.'); return; }
    if (!form.chapter) { setError('Please select your JITO Chapter.'); return; }
    if (!dbCampaign?.slug) { setError('Campaign not found. Please try again.'); return; }
    setLoading(true);
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          amount, numberOfTrees: totalTrees,
          campaignSlug: dbCampaign.slug,
          donorName: form.name, donorEmail: form.email, donorMobile: form.mobile,
          donorAddress: form.address, donorPan: form.pan,
          dedicationName:   form.dedicationName,
          certificateName:  form.certificateName || form.name,
          dedicationType: donationType==='individual'?'OTHER':selectedCampaign.toUpperCase(),
          chapter: (form.chapter === 'Other JITO Chapter' || form.chapter === 'Others' || form.chapter === 'Non Member') && form.chapterCustom ? `${form.chapter} — ${form.chapterCustom}` : form.chapter,
        }),
      });
      const order = await orderRes.json();
      if (!order.orderId) throw new Error(order.error||'Could not create order');

      if (!window.Razorpay) {
        await new Promise<void>((res,rej)=>{
          const s=document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js';
          s.onload=()=>res(); s.onerror=()=>rej(new Error('Razorpay load failed'));
          document.head.appendChild(s);
        });
      }
      new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(amount*100), currency:'INR',
        name: BRAND.name,
        description: `${totalTrees} Trees · ${donationType==='individual'?'Individual':campaign.shortName} · ${BRAND.org}`,
        order_id: order.orderId,
        prefill:{ name:form.name, email:form.email, contact:form.mobile },
        theme:{ color:'#448039' },
        handler: async (response:any) => {
          const verifyRes = await fetch('/api/payment/verify',{
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ razorpay_order_id:response.razorpay_order_id, razorpay_payment_id:response.razorpay_payment_id, razorpay_signature:response.razorpay_signature, donationId:order.donationId }),
          });
          const result = await verifyRes.json();
          if (result.success) { router.push(`/success?donationId=${order.donationId}`); }
          else { setError('Payment verification failed. Please contact support.'); setLoading(false); }
        },
        modal:{ ondismiss:()=>setLoading(false) },
      }).open();
    } catch(e:any) { setError(e.message||'Something went wrong.'); setLoading(false); }
  }

  const inputCls = "w-full border border-sage-200 rounded-xl px-4 py-3 text-sage-900 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm bg-white";
  const cardCls  = "bg-white border border-sage-100 rounded-2xl p-6 shadow-sm";

  return (
    <div className="min-h-screen bg-cream-50">
      <Navbar />

      {/* Page header with photo */}
      <div className="relative h-40 mt-16">
        <Image src={NATURE_IMAGES.tree1} alt="Tree" fill className="object-cover"/>
        <div className="absolute inset-0 bg-sage-900/70"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="font-display text-3xl text-white mb-1">Sponsor Your Trees</h1>
          <p className="text-sage-200 text-sm">{BRAND.tagline}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-6 checkout-sidebar">
          {/* ── FORM ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Type toggle */}
            <div className={cardCls}>
              <h2 className="font-display text-lg text-sage-900 mb-4">What would you like to do?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value:'campaign',   label:'Family Campaign',       sub:'Dadi · Maa · Beti · Poti' },
                  { value:'individual', label:'Individual Tree Sponsorship', sub:'Buy 1 or any quantity' },
                ].map(opt=>(
                  <button key={opt.value} onClick={()=>setDonationType(opt.value as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${donationType===opt.value?'border-sage-600 bg-sage-50':'border-sage-100 hover:border-sage-300'}`}>
                    <div className="font-semibold text-sage-900 text-sm">{opt.label}</div>
                    <div className="text-sage-400 text-xs mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign selection */}
            {donationType==='campaign' && (
              <div className={cardCls}>
                <h2 className="font-display text-lg text-sage-900 mb-4">Select Relationship</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {CAMPAIGNS.map(c=>(
                    <button key={c.slug} onClick={()=>setSelectedCampaign(c.slug)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedCampaign===c.slug?'border-sage-600 ring-2 ring-sage-300':'border-transparent hover:border-sage-200'}`}>
                      <div className="relative h-20">
                        <Image src={c.image} alt={c.shortName} fill className="object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                        <div className="absolute bottom-1.5 left-0 right-0 text-center">
                          <div className="text-white font-display font-bold text-sm">{c.shortName}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedCampaign && (
                  <div className="bg-sage-50 border border-sage-100 rounded-xl p-3 mb-5 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={campaign.image} alt={campaign.name} fill className="object-cover"/>
                    </div>
                    <div>
                      <div className="font-semibold text-sage-900 text-sm">{campaign.name}</div>
                      <div className="text-sage-500 text-xs">{campaign.subtitle}</div>
                    </div>
                  </div>
                )}
                <h2 className="font-display text-lg text-sage-900 mb-3">Select Package</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CAMPAIGN_PACKAGES.map(pkg=>(
                    <button key={pkg.id} onClick={()=>setSelectedTrees(pkg.trees)}
                      className={`p-3 rounded-xl border-2 text-center transition-all relative ${selectedTrees===pkg.trees?'border-sage-600 bg-sage-50':'border-sage-100 hover:border-sage-300'}`}>
                      {pkg.popular && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-sage-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">Popular</div>}
                      <div className="font-bold text-sage-900 text-lg">{pkg.trees}</div>
                      <div className="text-sage-400 text-xs">trees</div>
                      <div className="font-semibold text-sage-700 text-sm mt-1">{formatCurrency(pkg.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual qty */}
            {donationType==='individual' && (
              <div className={cardCls}>
                <h2 className="font-display text-lg text-sage-900 mb-4">Number of Trees</h2>
                <div className="flex items-center gap-5">
                  <button onClick={()=>setCustomTrees(Math.max(1,customTrees-1))} className="w-10 h-10 rounded-full border-2 border-sage-200 flex items-center justify-center hover:border-sage-500 transition-colors">
                    <Minus className="w-4 h-4 text-sage-600"/>
                  </button>
                  <div className="text-center">
                    <input type="number" min="1" value={customTrees}
                      onChange={e=>setCustomTrees(Math.max(1,parseInt(e.target.value)||1))}
                      className="w-20 text-center text-3xl font-bold text-sage-900 border-b-2 border-sage-300 focus:outline-none focus:border-sage-600 bg-transparent"/>
                    <div className="text-sage-400 text-xs mt-1">trees × ₹500</div>
                  </div>
                  <button onClick={()=>setCustomTrees(customTrees+1)} className="w-10 h-10 rounded-full border-2 border-sage-200 flex items-center justify-center hover:border-sage-500 transition-colors">
                    <Plus className="w-4 h-4 text-sage-600"/>
                  </button>
                  <div className="ml-2 bg-sage-50 border border-sage-200 rounded-xl px-5 py-3 text-center">
                    <div className="font-bold text-sage-900 text-lg">{formatCurrency(customTrees * INDIVIDUAL_TREE_PRICE)}</div>
                    <div className="text-sage-400 text-xs">total</div>
                  </div>
                </div>
              </div>
            )}

            {/* Donor info */}
            <div className={cardCls}>
              <h2 className="font-display text-lg text-sage-900 mb-4">Your Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key:'name',   label:'Full Name *',           type:'text',  placeholder:'Rajesh Kumar Jain' },
                  { key:'email',  label:'Email *',               type:'email', placeholder:'rajesh@example.com' },
                  { key:'mobile', label:'Mobile *',              type:'tel',   placeholder:'+91 98765 43210' },
                  { key:'pan',    label:'PAN (for 80G receipt)', type:'text',  placeholder:'ABCDE1234F' },
                ].map(f=>(
                  <div key={f.key}>
                    <label className="block text-sm text-sage-700 font-medium mb-1">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className={inputCls}/>
                  </div>
                ))}
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-sage-700 font-medium mb-1">Select JITO Chapter *</label>
                    <select
                      value={form.chapter}
                      onChange={e=>setForm(p=>({...p,chapter:e.target.value,chapterCustom:''}))}
                      className={inputCls}>
                      <option value="">-- Select Your Chapter --</option>
                      <option value="Mumbai Zone">Mumbai Zone</option>
                      <optgroup label="JITO Chapters (A-Z)">
                        <option value="Ghatkopar Chapter">Ghatkopar Chapter</option>
                        <option value="Goregaon Chapter">Goregaon Chapter</option>
                        <option value="Gowalia Tank Chapter">Gowalia Tank Chapter</option>
                        <option value="Juhu Chapter">Juhu Chapter</option>
                        <option value="Kalyan-Dombivali Chapter">Kalyan-Dombivali Chapter</option>
                        <option value="Midtown Chapter">Midtown Chapter</option>
                        <option value="Mulund Chapter">Mulund Chapter</option>
                        <option value="Navi Mumbai Chapter">Navi Mumbai Chapter</option>
                        <option value="Queen's Necklace Chapter">Queen's Necklace Chapter</option>
                        <option value="Thane Chapter">Thane Chapter</option>
                        <option value="Walkeshwar Chapter">Walkeshwar Chapter</option>
                      </optgroup>
                      <optgroup label="Wings">
                        <option value="Ladies Wing">Ladies Wing</option>
                        <option value="Youth Wing">Youth Wing</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="Other JITO Chapter">Other JITO Chapter</option>
                        <option value="Non JITO Member">Non JITO Member</option>
                        <option value="Others">Others</option>
                      </optgroup>
                    </select>
                    {form.chapter === 'Other JITO Chapter' && (
                      <input type="text" placeholder="Enter your JITO Chapter name *" required
                        value={form.chapterCustom || ''}
                        onChange={e=>setForm(p=>({...p,chapterCustom:e.target.value}))}
                        className={inputCls + " mt-2"}/>
                    )}
                    {form.chapter === 'Others' && (
                      <input type="text" placeholder="Enter your Organisation / Group name *" required
                        value={form.chapterCustom || ''}
                        onChange={e=>setForm(p=>({...p,chapterCustom:e.target.value}))}
                        className={inputCls + " mt-2"}/>
                    )}
                    {form.chapter === 'Non Member' && (
                      <input type="text" placeholder="Your organisation name (optional)"
                        value={form.chapterCustom || ''}
                        onChange={e=>setForm(p=>({...p,chapterCustom:e.target.value}))}
                        className={inputCls + " mt-2"}/>
                    )}
                    <p className="text-sage-400 text-xs mt-1">Your chapter will appear on your certificate.</p>
                  </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-sage-700 font-medium mb-1">Address</label>
                  <input type="text" placeholder="Street, City, State, PIN" value={form.address}
                    onChange={e=>setForm(p=>({...p,address:e.target.value}))} className={inputCls}/>
                </div>
              </div>
            </div>

            {/* Dedication */}
            <div className={cardCls}>
              <h2 className="font-display text-lg text-sage-900 mb-4">
                {donationType==='campaign' ? `Planted in ${campaign.shortName}'s Name` : 'Dedication (Optional)'}
              </h2>
              <label className="block text-sm text-sage-700 font-medium mb-1">
                {donationType==='campaign' ? `Enter ${campaign.shortName}'s name` : 'Dedicated to (name)'}
              </label>
              <input type="text"
                placeholder={donationType==='campaign' ? 'e.g. Savitri Devi' : 'e.g. Smt. Kamla Devi'}
                value={form.dedicationName}
                onChange={e=>setForm(p=>({...p,dedicationName:e.target.value}))}
                className={inputCls}/>
              <p className="text-sage-400 text-xs mt-2">This name will appear on your digital certificate.</p>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div>
            <div className="bg-sage-800 text-white rounded-2xl p-6 sticky top-24 shadow-xl">
              <div className="relative h-28 rounded-xl overflow-hidden mb-5">
                <Image src={donationType==='campaign'?campaign.image:NATURE_IMAGES.plantation} alt="Campaign" fill className="object-cover"/>
                <div className="absolute inset-0 bg-sage-900/50"/>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                  <div className="text-white font-display text-base font-bold leading-tight">
                    {donationType==='individual' ? 'Individual Tree Sponsorship' : campaign.name}
                  </div>
                </div>
              </div>

              <h2 className="font-display text-lg mb-4 text-sage-200">Order Summary</h2>
              <div className="space-y-2.5 mb-6 text-sm">
                <div className="flex justify-between"><span className="text-sage-400">Trees</span><span className="font-semibold">{totalTrees} 🌳</span></div>
                <div className="flex justify-between"><span className="text-sage-400">CO₂/year</span><span className="text-sage-400">{totalTrees*22}kg</span></div>
                <div className="flex justify-between"><span className="text-sage-400">Price/tree</span><span>₹500</span></div>
                {form.dedicationName && (
                  <div className="flex justify-between"><span className="text-sage-400">For</span><span className="text-sage-200 text-right max-w-[130px] truncate font-medium">{form.dedicationName}</span></div>
                )}
                <div className="border-t border-sage-700 pt-3 flex justify-between font-bold text-lg">
                  <span className="text-sage-300">Total</span>
                  <span className="text-white">{formatCurrency(amount)}</span>
                </div>
              </div>

              {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-xl p-3 mb-4">{error}</div>}

              <button onClick={handlePay} disabled={loading}
                className="w-full bg-sage-500 hover:bg-sage-400 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-lg">
                {loading ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
              </button>
              <p className="text-sage-500 text-xs text-center mt-2">Secured by Razorpay 🔒</p>

              <div className="mt-5 pt-4 border-t border-sage-700 space-y-2">
                {[
                  { icon: Shield, text:'100% secure payment' },
                  { icon: FileText, text:'80G receipt auto-generated' },
                  { icon: TreePine, text:'Geo-tagged & photo-tracked' },
                ].map(({ icon:Icon, text })=>(
                  <div key={text} className="flex items-center gap-2 text-xs text-sage-500">
                    <Icon className="w-3.5 h-3.5 text-sage-600 flex-shrink-0"/>{text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream-50"><div className="text-sage-600 font-display text-xl">Loading...</div></div>}>
      <DonateForm />
    </Suspense>
  );
}
