import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function secret() {
  return new TextEncoder().encode(
    (process.env.FB_APP_SECRET ?? 'dev-secret-change-in-prod') + '_ses'
  );
}

const PUBLIC = ['/login', '/api/auth/', '/api/cron/'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('fb_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  try {
    await jwtVerify(token, secret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('fb_session');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
