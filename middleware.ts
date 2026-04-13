import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env, isSupabasePublicConfigured } from '@/lib/config/env';

function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const allowed = env.ADMIN_EMAILS.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 ? true : allowed.includes(email.toLowerCase());
}

function withEmbedHeaders(request: NextRequest, response: NextResponse) {
  const path = request.nextUrl.pathname;
  const isCustomerEmbedPath = path === '/' || path.startsWith('/book') || path.startsWith('/booking/manage');

  if (isCustomerEmbedPath) {
    const allowedOrigins = (process.env.ALLOWED_IFRAME_ORIGINS ?? '').trim();
    const ancestors = allowedOrigins.length > 0 ? allowedOrigins : "'self'";
    response.headers.set('Content-Security-Policy', `frame-ancestors ${ancestors};`);
  } else if (path.startsWith('/admin')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  return response;
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return withEmbedHeaders(request, NextResponse.next());
  }
  if (request.nextUrl.pathname.startsWith('/admin/login')) {
    return withEmbedHeaders(request, NextResponse.next());
  }

  if (!isSupabasePublicConfigured()) {
    return withEmbedHeaders(request, NextResponse.next());
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
    return withEmbedHeaders(request, NextResponse.redirect(new URL('/admin/login', request.url)));
  }

  return withEmbedHeaders(request, response);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
