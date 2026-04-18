import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  isAppAuthDisabled,
  sanitizeRedirectPath,
  SESSION_COOKIE_NAME,
  verifySignedSessionToken,
} from '@/lib/auth';

function withShellHeader(request: NextRequest, shell: 'app' | 'auth'): NextResponse {
  const headers = new Headers(request.headers);
  headers.set('x-astro-shell', shell);
  return NextResponse.next({
    request: { headers },
  });
}

function isAuthRoute(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico' ||
    /\.(css|js|svg|png|jpg|jpeg|gif|ico|woff2?|ttf|eot|webp|avif|map)$/i.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authRoute = isAuthRoute(pathname);

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (isAppAuthDisabled(process.env)) {
    return withShellHeader(request, authRoute ? 'auth' : 'app');
  }

  if (authRoute) {
    return withShellHeader(request, 'auth');
  }

  const session = await verifySignedSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    process.env,
  );

  if (session) {
    return withShellHeader(request, 'app');
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/auth';
  loginUrl.search = '';

  const nextPath = sanitizeRedirectPath(`${pathname}${search}`);
  if (nextPath !== '/') {
    loginUrl.searchParams.set('next', nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
};
