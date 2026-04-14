'use client';

import { useEffect, useMemo, useState } from 'react';

export default function FlightsPage() {
  const [flights, setFlights] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonFlights, setSeasonFlights] = useState<any[]>([]);
  const [newFlight, setNewFlight] = useState({ name: '', slug: '', basePriceCents: 0, bookingStartDate: '', bookingEndDate: '' });

  async function load() {
    const p = await fetch('/api/admin/flights').then((r) => r.json());
    setFlights(p.flights ?? []);
    setSeasons(p.seasons ?? []);
    setSeasonFlights(p.seasonFlights ?? []);
  }

  useEffect(() => { load(); }, []);

  const sfMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const sf of seasonFlights) map.set(`${sf.season_id}_${sf.flight_id}`, sf.is_active);
    return map;
  }, [seasonFlights]);

  async function createFlight() {
    await fetch('/api/admin/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFlight) });
    setNewFlight({ name: '', slug: '', basePriceCents: 0, bookingStartDate: '', bookingEndDate: '' });
    load();
  }

  async function save(flight: any) {
    await fetch('/api/admin/flights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: flight.id,
        slug: flight.slug,
        basePriceCents: flight.base_price_cents,
        isActive: flight.is_active,
        imageUrl: flight.image_url,
        bookingStartDate: flight.booking_start_date,
        bookingEndDate: flight.booking_end_date,
        name: flight.flight_translations?.[0]?.name ?? flight.slug,
        description: flight.flight_translations?.[0]?.description ?? null,
        seasonAvailability: seasons.map((s) => ({
          seasonId: s.id,
          isActive: sfMap.get(`${s.id}_${flight.id}`) ?? true,
        })),
      }),
    });
  }

  return <div className="space-y-4">
    <div className="rounded border bg-white p-3 text-sm">
      <h3 className="mb-2 font-medium">Create flight</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border p-2" placeholder="Name" value={newFlight.name} onChange={(e) => setNewFlight((v) => ({ ...v, name: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Slug" value={newFlight.slug} onChange={(e) => setNewFlight((v) => ({ ...v, slug: e.target.value }))} />
        <input className="rounded border p-2" type="number" placeholder="Base price cents" value={newFlight.basePriceCents} onChange={(e) => setNewFlight((v) => ({ ...v, basePriceCents: Number(e.target.value) }))} />
        <input className="rounded border p-2" type="date" value={newFlight.bookingStartDate} onChange={(e) => setNewFlight((v) => ({ ...v, bookingStartDate: e.target.value }))} />
        <input className="rounded border p-2" type="date" value={newFlight.bookingEndDate} onChange={(e) => setNewFlight((v) => ({ ...v, bookingEndDate: e.target.value }))} />
      </div>
      <button className="mt-2 rounded border px-3 py-1" onClick={createFlight}>Create</button>
    </div>

    {!flights.length && <div className="rounded border bg-white p-3 text-sm text-slate-600">No flights yet. Create your first flight.</div>}

    {flights.map((f, i) => <div key={f.id} className="rounded border bg-white p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border p-2" value={f.flight_translations?.[0]?.name ?? ''} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, flight_translations: [{ ...(x.flight_translations?.[0] ?? {}), name: e.target.value }] }) : x))} />
        <input className="rounded border p-2" value={f.slug} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, slug: e.target.value }) : x))} />
        <input className="rounded border p-2" type="number" value={f.base_price_cents} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, base_price_cents: Number(e.target.value) }) : x))} />
        <input className="rounded border p-2" value={f.image_url ?? ''} placeholder="Image URL/path" onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, image_url: e.target.value }) : x))} />
        <input className="rounded border p-2" type="date" value={f.booking_start_date ?? ''} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, booking_start_date: e.target.value }) : x))} />
        <input className="rounded border p-2" type="date" value={f.booking_end_date ?? ''} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, booking_end_date: e.target.value }) : x))} />
        <label><input type="checkbox" checked={f.is_active} onChange={(e) => setFlights((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_active: e.target.checked }) : x))} /> Active</label>
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {seasons.map((s) => {
          const key = `${s.id}_${f.id}`;
          return (
            <label key={key} className="text-xs">
              <input
                type="checkbox"
                checked={sfMap.get(key) ?? true}
                onChange={(e) => setSeasonFlights((prev) => {
                  const copy = [...prev];
                  const idx = copy.findIndex((x) => x.season_id === s.id && x.flight_id === f.id);
                  if (idx >= 0) copy[idx] = { ...copy[idx], is_active: e.target.checked };
                  else copy.push({ season_id: s.id, flight_id: f.id, is_active: e.target.checked });
                  return copy;
                })}
              /> {s.code}
            </label>
          );
        })}
      </div>
      <button className="mt-2 rounded border px-3 py-1" onClick={() => save(f)}>Save</button>
    </div>)}
  </div>;
}
