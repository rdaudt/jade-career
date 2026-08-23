import { getDb } from '@/db/client'
import { skillsGuidance, type SkillGuidance } from '@/db/schema'

export async function listSkillsGuidance(): Promise<SkillGuidance[]> {
  const db = getDb()
  return db.select().from(skillsGuidance)
}
