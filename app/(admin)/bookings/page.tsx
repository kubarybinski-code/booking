'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [flightId, setFlightId] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (status) params.set('status', status);
    if (flightId) params.set('flightId', flightId);
    const res = await fetch(`/api/admin/bookings?${params.toString()}`);
    const payload = await res.json();
    setBookings(payload.bookings ?? []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="date" className="rounded border p-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="rounded border p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="pending">pending</option><option value="confirmed">confirmed</option><option value="cancelled">cancelled</option>
        </select>
        <input className="rounded border p-2 text-sm" placeholder="Flight ID" value={flightId} onChange={(e) => setFlightId(e.target.value)} />
        <button className="rounded border px-3" onClick={load}>Filter</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left"><th>Ref</th><th>Status</th><th>Customer</th><th>People</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td>{b.booking_reference}</td><td>{b.status}</td><td>{b.customer_first_name} {b.customer_last_name}</td><td>{b.people_count}</td><td>{new Date(b.created_at).toLocaleString()}</td>
                <td><Link href={`/admin/bookings/${b.id}`} className="text-sky-700">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
