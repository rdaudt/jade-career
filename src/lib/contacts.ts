import { asc, isNotNull } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { contacts, type Contact, type NewContact } from '@/db/schema'
import { eq } from 'drizzle-orm'

export function appendNote(existing: string, note: string, at: Date): string {
  const stamped = `[${at.toISOString().slice(0, 10)}] ${note}`
  return existing ? `${existing}\n\n${stamped}` : stamped
}

export async function listContactsByFollowUp(): Promise<Contact[]> {
  const db = getDb()
  return db
    .select()
    .from(contacts)
    .where(isNotNull(contacts.nextFollowUpAt))
    .orderBy(asc(contacts.nextFollowUpAt))
}

export async function createContact(
  input: Pick<NewContact, 'name' | 'org' | 'role' | 'source'>
): Promise<void> {
  const db = getDb()
  await db.insert(contacts).values({
    ...input,
    status: 'suggested',
    createdAt: new Date(),
  })
}

export async function logInteraction(
  id: number,
  note: string,
  nextFollowUpAt: Date | null
): Promise<void> {
  const db = getDb()
  const [existing] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
  if (!existing) return
  await db
    .update(contacts)
    .set({
      notes: appendNote(existing.notes, note, new Date()),
      lastContactAt: new Date(),
      nextFollowUpAt,
      status: existing.status === 'suggested' ? 'contacted' : existing.status,
    })
    .where(eq(contacts.id, id))
}
