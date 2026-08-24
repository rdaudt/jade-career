import type { Profile, FeedItem } from '@/db/schema'

const TASK_GUIDANCE: Record<FeedItem['type'], string> = {
  person_suggestion:
    'Find 3-5 specific people (with name, org, and role where possible) working in this space who would be worth reaching out to.',
  org_signal:
    'Find 3-5 organizations that are growing, hiring, or launching new programs in this space.',
  event:
    'Find 3-5 upcoming events, conferences, or communities (e.g. professional associations) relevant to this space.',
  news:
    'Find 3-5 recent news articles or reports relevant to this space.',
  funding:
    'Find 3-5 recent funding announcements or new program initiatives relevant to this space.',
  job:
    'Find 3-5 current job postings relevant to this space, prioritizing settlement-sector and community-org job boards and specific organizations\' career pages over generic job search results.',
}

export function buildResearchPrompt(
  profile: Profile,
  type: FeedItem['type'],
  recentTitles: string[]
): string {
  const lines = [
    `You are researching for a social worker based in ${profile.location}, open to opportunities in ${profile.openToLocations}.`,
    `Her interests: ${profile.interestTags}.`,
    `Explicitly NOT relevant to her: ${profile.exclusionTags}.`,
    `Task (${type}): ${TASK_GUIDANCE[type]}`,
    'Use the web_search tool to find real, current results. After searching, respond with ONLY a JSON array (no prose) where each element has these exact keys:',
    '  title (string), summary (one sentence, string), url (the actual URL from search results), sourceName (string), publishedAt (ISO 8601 datetime or null), locationRelevance ("Victoria" | "Lower Mainland" | "BC-wide" | "national")',
    'Only include items with real URLs you found via search. Do not fabricate URLs.',
  ]
  if (recentTitles.length > 0) {
    lines.push(`Do not repeat these already-known items: ${recentTitles.join('; ')}`)
  }
  return lines.join('\n')
}
