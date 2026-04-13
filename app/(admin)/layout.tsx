import { AdminNav } from '@/components/admin/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">Operations Admin</h2>
        <p className="text-sm text-slate-600">English-only internal panel.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <AdminNav />
        <div>{children}</div>
      </div>
    </section>
  );
}
