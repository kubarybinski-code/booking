'use client';

import { useEffect, useState } from 'react';

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [newCode, setNewCode] = useState<any>({ code: '', discountValue: 0, appliesToScope: 'per_booking', ruleType: 'standard_code' });

  async function load() {
    const p = await fetch('/api/admin/discount-codes').then((r) => r.json());
    setCodes(p.codes ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createCode() {
    await fetch('/api/admin/discount-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCode) });
    setNewCode({ code: '', discountValue: 0, appliesToScope: 'per_booking', ruleType: 'standard_code' });
    load();
  }

  async function save(code: any) {
    await fetch('/api/admin/discount-codes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: code.id,
      code: code.code,
      discountValue: code.discount_value,
      discountType: code.discount_type,
      appliesToScope: code.applies_to_scope,
      ruleType: code.rule_type,
      peopleDiscountMap: code.people_discount_map,
      requiresManualVerification: code.requires_manual_verification,
      flightId: code.flight_id,
      validFrom: code.valid_from,
      validUntil: code.valid_until,
      isActive: code.is_active,
    }) });
  }

  return <div className="space-y-4">
    <div className="rounded border bg-white p-3 text-sm">
      <h3 className="mb-2 font-medium">Create discount code/rule</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="rounded border p-2" placeholder="Code" value={newCode.code} onChange={(e) => setNewCode((v: any) => ({ ...v, code: e.target.value }))} />
        <input className="rounded border p-2" type="number" placeholder="Value" value={newCode.discountValue} onChange={(e) => setNewCode((v: any) => ({ ...v, discountValue: Number(e.target.value) }))} />
        <select className="rounded border p-2" value={newCode.ruleType} onChange={(e) => setNewCode((v: any) => ({ ...v, ruleType: e.target.value }))}>
          <option value="standard_code">standard_code</option>
          <option value="family_code_rule">family_code_rule</option>
        </select>
      </div>
      <button className="mt-2 rounded border px-3 py-1" onClick={createCode}>Create</button>
    </div>

    {!codes.length && <div className="rounded border bg-white p-3 text-sm text-slate-600">No discount rules yet. Create one above.</div>}

    {codes.map((c, i) => <div key={c.id} className="rounded border bg-white p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="rounded border p-2" value={c.code} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, code: e.target.value }) : x))} />
        <input className="rounded border p-2" type="number" value={c.discount_value} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, discount_value: Number(e.target.value) }) : x))} />
        <select className="rounded border p-2" value={c.applies_to_scope} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, applies_to_scope: e.target.value }) : x))}><option value="per_booking">per_booking</option><option value="per_person">per_person</option></select>
        <select className="rounded border p-2" value={c.rule_type ?? 'standard_code'} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, rule_type: e.target.value }) : x))}><option value="standard_code">standard_code</option><option value="family_code_rule">family_code_rule</option></select>
        <input className="rounded border p-2 sm:col-span-2" placeholder='people map json e.g. {"1":1000,"2":2000}' value={JSON.stringify(c.people_discount_map ?? {})} onChange={(e) => { try { const val=JSON.parse(e.target.value); setCodes((prev)=>prev.map((x,idx)=>idx===i?({...x,people_discount_map:val}):x)); } catch {} }} />
        <label><input type="checkbox" checked={c.requires_manual_verification ?? false} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, requires_manual_verification: e.target.checked }) : x))} /> manual verification</label>
        <label><input type="checkbox" checked={c.is_active} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_active: e.target.checked }) : x))} /> Active</label>
      </div>
      <button className="mt-2 rounded border px-3 py-1" onClick={() => save(c)}>Save</button>
    </div>)}
  </div>;
}
