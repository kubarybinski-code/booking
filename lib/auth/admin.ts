import { createSupabaseServerClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/config/env';

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Unauthorized');
  }

  const allowed = serverEnv.ADMIN_EMAILS.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes((data.user.email ?? '').toLowerCase())) {
    throw new Error('Forbidden');
  }

  return data.user;
}
