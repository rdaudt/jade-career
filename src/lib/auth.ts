import { createHmac, timingSafeEqual } from 'node:crypto'

function sign(secret: string): string {
  return createHmac('sha256', secret).update('dashboard-session').digest('hex')
}

export function makeSessionValue(): string {
  return sign(process.env.SESSION_SECRET!)
}

export function verifySession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  const expected = sign(process.env.SESSION_SECRET!)
  const a = Buffer.from(cookieValue)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
