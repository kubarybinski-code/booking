'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  useEffect(() => { fetch('/api/admin/settings').then((r) => r.json()).then((p) => setSettings(p.settings ?? [])); }, []);

  async function save(s: any) {
    await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, value: s.value, description: s.description }) });
  }

  return <div className="space-y-2">{settings.map((s, i) => <div key={s.id} className="rounded border bg-white p-3 text-sm">
    <p className="mb-1 font-medium">{s.key}</p>
    <textarea className="w-full rounded border p-2" rows={3} value={JSON.stringify(s.value)} onChange={(e) => { let parsed: any = s.value; try { parsed = JSON.parse(e.target.value); } catch {} setSettings((prev) => prev.map((x, idx) => idx === i ? ({ ...x, value: parsed }) : x)); }} />
    <button className="mt-2 rounded border px-3 py-1" onClick={() => save(s)}>Save</button>
  </div>)}</div>;
}
