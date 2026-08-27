'use client';
import { useState, useEffect } from 'react';
import { withSuperAdmin } from '@/components/superadmin/withSuperAdmin';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, AlertCircle, CheckCircle, Upload } from 'lucide-react';

const inp = "w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-gray-600";
const PLANS = ['STARTER', 'PRO', 'ENTERPRISE'];

function EditOrgPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [org, setOrg]         = useState<any>(null);
  const [form, setForm]       = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [error, setError]     = useState('');
  const [razorpaySecretSet, setRazorpaySecretSet] = useState(false);
  const [webhookSecretSet, setWebhookSecretSet]   = useState(false);
  const [razorpaySecretInput, setRazorpaySecretInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput]   = useState('');

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Logo must be an image file (PNG, JPG, SVG, etc.)');
      return;
    }
    if (file.size > 512 * 1024) {
      setError('Logo must be under 512KB. Please compress the image and try again.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => setForm((p: any) => ({ ...p, logo_url: reader.result as string }));
    reader.onerror = () => setError('Failed to read the selected file.');
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    fetch(`/api/superadmin/orgs/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.org) {
          setOrg(d.org);
          setForm({
            name:                d.org.name               || '',
            email:               d.org.email              || '',
            phone:               d.org.phone              || '',
            website:             d.org.website            || '',
            address:             d.org.address            || '',
            primary_color:       d.org.primary_color      || '#2d5a1b',
            logo_url:            d.org.logo_url           || '',
            farmer_id_prefix:    d.org.farmer_id_prefix   || '',
            donation_ref_prefix: d.org.donation_ref_prefix|| '',
            tree_price:          String(d.org.tree_price  || 500),
            org_80g_number:      d.org.org_80g_number     || '',
            custom_domain:       d.org.custom_domain      || '',
            plan:                d.org.plan               || 'STARTER',
            active:              d.org.active             ?? true,
            privacy_policy_text: d.org.privacy_policy_text|| '',
            terms_text:          d.org.terms_text         || '',
            refund_policy_text:  d.org.refund_policy_text || '',
            razorpay_key_id:         d.org.razorpay_key_id          || '',
            payment_display_name:    d.org.payment_display_name     || '',
            payment_success_message: d.org.payment_success_message  || '',
            individual_donation_message: d.org.individual_donation_message || '',
            payment_banks:           d.org.payment_banks || [],
          });
          setRazorpaySecretSet(!!d.org.razorpay_key_secret_set);
          setWebhookSecretSet(!!d.org.razorpay_webhook_secret_set);
        } else {
          setError('Organisation not found');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [params.id]);

  async function handleSave() {
    setSaving(true); setError('');
    const res  = await fetch(`/api/superadmin/orgs/${params.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        // Never send NaN/blank-derived garbage — fall back to sane defaults
        // so a single-field edit never gets blocked by an unrelated blank field.
        tree_price: parseInt(form.tree_price) || 500,
        primary_color: form.primary_color || '#2d5a1b',
        // Secrets are write-only — only send if the admin actually typed something
        ...(razorpaySecretInput ? { razorpay_key_secret: razorpaySecretInput } : {}),
        ...(webhookSecretInput  ? { razorpay_webhook_secret: webhookSecretInput } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      showToast('Saved successfully ✓');
      if (razorpaySecretInput) { setRazorpaySecretSet(true); setRazorpaySecretInput(''); }
      if (webhookSecretInput)  { setWebhookSecretSet(true);  setWebhookSecretInput('');  }
    } else {
      setError(data.error || 'Failed to save');
    }
  }

  function updateBank(i: number, key: string, value: string) {
    setForm((p: any) => {
      const banks = [...(p.payment_banks || [])];
      banks[i] = { ...banks[i], [key]: value };
      return { ...p, payment_banks: banks };
    });
  }
  function addBank() {
    setForm((p: any) => ({ ...p, payment_banks: [...(p.payment_banks || []), { name: '', account: '', holder: '' }] }));
  }
  function removeBank(i: number) {
    setForm((p: any) => ({ ...p, payment_banks: (p.payment_banks || []).filter((_: any, idx: number) => idx !== i) }));
  }

  async function handleDeactivate() {
    if (org?.slug === 'bnz-green') { setError('Cannot deactivate primary organisation'); return; }
    if (!confirm(`${form.active ? 'Deactivate' : 'Activate'} ${org?.name}?`)) return;
    const res  = await fetch(`/api/superadmin/orgs/${params.id}`, {
      method:  form.active ? 'DELETE' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !form.active }),
    });
    const data = await res.json();
    if (data.success) {
      setForm((p: any) => ({ ...p, active: !p.active }));
      showToast(`Organisation ${form.active ? 'deactivated' : 'activated'} ✓`);
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sadmin/orgs')}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{org?.name}</h1>
            <p className="text-gray-500 text-xs font-mono">{org?.slug} · {org?.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeactivate}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              form.active
                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}>
            <Trash2 className="w-3.5 h-3.5"/>
            {form.active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-60">
            <Save className="w-3.5 h-3.5"/>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0"/> {error}
        </div>
      )}

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-6 ${
        form.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${form.active ? 'bg-emerald-400' : 'bg-rose-400'}`}/>
        {form.active ? 'Active' : 'Inactive'}
      </div>

      <div className="space-y-5">
        {/* Identity */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Organisation Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Organisation Name</label>
              <input value={form.name} onChange={f('name')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
              <input value={form.phone} onChange={f('phone')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Website</label>
              <input value={form.website} onChange={f('website')} className={inp} placeholder="https://"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Custom Domain</label>
              <input value={form.custom_domain} onChange={f('custom_domain')} className={inp} placeholder="trees.org.com"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
              <input value={form.address} onChange={f('address')} className={inp}/>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Branding & Plan</h2>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logo_url
                  ? <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain"/>
                  : <span className="text-gray-600 text-xs">No logo</span>}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5"/>
                  Upload image
                  <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden"/>
                </label>
                {form.logo_url && (
                  <button type="button" onClick={() => setForm((p: any) => ({ ...p, logo_url: '' }))}
                    className="ml-2 text-red-400 hover:text-red-300 text-xs font-semibold">
                    Remove logo
                  </button>
                )}
                <p className="text-gray-600 text-xs">PNG, JPG, or SVG — under 512KB. Shown on the site, admin panel, farmer portal, receipts and certificates.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.primary_color} onChange={f('primary_color')}
                  className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5"/>
                <input value={form.primary_color} onChange={f('primary_color')} className={inp}/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Plan</label>
              <select value={form.plan} onChange={f('plan')} className={inp}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Platform config */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3">Platform Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Farmer ID Prefix <span className="text-gray-600">e.g. JGL, ROT</span>
              </label>
              <input value={form.farmer_id_prefix} onChange={f('farmer_id_prefix')} className={inp} placeholder="JGL"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Donation Ref Prefix <span className="text-gray-600">e.g. JITO, ROTARY</span>
              </label>
              <input value={form.donation_ref_prefix} onChange={f('donation_ref_prefix')} className={inp} placeholder="JITO"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tree Price (₹)</label>
              <input type="number" value={form.tree_price} onChange={f('tree_price')} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">80G Registration Number</label>
              <input value={form.org_80g_number} onChange={f('org_80g_number')} className={inp}/>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-gray-800 pb-3">
            <h2 className="font-semibold text-white text-sm">Payment Configuration (Razorpay)</h2>
            <p className="text-gray-500 text-xs mt-1">
              Optional — only needed if this tenant uses their own Razorpay account instead of the
              platform default. Leave blank to keep using the platform's shared credentials.
              Never shown to Tenant Admins.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Razorpay Key ID</label>
              <input value={form.razorpay_key_id} onChange={f('razorpay_key_id')} className={inp} placeholder="rzp_live_..."/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Razorpay Key Secret
                {razorpaySecretSet && <span className="text-emerald-400 ml-2">● configured</span>}
              </label>
              <input type="password" value={razorpaySecretInput} onChange={e => setRazorpaySecretInput(e.target.value)}
                className={inp} placeholder={razorpaySecretSet ? 'Leave blank to keep existing secret' : 'Enter secret'}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Razorpay Webhook Secret
                {webhookSecretSet && <span className="text-emerald-400 ml-2">● configured</span>}
              </label>
              <input type="password" value={webhookSecretInput} onChange={e => setWebhookSecretInput(e.target.value)}
                className={inp} placeholder={webhookSecretSet ? 'Leave blank to keep existing secret' : 'Enter webhook secret'}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Display Name</label>
              <input value={form.payment_display_name} onChange={f('payment_display_name')} className={inp}
                placeholder="Shown on the Razorpay checkout window"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Success Message</label>
              <input value={form.payment_success_message} onChange={f('payment_success_message')} className={inp}
                placeholder="Shown to donors right after a successful payment"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Individual Donation Certificate Message</label>
              <textarea value={form.individual_donation_message} onChange={f('individual_donation_message')} className={inp} rows={2}
                placeholder='e.g. "the BNZ Impact Tree Plantation Programme" — shown on certificates for donations not tied to any specific campaign'/>
              <p className="text-gray-500 text-[11px] mt-1">
                Individual donations are never attributed to a real campaign — this text fills the same spot on their certificate instead.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-400">Bank Accounts (for offline/manual donations)</label>
              <button type="button" onClick={addBank} className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold">+ Add bank</button>
            </div>
            {(form.payment_banks || []).length === 0 && (
              <p className="text-gray-600 text-xs">No bank accounts added — the offline donation entry form on this org's admin panel won't show a bank picker.</p>
            )}
            <div className="space-y-2">
              {(form.payment_banks || []).map((b: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <input value={b.name || ''} onChange={e => updateBank(i, 'name', e.target.value)} className={inp} placeholder="Bank name"/>
                  <input value={b.account || ''} onChange={e => updateBank(i, 'account', e.target.value)} className={inp} placeholder="Account number"/>
                  <input value={b.holder || ''} onChange={e => updateBank(i, 'holder', e.target.value)} className={inp} placeholder="Account holder name"/>
                  <button type="button" onClick={() => removeBank(i)} className="text-red-400 hover:text-red-300 p-2">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Pages */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-gray-800 pb-3">
            <h2 className="font-semibold text-white text-sm">Legal Pages</h2>
            <p className="text-gray-500 text-xs mt-1">
              Shown on this tenant's Privacy Policy / Terms / Refund Policy pages. Leave blank to show a
              generic placeholder instead — do not assume another tenant's legal facts (jurisdiction,
              registered address, etc.) apply here.
            </p>
          </div>
          {[
            { key: 'privacy_policy_text', label: 'Privacy Policy' },
            { key: 'terms_text',          label: 'Terms & Conditions' },
            { key: 'refund_policy_text',  label: 'Refund Policy' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
              <textarea rows={6} value={form[key]} onChange={f(key)} className={inp}
                placeholder={`Paste this organisation's ${label.toLowerCase()} text here. Plain text, one paragraph per line — blank lines start a new section.`}/>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm border-b border-gray-800 pb-3 mb-4">Branding Preview</h2>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-700"
            style={{ borderColor: form.primary_color + '40' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden"
              style={{ backgroundColor: form.primary_color }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="" className="w-full h-full object-contain"/>
                : form.name?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-white text-sm">{form.name || 'Organisation Name'}</div>
              <div className="text-gray-400 text-xs">{form.email || 'email@org.com'}</div>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ backgroundColor: form.primary_color + '20', color: form.primary_color }}>
                {form.plan}
              </span>
            </div>
          </div>
        </div>

        {/* Save button at bottom too */}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4"/>
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}

export default withSuperAdmin(EditOrgPage);
