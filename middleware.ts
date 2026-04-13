import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env, isSupabasePublicConfigured } from '@/lib/config/env';

function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const allowed = env.ADMIN_EMAILS.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 ? true : allowed.includes(email.toLowerCase());
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/admin/login')) return NextResponse.next();

  if (!isSupabasePublicConfigured()) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email ?? undefined)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return response;
}

export const config = { matcher: ['/admin/:path*'] };
