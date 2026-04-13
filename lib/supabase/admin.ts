import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/config/env';

export const supabaseAdmin = createClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
