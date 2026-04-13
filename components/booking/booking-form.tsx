'use client';

import { useEffect, useMemo, useState } from 'react';
import { bookingDictionary, resolveLocale, SUPPORTED_LOCALES } from '@/lib/i18n/booking-dictionary';
import type { AddonOption, FlightOption, SlotOption, SupportedLocale } from '@/types/booking';

interface BootstrapResponse {
  flights: FlightOption[];
  addons: (AddonOption & { allowedFlightIds: string[] })[];
}

async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();

  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('Backend is unavailable or returned a non-JSON response.');
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Request failed.');
  }

  return payload as T;
}

export function BookingForm() {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [addons, setAddons] = useState<(AddonOption & { allowedFlightIds: string[] })[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [discountCode, setDiscountCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const t = bookingDictionary[locale];

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('booking_locale') : null;
    const navLocale = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : null;
    setLocale(resolveLocale(saved ?? navLocale));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('booking_locale', locale);
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    fetchJsonSafe<BootstrapResponse>(`/api/booking/bootstrap?locale=${locale}`, { signal: controller.signal })
      .then((data) => {
        setFlights(data.flights);
        setAddons(data.addons);
        if (!selectedFlightId && data.flights[0]) setSelectedFlightId(data.flights[0].id);
      })
      .catch((e) => setError(e.message));

    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    if (!selectedFlightId || !slotDate) return;
    const controller = new AbortController();

    fetchJsonSafe<{ slots: SlotOption[] }>(`/api/booking/slots?flightId=${selectedFlightId}&date=${slotDate}&people=${peopleCount}`, { signal: controller.signal })
      .then((data) => {
        setSlots(data.slots);
        setSelectedSlotId('');
      })
      .catch((e) => setError(e.message));

    return () => controller.abort();
  }, [selectedFlightId, slotDate, peopleCount]);

  const visibleAddons = useMemo(
    () => addons.filter((addon) => addon.allowedFlightIds.includes(selectedFlightId)),
    [addons, selectedFlightId],
  );

  async function submitBooking() {
    setError(null);
    setSuccessReference(null);

    try {
      const payload = await fetchJsonSafe<{ booking: any }>('/api/booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId: selectedFlightId,
          dailySlotId: selectedSlotId,
          peopleCount,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerEmail: email,
          customerPhone: phone,
          discountCode,
          addons: Object.entries(selectedAddons)
            .filter(([, checked]) => checked)
            .map(([addonId]) => ({ addonId, quantity: 1 })),
          language: locale,
        }),
      });

      setSuccessReference(payload.booking?.booking_reference ?? payload.booking?.bookingReference ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <label className="text-sm">
          {t.language}
          <select className="ml-2 rounded border p-1" value={locale} onChange={(e) => setLocale(resolveLocale(e.target.value))}>
            {SUPPORTED_LOCALES.map((value) => (
              <option key={value} value={value}>{value.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-6">
        <label className="block text-sm font-medium">{t.flight}
          <select className="mt-1 w-full rounded border p-2" value={selectedFlightId} onChange={(e) => setSelectedFlightId(e.target.value)}>
            {flights.map((flight) => <option key={flight.id} value={flight.id}>{flight.name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">{t.people}
          <select className="mt-1 w-full rounded border p-2" value={peopleCount} onChange={(e) => setPeopleCount(Number(e.target.value))}>
            {[1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">{t.date}
          <input className="mt-1 w-full rounded border p-2" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
        </label>

        <label className="block text-sm font-medium">{t.slot}
          <select className="mt-1 w-full rounded border p-2" value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)}>
            <option value="">--</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.slotStartIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({slot.remainingSeats} left)
              </option>
            ))}
          </select>
          {!slots.length && <p className="mt-1 text-xs text-slate-500">{t.noSlots}</p>}
        </label>

        <div>
          <p className="text-sm font-medium">{t.addons}</p>
          <div className="mt-2 space-y-2">
            {visibleAddons.map((addon) => (
              <label key={addon.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{addon.name} ({addon.pricingScope === 'per_person' ? 'per person' : 'per booking'})</span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedAddons[addon.id])}
                  onChange={(e) => setSelectedAddons((prev) => ({ ...prev, [addon.id]: e.target.checked }))}
                />
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm font-medium">{t.discount}
          <input className="mt-1 w-full rounded border p-2" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.firstName}<input className="mt-1 w-full rounded border p-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
          <label className="text-sm font-medium">{t.lastName}<input className="mt-1 w-full rounded border p-2" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.email}<input className="mt-1 w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.phone}<input className="mt-1 w-full rounded border p-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {successReference && <p className="text-sm text-emerald-700">{t.success}: {successReference}</p>}

        <button className="w-full rounded bg-brand px-4 py-2 font-medium text-white" onClick={submitBooking}>
          {t.submit}
        </button>
      </div>
    </main>
  );
}
