'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function login() {
    setError(null);
    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (configError) {
      setError((configError as Error).message);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/admin');
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">Admin login</h1>
        <div className="space-y-3">
          <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded bg-slate-900 p-2 text-white" onClick={login}>Sign in</button>
        </div>
      </div>
    </main>
  );
}
