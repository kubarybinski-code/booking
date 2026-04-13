'use client';

import { useEffect, useState } from 'react';

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  useEffect(() => { fetch('/api/admin/discount-codes').then((r) => r.json()).then((p) => setCodes(p.codes ?? [])); }, []);

  async function save(code: any) {
    await fetch('/api/admin/discount-codes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: code.id,
      code: code.code,
      discountValue: code.discount_value,
      discountType: code.discount_type,
      appliesToScope: code.applies_to_scope,
      flightId: code.flight_id,
      validFrom: code.valid_from,
      validUntil: code.valid_until,
      isActive: code.is_active,
    }) });
  }

  return <div className="space-y-3">{codes.map((c, i) => <div key={c.id} className="rounded border bg-white p-3 text-sm">
    <div className="grid gap-2 sm:grid-cols-3">
      <input className="rounded border p-2" value={c.code} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, code: e.target.value }) : x))} />
      <input className="rounded border p-2" type="number" value={c.discount_value} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, discount_value: Number(e.target.value) }) : x))} />
      <select className="rounded border p-2" value={c.applies_to_scope} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, applies_to_scope: e.target.value }) : x))}><option value="per_booking">per_booking</option><option value="per_person">per_person</option></select>
      <label><input type="checkbox" checked={c.is_active} onChange={(e) => setCodes((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_active: e.target.checked }) : x))} /> Active</label>
    </div>
    <button className="mt-2 rounded border px-3 py-1" onClick={() => save(c)}>Save</button>
  </div>)}</div>;
}
