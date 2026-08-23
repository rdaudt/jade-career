import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { getDb } from '@/db/client'
import { feedItems, pipelineRuns } from '@/db/schema'
import type { FeedItem } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getProfile } from '@/lib/profile'
import { shapeFeedItem } from '@/lib/research/shape'
import { researchItemSchema } from '@/lib/research/schemas'
import { buildResearchPrompt } from '@/lib/research/prompts'

const TASK_TYPES: FeedItem['type'][] = [
  'news',
  'event',
  'org_signal',
  'funding',
  'job',
  'person_suggestion',
]

const resultSchema = z.object({ items: z.array(researchItemSchema) })

async function runTask(type: FeedItem['type']) {
  const db = getDb()
  const profile = await getProfile()
  if (!profile) {
    await db.insert(pipelineRuns).values({
      startedAt: new Date(),
      taskType: type,
      success: false,
      itemCount: 0,
      errorMessage: 'No profile configured',
    })
    return
  }

  const recent = await db
    .select({ title: feedItems.title })
    .from(feedItems)
    .where(eq(feedItems.type, type))
    .orderBy(desc(feedItems.discoveredAt))
    .limit(20)

  try {
    const { object } = await generateObject({
      model: gateway('anthropic/claude-sonnet-4.5'),
      schema: resultSchema,
      prompt: buildResearchPrompt(profile, type, recent.map((r) => r.title)),
    })

    let inserted = 0
    for (const raw of object.items) {
      const row = shapeFeedItem(raw, type)
      if (!row) continue
      const existing = await db
        .select({ id: feedItems.id })
        .from(feedItems)
        .where(eq(feedItems.url, row.url))
        .limit(1)
      if (existing.length > 0) continue
      await db.insert(feedItems).values(row)
      inserted += 1
    }

    await db.insert(pipelineRuns).values({
      startedAt: new Date(),
      taskType: type,
      success: true,
      itemCount: inserted,
    })
  } catch (err) {
    await db.insert(pipelineRuns).values({
      startedAt: new Date(),
      taskType: type,
      success: false,
      itemCount: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  for (const type of TASK_TYPES) {
    await runTask(type)
  }

  return NextResponse.json({ ok: true })
}
