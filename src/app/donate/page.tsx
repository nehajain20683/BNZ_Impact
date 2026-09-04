'use client';
// src/app/donate/page.tsx — Light theme
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { INDIVIDUAL_TREE_PRICE, CAMPAIGN_PACKAGES as DEFAULT_PACKAGES, packagePrice, formatCurrency, NATURE_IMAGES } from '@/lib/utils';
import { useOrgConfig } from '@/components/OrgConfigProvider';
import { Shield, FileText, TreePine, Minus, Plus } from 'lucide-react';

declare global { interface Window { Razorpay: any; } }

function DonateForm() {
  const org    = useOrgConfig();
  const primaryColor = org.primaryColor || '#2d5a1b';
  const params = useSearchParams();
  const router = useRouter();

  const initType     = (params.get('type') || 'campaign') as 'campaign' | 'individual';
  const initCampaign = params.get('campaign') || '';
  const initTreesParam = params.get('trees');
  const initAmount   = parseFloat(params.get('amount') || '0');

  const [donationType, setDonationType]     = useState<'campaign'|'individual'>(initType);
  const [selectedCampaign, setSelectedCampaign] = useState(initCampaign);
  const [selectedTrees, setSelectedTrees]   = useState(initTreesParam ? parseInt(initTreesParam) : 0);
  const [amount, setAmount]                 = useState(initAmount);
  const [customTrees, setCustomTrees]       = useState(1);
  const [form, setForm] = useState({ name:'', email:'', mobile:'', address:'', pan:'', dedicationName:'', chapter:'', certificateName:'' });
  const [dbCampaigns, setDbCampaigns]       = useState<any[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [individualCampaign, setIndividualCampaign] = useState<any>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : { campaigns: [] })
      .then(d => {
        const list = d.campaigns || [];
        setDbCampaigns(list);
        setCampaignsLoaded(true);
        if (list.length) {
          // Pick a sensible default campaign/package if none came from the URL
          const chosen = list.find((c: any) => c.slug === initCampaign) || list[0];
          if (!initCampaign) setSelectedCampaign(chosen.slug);
          if (!initTreesParam) {
            const pkgs = Array.isArray(chosen.packages) && chosen.packages.length ? chosen.packages : DEFAULT_PACKAGES;
            const popular = pkgs.find((p: any) => p.popular) || pkgs[0];
            if (popular) setSelectedTrees(popular.trees);
          }
        }
      })
      .catch(() => { setDbCampaigns([]); setCampaignsLoaded(true); });

    // The permanent "no specific campaign" bucket — fetched once up front so
    // it's ready the instant a donor picks "Individual", rather than every
    // individual donation silently landing on whatever real campaign
    // happened to be first in the list.
    fetch('/api/public/individual-campaign')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.campaign) setIndividualCampaign(d.campaign); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (donationType === 'campaign') {
      const pkgs = Array.isArray(campaign.packages) && campaign.packages.length ? campaign.packages : DEFAULT_PACKAGES;
      const pkg = pkgs.find((p: any) => p.trees === selectedTrees);
      if (pkg) setAmount(packagePrice(pkg.trees, campaign.treePrice || org.treePrice));
    } else {
      setAmount(customTrees * (org.treePrice || INDIVIDUAL_TREE_PRICE));
    }
  }, [donationType, selectedTrees, customTrees, org.treePrice]);

  const campaign = dbCampaigns.find(c=>c.slug===selectedCampaign) || dbCampaigns[0] || {
    slug: selectedCampaign, name: campaignsLoaded ? 'Tree Sponsorship' : 'Loading…',
    shortName: '', subtitle: '', imageUrl: null, accentColor: '#2d5a1b', packages: [],
  };
  const campaignPackages = Array.isArray(campaign.packages) && campaign.packages.length ? campaign.packages : DEFAULT_PACKAGES;
  const totalTrees = donationType==='campaign' ? selectedTrees : customTrees;
  // Match DB campaign by slug for a real campaign; for "individual" donations,
  // always use the dedicated per-org bucket — never a random real campaign.
  const dbCampaign = donationType === 'individual'
    ? (individualCampaign || { slug: 'individual', name: 'Individual Tree Donation' })
    : (dbCampaigns.find(c => c.slug === selectedCampaign) || dbCampaigns[0] || {
        slug: selectedCampaign, name: campaign.name,
      });

  async function handlePay() {
    setError('');
    if (!form.name||!form.email||!form.mobile) { setError('Please fill in Name, Email, and Mobile.'); return; }
    if (!form.chapter) { setError('Please enter your Chapter / Organisation.'); return; }
    if (donationType === 'individual' && !individualCampaign) { setError('Still setting things up — please wait a moment and try again.'); return; }
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
          chapter: form.chapter,
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
        key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(amount*100), currency:'INR',
        name: org.name || 'BNZ Impact',
        description: `${totalTrees} Trees · ${donationType==='individual'?'Individual':campaign.shortName} · ${org.name || 'BNZ Impact'}`,
        order_id: order.orderId,
        prefill:{ name:form.name, email:form.email, contact:form.mobile },
        theme:{ color: org.primaryColor || '#448039' },
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
      {/* Page header with photo */}
      <div className="relative h-40 mt-16">
        <Image src={NATURE_IMAGES.tree1} alt="Tree" fill className="object-cover"/>
        <div className="absolute inset-0 bg-sage-900/70"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="font-display text-3xl text-white mb-1">Sponsor Your Trees</h1>
          <p className="text-sage-200 text-sm">{org.loaded ? org.name : 'Sponsor a tree, grow a legacy'}</p>
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
                  { value:'campaign',   label:'Family Campaign',       sub: dbCampaigns.length ? dbCampaigns.map(c=>c.shortName || c.name).join(' · ') : 'Choose a campaign' },
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
                  {dbCampaigns.map(c=>(
                    <button key={c.slug} onClick={()=>{setSelectedCampaign(c.slug); setSelectedTrees(0);}}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedCampaign===c.slug?'border-sage-600 ring-2 ring-sage-300':'border-transparent hover:border-sage-200'}`}>
                      <div className="relative h-20">
                        {c.imageUrl ? (
                          <Image src={c.imageUrl} alt={c.shortName || c.name} fill className="object-cover"/>
                        ) : (
                          <div className="w-full h-full" style={{ backgroundColor: c.accentColor || '#2d5a1b' }}/>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                        <div className="absolute bottom-1.5 left-0 right-0 text-center">
                          <div className="text-white font-display font-bold text-sm">{c.shortName || c.name}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedCampaign && (
                  <div className="bg-sage-50 border border-sage-100 rounded-xl p-3 mb-5 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {campaign.imageUrl ? (
                        <Image src={campaign.imageUrl} alt={campaign.name} fill className="object-cover"/>
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: campaign.accentColor || '#2d5a1b' }}/>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sage-900 text-sm">{campaign.name}</div>
                      <div className="text-sage-500 text-xs">{campaign.subtitle}</div>
                    </div>
                  </div>
                )}
                <h2 className="font-display text-lg text-sage-900 mb-3">Select Package</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {campaignPackages.map((pkg: any)=>(
                    <button key={pkg.id || pkg.trees} onClick={()=>setSelectedTrees(pkg.trees)}
                      className="p-3 rounded-xl border-2 text-center transition-all relative border-sage-100 hover:border-sage-300"
                      style={selectedTrees===pkg.trees ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0d` } : {}}>
                      {pkg.popular && <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: primaryColor }}>Popular</div>}
                      <div className="font-bold text-sage-900 text-lg">{pkg.trees}</div>
                      <div className="text-sage-400 text-xs">trees</div>
                      <div className="font-semibold text-sage-700 text-sm mt-1">{formatCurrency(packagePrice(pkg.trees, campaign.treePrice || org.treePrice))}</div>
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
                    <div className="text-sage-400 text-xs mt-1">trees × {formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}</div>
                  </div>
                  <button onClick={()=>setCustomTrees(customTrees+1)} className="w-10 h-10 rounded-full border-2 border-sage-200 flex items-center justify-center hover:border-sage-500 transition-colors">
                    <Plus className="w-4 h-4 text-sage-600"/>
                  </button>
                  <div className="ml-2 bg-sage-50 border border-sage-200 rounded-xl px-5 py-3 text-center">
                    <div className="font-bold text-sage-900 text-lg">{formatCurrency(customTrees * (org.treePrice || INDIVIDUAL_TREE_PRICE))}</div>
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
                    <label className="block text-sm text-sage-700 font-medium mb-1">Chapter / Organisation *</label>
                    <input type="text" placeholder="Enter your chapter, group, or organisation name" required
                      value={form.chapter}
                      onChange={e=>setForm(p=>({...p,chapter:e.target.value}))}
                      className={inputCls}/>
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
                {donationType==='campaign' ? `Planted in ${campaign.shortName || campaign.name}'s Name` : 'Dedication (Optional)'}
              </h2>
              <label className="block text-sm text-sage-700 font-medium mb-1">
                {donationType==='campaign' ? `Enter ${campaign.dedicationLabel || campaign.shortName || 'their'}'s name` : 'Dedicated to (name)'}
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
            <div className="text-white rounded-2xl p-6 sticky top-24 shadow-xl" style={{ backgroundColor: primaryColor }}>
              <div className="relative h-28 rounded-xl overflow-hidden mb-5">
                {(donationType==='campaign' ? campaign.imageUrl : null) ? (
                  <Image src={campaign.imageUrl} alt="Campaign" fill className="object-cover"/>
                ) : donationType==='campaign' ? (
                  <div className="w-full h-full" style={{ backgroundColor: campaign.accentColor || '#2d5a1b' }}/>
                ) : (
                  <Image src={NATURE_IMAGES.plantation} alt="Individual sponsorship" fill className="object-cover"/>
                )}
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
                <div className="flex justify-between"><span className="text-sage-400">Price/tree</span><span>{formatCurrency(org.treePrice || INDIVIDUAL_TREE_PRICE)}</span></div>
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
                className="w-full disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-lg"
                style={{ backgroundColor: primaryColor }}>
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
