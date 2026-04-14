'use client';

import { useEffect, useState } from 'react';

export default function DailySlotsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);

  async function load() {
    const res = await fetch(`/api/admin/daily-slots?date=${date}`);
    const payload = await res.json();
    setSlots(payload.slots ?? []);
  }

  useEffect(() => { load(); }, [date]);

  async function save(slot: any) {
    await fetch('/api/admin/daily-slots', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: slot.id, state: slot.state, isBookable: slot.is_bookable, capacity: slot.capacity, notes: slot.notes,
    }) });
    load();
  }

  async function addLateSlot(time: string) {
    if (!slots[0]) return;
    await fetch('/api/admin/daily-slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      kind: 'late-slot', date, time, flightId: slots[0].flight_id, capacity: 6,
    }) });
    load();
  }

  async function addManualBooking(slotId: string) {
    await fetch('/api/admin/daily-slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      kind: 'manual-booking',
      flightId: slots.find((s) => s.id === slotId)?.flight_id,
      dailySlotId: slotId,
      peopleCount: 1,
      firstName: 'Phone',
      lastName: 'Booking',
      email: `phone-${Date.now()}@example.local`,
      phone: '+00000000',
    }) });
    load();
  }

  return (
    <div className="rounded border bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="date" className="rounded border p-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="rounded border px-3" onClick={() => addLateSlot('17:00')}>Activate 17:00 slot</button>
        <button className="rounded border px-3" onClick={() => addLateSlot('17:30')}>Activate 17:30 slot</button>
      </div>
      <div className="space-y-2">
        {slots.map((s, i) => (
          <div key={s.id} className="rounded border p-2 text-sm">
            <div className="grid gap-2 sm:grid-cols-6">
              <div>{new Date(s.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div>{s.flights?.slug}</div>
              <div>Booked: {s.bookedSeats} / Remaining: {s.remainingSeats}</div>
              <select className="rounded border p-1" value={s.state} onChange={(e) => setSlots((prev) => prev.map((x, idx) => idx === i ? ({ ...x, state: e.target.value }) : x))}><option>open</option><option>closed</option><option>blocked</option></select>
              <input type="number" className="rounded border p-1" value={s.capacity} onChange={(e) => setSlots((prev) => prev.map((x, idx) => idx === i ? ({ ...x, capacity: Number(e.target.value) }) : x))} />
              <label><input type="checkbox" checked={s.is_bookable} onChange={(e) => setSlots((prev) => prev.map((x, idx) => idx === i ? ({ ...x, is_bookable: e.target.checked }) : x))} /> Online</label>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="rounded border px-2 py-1" onClick={() => save(s)}>Save</button>
              <button className="rounded border px-2 py-1" onClick={() => addManualBooking(s.id)}>Manual phone booking</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
