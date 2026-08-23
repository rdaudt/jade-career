'use server'
import { revalidatePath } from 'next/cache'
import { upsertProfile } from '@/lib/profile'

export async function saveProfileAction(formData: FormData) {
  await upsertProfile({
    location: String(formData.get('location') ?? ''),
    openToLocations: String(formData.get('openToLocations') ?? ''),
    interestTags: String(formData.get('interestTags') ?? ''),
    exclusionTags: String(formData.get('exclusionTags') ?? ''),
    careerStage: String(formData.get('careerStage') ?? ''),
    currentRole: String(formData.get('currentRole') ?? ''),
  })
  revalidatePath('/settings')
}
