function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
};

export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  RESEND_API_KEY: getRequiredEnv('RESEND_API_KEY'),
  APP_BASE_URL: getRequiredEnv('APP_BASE_URL'),
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? '',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
};
