import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profile, type Profile, type NewProfile } from '@/db/schema'

type ProfileInput = {
  location: string
  openToLocations: string
  interestTags: string
  exclusionTags: string
  careerStage: string
  currentRole: string
}

export function shapeProfileForUpsert(input: ProfileInput): NewProfile {
  return {
    location: input.location.trim(),
    openToLocations: input.openToLocations.trim(),
    interestTags: input.interestTags.trim(),
    exclusionTags: input.exclusionTags.trim(),
    careerStage: input.careerStage.trim(),
    currentRole: input.currentRole.trim(),
    updatedAt: new Date(),
  }
}

export async function getProfile(): Promise<Profile | undefined> {
  const db = getDb()
  const rows = await db.select().from(profile).limit(1)
  return rows[0]
}

export async function upsertProfile(input: ProfileInput): Promise<void> {
  const db = getDb()
  const existing = await getProfile()
  const row = shapeProfileForUpsert(input)
  if (existing) {
    await db.update(profile).set(row).where(eq(profile.id, existing.id))
  } else {
    await db.insert(profile).values(row)
  }
}
