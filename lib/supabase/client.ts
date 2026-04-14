import { createBrowserClient } from '@supabase/ssr';
import { assertEnv, env } from '@/lib/config/env';

export function createSupabaseBrowserClient() {
  assertEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'], 'supabase-browser');
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
