'use client';

import { useEffect, useState } from 'react';

export default function SlotTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  async function load() {
    const p = await fetch('/api/admin/slot-templates').then((r) => r.json());
    setTemplates(p.templates ?? []);
    setRules(p.rules ?? []);
  }

  useEffect(() => { load(); }, []);

  async function saveTemplate(template: any) {
    await fetch('/api/admin/slot-templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: template.id,
      label: template.label,
      startTime: template.start_time,
      durationMinutes: template.duration_minutes,
      defaultCapacity: template.default_capacity,
      isActive: template.is_active,
    }) });
  }

  async function saveRule(rule: any) {
    await fetch('/api/admin/slot-templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ruleId: rule.id,
      isBookable: rule.is_bookable,
      capacityOverride: rule.capacity_override,
    }) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {templates.map((t, i) => <div key={t.id} className="rounded border bg-white p-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded border p-2" value={t.label} onChange={(e) => setTemplates((prev) => prev.map((x, idx) => idx === i ? ({ ...x, label: e.target.value }) : x))} />
            <input className="rounded border p-2" value={t.start_time} onChange={(e) => setTemplates((prev) => prev.map((x, idx) => idx === i ? ({ ...x, start_time: e.target.value }) : x))} />
            <input className="rounded border p-2" type="number" value={t.default_capacity} onChange={(e) => setTemplates((prev) => prev.map((x, idx) => idx === i ? ({ ...x, default_capacity: Number(e.target.value) }) : x))} />
            <label><input type="checkbox" checked={t.is_active} onChange={(e) => setTemplates((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_active: e.target.checked }) : x))} /> Active</label>
          </div>
          <button className="mt-2 rounded border px-3 py-1" onClick={() => saveTemplate(t)}>Save template</button>
        </div>)}
      </div>

      <div className="rounded border bg-white p-3">
        <h3 className="mb-2 font-medium">Seasonal flight-slot rules</h3>
        <div className="space-y-2 text-sm">
          {rules.slice(0, 120).map((r, i) => (
            <div key={r.id} className="grid gap-2 border-b py-2 sm:grid-cols-6">
              <div>{r.season_id.slice(0, 8)}</div>
              <div>{r.flight_id.slice(0, 8)}</div>
              <div>{r.slot_template_id.slice(0, 8)}</div>
              <div>DOW {r.day_of_week}</div>
              <label><input type="checkbox" checked={r.is_bookable} onChange={(e) => setRules((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_bookable: e.target.checked }) : x))} /> bookable</label>
              <button className="rounded border px-2" onClick={() => saveRule(r)}>Save rule</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
