'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<{ bookingsCount: number; todaySlotsCount: number } | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard').then((r) => r.json()).then(setData);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Bookings total</p><p className="text-2xl font-semibold">{data?.bookingsCount ?? '-'}</p></div>
      <div className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Today slots</p><p className="text-2xl font-semibold">{data?.todaySlotsCount ?? '-'}</p></div>
    </div>
  );
}
