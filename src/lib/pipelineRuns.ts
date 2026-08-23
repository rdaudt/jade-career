import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { pipelineRuns, type PipelineRun, type FeedItem } from '@/db/schema'

const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000
const ALL_TYPES: FeedItem['type'][] = [
  'news',
  'event',
  'org_signal',
  'funding',
  'job',
  'person_suggestion',
]

export function isStale(run: PipelineRun | undefined, now: Date): boolean {
  if (!run) return true
  if (!run.success) return true
  return now.getTime() - run.startedAt.getTime() > STALE_AFTER_MS
}

export async function getLatestRunPerType(): Promise<
  Record<FeedItem['type'], PipelineRun | undefined>
> {
  const db = getDb()
  const result = {} as Record<FeedItem['type'], PipelineRun | undefined>
  for (const type of ALL_TYPES) {
    const [latest] = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.taskType, type))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1)
    result[type] = latest
  }
  return result
}
