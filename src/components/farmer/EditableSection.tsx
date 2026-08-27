'use client';
// src/components/farmer/EditableSection.tsx
// Section-wise inline editing — same card, same layout, same spacing.
// View mode shows label+value with a lock or pencil icon; Edit mode swaps
// the value for an input in the exact same spot. No navigation, no
// registration wizard.
import { useState } from 'react';
import { Pencil, Lock, Check, X, Loader2 } from 'lucide-react';

export type EditableField = {
  key: string;
  label: string;
  value: string | null | undefined;
  locked?: boolean;
  type?: 'text' | 'date' | 'tel' | 'email' | 'select';
  options?: string[];
};

export default function EditableSection({
  title, fields, primaryColor, onSave, locked, lockedMessage,
}: {
  title: string;
  fields: EditableField[];
  primaryColor: string;
  onSave: (changed: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  locked?: boolean;
  lockedMessage?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [draft, setDraft]     = useState<Record<string, string>>({});

  function startEdit() {
    const initial: Record<string, string> = {};
    fields.forEach(f => { if (!f.locked) initial[f.key] = f.value || ''; });
    setDraft(initial);
    setError('');
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError('');
    setDraft({});
  }

  async function save() {
    setSaving(true); setError('');
    // Only send fields that actually changed
    const changed: Record<string, string> = {};
    fields.forEach(f => {
      if (!f.locked && draft[f.key] !== (f.value || '')) changed[f.key] = draft[f.key];
    });
    if (Object.keys(changed).length === 0) { setEditing(false); setSaving(false); return; }

    const result = await onSave(changed);
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error || 'Failed to save changes');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {locked ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400" title={lockedMessage || 'This information can only be updated by the administrator.'}>
            <Lock className="w-3 h-3"/> Locked
          </span>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <button onClick={cancel} disabled={saving}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
              <X className="w-3.5 h-3.5"/> Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
              Save
            </button>
          </div>
        ) : (
          <button onClick={startEdit}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ color: primaryColor, borderColor: primaryColor + '40' }}>
            <Pencil className="w-3.5 h-3.5"/> Edit
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5 mb-3">{error}</div>
      )}
      {locked && lockedMessage && (
        <div className="bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-lg p-2.5 mb-3">{lockedMessage}</div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {fields.map(f => (
          <div key={f.key} className="bg-gray-50 rounded-xl p-2.5 transition-all">
            <div className="text-gray-400 text-[10px] flex items-center gap-1">
              {f.label}
              {f.locked
                ? <Lock className="w-2.5 h-2.5 text-gray-300" title="This information can only be updated by the administrator."/>
                : null}
            </div>
            {editing && !f.locked && !locked ? (
              f.type === 'select' ? (
                <select value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="w-full font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 mt-0.5 text-xs focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primaryColor } as any}>
                  <option value="">Select</option>
                  {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type === 'date' ? 'date' : f.type || 'text'}
                  value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="w-full font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-1.5 py-1 mt-0.5 text-xs focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primaryColor } as any}/>
              )
            ) : (
              <div className={`font-semibold mt-0.5 truncate flex items-center gap-1 ${f.locked ? 'text-gray-500' : 'text-gray-800'}`}
                title={f.locked ? 'This information can only be updated by the administrator.' : undefined}>
                {f.value || '—'}
                {!f.locked && !editing && !locked && <Pencil className="w-2.5 h-2.5 text-gray-300 flex-shrink-0"/>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
