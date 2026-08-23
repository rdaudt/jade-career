import { NextRequest, NextResponse } from 'next/server'
import { makeSessionValue } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', makeSessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
