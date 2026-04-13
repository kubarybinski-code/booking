'use client';

import { useEffect, useState } from 'react';

export default function AddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  useEffect(() => { fetch('/api/admin/addons').then((r) => r.json()).then((p) => setAddons(p.addons ?? [])); }, []);

  async function save(addon: any) {
    await fetch('/api/admin/addons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: addon.id,
      code: addon.code,
      priceCents: addon.price_cents,
      pricingScope: addon.pricing_scope,
      isActive: addon.is_active,
      name: addon.addon_translations?.[0]?.name ?? addon.code,
      description: addon.addon_translations?.[0]?.description ?? null,
      allowedFlightIds: (addon.flight_addons ?? []).map((fa: any) => fa.flight_id),
    }) });
  }

  return <div className="space-y-3">{addons.map((a, i) => <div key={a.id} className="rounded border bg-white p-3 text-sm">
    <div className="grid gap-2 sm:grid-cols-2">
      <input className="rounded border p-2" value={a.addon_translations?.[0]?.name ?? ''} onChange={(e) => setAddons((prev) => prev.map((x, idx) => idx === i ? ({ ...x, addon_translations: [{ ...(x.addon_translations?.[0] ?? {}), name: e.target.value }] }) : x))} />
      <input className="rounded border p-2" value={a.code} onChange={(e) => setAddons((prev) => prev.map((x, idx) => idx === i ? ({ ...x, code: e.target.value }) : x))} />
      <input className="rounded border p-2" type="number" value={a.price_cents} onChange={(e) => setAddons((prev) => prev.map((x, idx) => idx === i ? ({ ...x, price_cents: Number(e.target.value) }) : x))} />
      <select className="rounded border p-2" value={a.pricing_scope} onChange={(e) => setAddons((prev) => prev.map((x, idx) => idx === i ? ({ ...x, pricing_scope: e.target.value }) : x))}><option value="per_booking">per_booking</option><option value="per_person">per_person</option></select>
      <label><input type="checkbox" checked={a.is_active} onChange={(e) => setAddons((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_active: e.target.checked }) : x))} /> Active</label>
    </div>
    <button className="mt-2 rounded border px-3 py-1" onClick={() => save(a)}>Save</button>
  </div>)}</div>;
}
