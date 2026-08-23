'use server'
import { revalidatePath } from 'next/cache'
import { createContact, logInteraction } from '@/lib/contacts'

export async function createContactAction(formData: FormData) {
  await createContact({
    name: String(formData.get('name') ?? ''),
    org: String(formData.get('org') ?? ''),
    role: String(formData.get('role') ?? ''),
    source: String(formData.get('source') ?? 'manually added'),
  })
  revalidatePath('/network')
}

export async function logInteractionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const note = String(formData.get('note') ?? '')
  const nextFollowUpRaw = String(formData.get('nextFollowUpAt') ?? '')
  const nextFollowUpAt = nextFollowUpRaw ? new Date(nextFollowUpRaw) : null
  await logInteraction(id, note, nextFollowUpAt)
  revalidatePath('/network')
}
