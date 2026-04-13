import { createClient } from '@supabase/supabase-js';
import { assertEnv, env } from '@/lib/config/env';

let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  assertEnv(
    ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    'supabase-admin',
  );

  cachedClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedClient;
}

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient() as any;
      return client[prop];
    },
  },
) as ReturnType<typeof createClient>;
