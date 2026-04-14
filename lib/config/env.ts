export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  APP_BASE_URL: process.env.APP_BASE_URL,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? '',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  ALLOWED_IFRAME_ORIGINS: process.env.ALLOWED_IFRAME_ORIGINS ?? '',
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: env.RESEND_API_KEY,
  APP_BASE_URL: env.APP_BASE_URL,
  ADMIN_EMAILS: env.ADMIN_EMAILS,
  CRON_SECRET: env.CRON_SECRET,
  ALLOWED_IFRAME_ORIGINS: env.ALLOWED_IFRAME_ORIGINS,
};

export function getMissingEnv(names: Array<keyof typeof env>) {
  return names.filter((name) => !env[name]);
}

export function assertEnv(names: Array<keyof typeof env>, scope: string) {
  const missing = getMissingEnv(names);
  if (missing.length) {
    throw new Error(`[config:${scope}] Missing environment variables: ${missing.join(', ')}`);
  }
}

export function isSupabasePublicConfigured() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
