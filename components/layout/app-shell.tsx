import Link from 'next/link';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <Link href="/" className="font-semibold text-brand-dark">
            Tandem Ops
          </Link>
          <Link href="/admin" className="text-sm text-slate-700 hover:text-slate-900">
            Admin
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
