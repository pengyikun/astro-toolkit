import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  isBasicAuthAuthorized,
  resolveBasicAuthConfig,
} from '@/lib/basic-auth';

const CHALLENGE_HEADER = 'Basic realm="Astro Toolkit", charset="UTF-8"';

function unauthorizedResponse(message: string, status = 401): NextResponse {
  return new NextResponse(message, {
    status,
    headers: {
      'WWW-Authenticate': CHALLENGE_HEADER,
      'Cache-Control': 'no-store',
    },
  });
}

export function proxy(request: NextRequest) {
  const config = resolveBasicAuthConfig(process.env);

  if (config.mode === 'disabled') {
    return NextResponse.next();
  }

  if (config.mode === 'misconfigured') {
    return unauthorizedResponse(
      'Production auth is required. Set BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD or explicitly set APP_AUTH_DISABLED=true.',
      500,
    );
  }

  const isAuthorized = isBasicAuthAuthorized(
    request.headers.get('authorization'),
    config.username!,
    config.password!,
  );

  if (isAuthorized) {
    return NextResponse.next();
  }

  return unauthorizedResponse('Authentication required.');
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
