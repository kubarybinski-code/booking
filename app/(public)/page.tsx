import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Paragliding Booking</h1>
      <p className="max-w-2xl text-slate-600">
        Customer booking flow is now available with multilingual UI, slot validation, add-ons, discounts,
        and backend-safe booking creation.
      </p>
      <div>
        <Link href="/book" className="inline-flex rounded bg-brand px-4 py-2 text-white">
          Open booking page
        </Link>
      </div>
    </main>
  );
}
