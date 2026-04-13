'use client';

import { useEffect, useMemo, useState } from 'react';

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [catalogAddons, setCatalogAddons] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState('');

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/bookings/${id}`).then((r) => r.json()).then((payload) => {
      const selected = (payload.addons ?? []).map((a: any) => ({ addon_id: a.addon_id, quantity: a.quantity }));
      setData({ ...payload, booking: { ...payload.booking, addons: selected } });
    });
  }, [id]);

  useEffect(() => {
    fetch('/api/booking/bootstrap?locale=en').then((r) => r.json()).then((p) => setCatalogAddons(p.addons ?? []));
  }, []);

  useEffect(() => {
    if (!data?.booking?.flight_id || !slotDate) return;
    fetch(`/api/booking/slots?flightId=${data.booking.flight_id}&date=${slotDate}&people=${data.booking.people_count}`)
      .then((r) => r.json())
      .then((p) => setSlots(p.slots ?? []));
  }, [data?.booking?.flight_id, data?.booking?.people_count, slotDate]);

  const visibleAddons = useMemo(
    () => catalogAddons.filter((addon) => addon.allowedFlightIds?.includes(data?.booking?.flight_id)),
    [catalogAddons, data?.booking?.flight_id],
  );

  async function save() {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data.booking, addons: data.booking.addons ?? [] }),
    });
    const p = await res.json();
    setMsg(res.ok ? 'Saved.' : p.error);
    if (res.ok) fetch(`/api/admin/bookings/${id}`).then((r) => r.json()).then((payload) => {
      const selected = (payload.addons ?? []).map((a: any) => ({ addon_id: a.addon_id, quantity: a.quantity }));
      setData({ ...payload, booking: { ...payload.booking, addons: selected } });
    });
  }

  async function cancelBooking() {
    const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Cancelled in admin panel' }) });
    const p = await res.json();
    setMsg(res.ok ? 'Cancelled.' : p.error);
  }

  function toggleAddon(addonId: string) {
    setData((prev: any) => {
      const existing = prev.booking.addons ?? [];
      const has = existing.some((x: any) => x.addon_id === addonId);
      return {
        ...prev,
        booking: {
          ...prev.booking,
          addons: has ? existing.filter((x: any) => x.addon_id !== addonId) : [...existing, { addon_id: addonId, quantity: 1 }],
        },
      };
    });
  }

  if (!data?.booking) return <div className="rounded border bg-white p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <p className="mb-2 text-sm text-slate-500">Booking #{data.booking.booking_reference}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border p-2" value={data.booking.customer_first_name} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, customer_first_name: e.target.value } }))} />
          <input className="rounded border p-2" value={data.booking.customer_last_name} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, customer_last_name: e.target.value } }))} />
          <input className="rounded border p-2 sm:col-span-2" value={data.booking.customer_email} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, customer_email: e.target.value } }))} />
          <input className="rounded border p-2 sm:col-span-2" value={data.booking.customer_phone ?? ''} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, customer_phone: e.target.value } }))} />
          <input className="rounded border p-2" type="number" min={1} max={3} value={data.booking.people_count} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, people_count: Number(e.target.value) } }))} />
          <input className="rounded border p-2" value={data.booking.flight_id} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, flight_id: e.target.value } }))} />
          <input className="rounded border p-2" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
          <select className="rounded border p-2" value={data.booking.daily_slot_id} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, daily_slot_id: e.target.value } }))}>
            <option value={data.booking.daily_slot_id}>Current slot</option>
            {slots.map((slot) => <option key={slot.id} value={slot.id}>{new Date(slot.slotStartIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({slot.remainingSeats} seats left)</option>)}
          </select>
          <input className="rounded border p-2 sm:col-span-2" placeholder="Discount code" value={data.booking.discount_code ?? ''} onChange={(e) => setData((d: any) => ({ ...d, booking: { ...d.booking, discount_code: e.target.value } }))} />
        </div>

        <div className="mt-3 rounded border p-2">
          <p className="text-sm font-medium">Add-ons</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {visibleAddons.map((a: any) => {
              const checked = (data.booking.addons ?? []).some((x: any) => x.addon_id === a.id);
              return <label key={a.id} className="text-sm"><input type="checkbox" checked={checked} onChange={() => toggleAddon(a.id)} /> {a.name}</label>;
            })}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={save}>Save booking</button>
          <button className="rounded border px-3 py-1" onClick={cancelBooking}>Cancel booking</button>
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>
      <div className="rounded border bg-white p-4">
        <h3 className="mb-2 font-medium">Booking history</h3>
        <ul className="space-y-1 text-sm">
          {data.history.map((h: any) => <li key={h.id}>{new Date(h.created_at).toLocaleString()} — {h.action}</li>)}
        </ul>
      </div>
    </div>
  );
}
