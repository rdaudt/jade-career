import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }
  const session = req.cookies.get('session')?.value
  if (!verifySession(session)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export const runtime = 'nodejs'
