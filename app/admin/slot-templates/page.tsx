'use client';

import { useEffect, useState } from 'react';

export default function SlotTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({ code: '', label: '', startTime: '09:00', defaultCapacity: 6 });
  const [newRule, setNewRule] = useState<any>({ seasonId: '', flightId: '', slotTemplateId: '', dayOfWeek: 0 });

  async function load() {
    const p = await fetch('/api/admin/slot-templates').then((r) => r.json());
    setTemplates(p.templates ?? []);
    setRules(p.rules ?? []);
    setFlights(p.flights ?? []);
    setSeasons(p.seasons ?? []);
    if (!newRule.seasonId && p.seasons?.[0]) setNewRule((v: any) => ({ ...v, seasonId: p.seasons[0].id }));
    if (!newRule.flightId && p.flights?.[0]) setNewRule((v: any) => ({ ...v, flightId: p.flights[0].id }));
    if (!newRule.slotTemplateId && p.templates?.[0]) setNewRule((v: any) => ({ ...v, slotTemplateId: p.templates[0].id }));
  }

  useEffect(() => { load(); }, []);

  async function createTemplate() {
    await fetch('/api/admin/slot-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'template', ...newTemplate }) });
    setNewTemplate({ code: '', label: '', startTime: '09:00', defaultCapacity: 6 });
    load();
  }

  async function createRule() {
    await fetch('/api/admin/slot-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'rule', ...newRule }) });
    load();
  }

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
      <div className="rounded border bg-white p-3 text-sm">
        <h3 className="mb-2 font-medium">Create slot template</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <input className="rounded border p-2" placeholder="Code" value={newTemplate.code} onChange={(e) => setNewTemplate((v) => ({ ...v, code: e.target.value }))} />
          <input className="rounded border p-2" placeholder="Label" value={newTemplate.label} onChange={(e) => setNewTemplate((v) => ({ ...v, label: e.target.value }))} />
          <input className="rounded border p-2" type="time" value={newTemplate.startTime} onChange={(e) => setNewTemplate((v) => ({ ...v, startTime: e.target.value }))} />
          <input className="rounded border p-2" type="number" value={newTemplate.defaultCapacity} onChange={(e) => setNewTemplate((v) => ({ ...v, defaultCapacity: Number(e.target.value) }))} />
        </div>
        <button className="mt-2 rounded border px-3 py-1" onClick={createTemplate}>Create template</button>
      </div>

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

      <div className="rounded border bg-white p-3 text-sm">
        <h3 className="mb-2 font-medium">Create slot rule</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <select className="rounded border p-2" value={newRule.seasonId} onChange={(e) => setNewRule((v: any) => ({ ...v, seasonId: e.target.value }))}>{seasons.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</select>
          <select className="rounded border p-2" value={newRule.flightId} onChange={(e) => setNewRule((v: any) => ({ ...v, flightId: e.target.value }))}>{flights.map((f) => <option key={f.id} value={f.id}>{f.slug}</option>)}</select>
          <select className="rounded border p-2" value={newRule.slotTemplateId} onChange={(e) => setNewRule((v: any) => ({ ...v, slotTemplateId: e.target.value }))}>{templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          <select className="rounded border p-2" value={newRule.dayOfWeek} onChange={(e) => setNewRule((v: any) => ({ ...v, dayOfWeek: Number(e.target.value) }))}>{[0,1,2,3,4,5,6].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <button className="mt-2 rounded border px-3 py-1" onClick={createRule}>Create rule</button>
      </div>

      <div className="rounded border bg-white p-3">
        <h3 className="mb-2 font-medium">Seasonal flight-slot rules</h3>
        {!rules.length && <p className="text-sm text-slate-600">No rules yet. Create one above.</p>}
        <div className="space-y-2 text-sm">
          {rules.slice(0, 200).map((r, i) => (
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
