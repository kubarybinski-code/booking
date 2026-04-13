'use client';

import { useEffect, useMemo, useState } from 'react';
import { selfServiceDictionary } from '@/lib/i18n/self-service-dictionary';
import type { SupportedLocale } from '@/types/booking';

type Session = {
  locale: SupportedLocale;
  booking: any;
  action: 'cancel' | 'reschedule';
  canCancel: boolean;
  canReschedule: boolean;
};

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { throw new Error('Service unavailable.'); }
  if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
  return payload;
}

export function SelfServiceManager({ reference, token, action }: { reference: string; token: string; action: 'cancel' | 'reschedule' }) {
  const [session, setSession] = useState<Session | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson(`/api/booking/manage/session?reference=${reference}&token=${token}&action=${action}`)
      .then(setSession)
      .catch((e) => setError(e.message));
  }, [reference, token, action]);

  useEffect(() => {
    if (action !== 'reschedule' || !session?.canReschedule) return;
    fetchJson(`/api/booking/manage/slots?reference=${reference}&token=${token}&date=${date}`)
      .then((payload) => setSlots(payload.slots ?? []))
      .catch((e) => setError(e.message));
  }, [action, date, reference, token, session?.canReschedule]);

  const locale = session?.locale ?? 'en';
  const t = useMemo(() => selfServiceDictionary[locale], [locale]);

  async function submitCancel() {
    try {
      await fetchJson('/api/booking/manage/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, token }),
      });
      setMessage(t.successCancel);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitReschedule() {
    try {
      await fetchJson('/api/booking/manage/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, token, dailySlotId: selectedSlotId }),
      });
      setMessage(t.successReschedule);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <div className="mx-auto max-w-xl rounded border bg-white p-6 text-sm text-red-700">{error || t.invalid}</div>;
  if (!session) return <div className="mx-auto max-w-xl rounded border bg-white p-6 text-sm">Loading…</div>;

  const isAllowed = action === 'cancel' ? session.canCancel : session.canReschedule;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <p className="text-sm text-slate-600">#{session.booking.booking_reference} · {session.booking.customer_first_name} {session.booking.customer_last_name}</p>

        {!isAllowed && <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">{t.cutoff}</p>}

        {action === 'cancel' && isAllowed && (
          <button className="w-full rounded bg-red-600 px-4 py-2 text-white" onClick={submitCancel}>{t.cancel}</button>
        )}

        {action === 'reschedule' && isAllowed && (
          <div className="space-y-3">
            <label className="block text-sm">{t.chooseDate}
              <input type="date" className="mt-1 w-full rounded border p-2" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block text-sm">{t.chooseSlot}
              <select className="mt-1 w-full rounded border p-2" value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)}>
                <option value="">--</option>
                {slots.map((slot) => <option key={slot.id} value={slot.id}>{new Date(slot.slotStartIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({slot.remainingSeats})</option>)}
              </select>
            </label>
            <button className="w-full rounded bg-brand px-4 py-2 text-white" disabled={!selectedSlotId} onClick={submitReschedule}>{t.submitReschedule}</button>
          </div>
        )}

        {message && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      </div>
    </main>
  );
}
