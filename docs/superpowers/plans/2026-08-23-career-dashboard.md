# Career & Network Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user, password-gated Next.js dashboard that surfaces networking suggestions, a lightweight contacts CRM, a curated news feed, and career-opportunity signals — all populated by a weekly AI research pipeline writing into Turso.

**Architecture:** Next.js App Router app on Vercel. Turso (libSQL) via Drizzle ORM holds all data (`profile`, `contacts`, `feed_items`, `skills_guidance`, `pipeline_runs`). A password-gate middleware protects every route except `/login`. A Vercel Cron job hits an API route weekly; that route runs one AI SDK (web-search-enabled) research task per `feed_items` type, validates output with Zod, dedups by URL, and inserts rows. All dashboard pages read directly from Turso — no live AI calls on page load.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Drizzle ORM, `@libsql/client` (Turso), Zod, AI SDK (`ai` package) via Vercel AI Gateway, Vitest for unit tests.

## Global Constraints

- Single shared password auth only — no user accounts, no OAuth (spec: Auth).
- All dashboard reads come from Turso; no live AI calls triggered by a page visit (spec: Non-Goals).
- Research pipeline runs weekly via Vercel Cron, not on-demand (spec: Architecture).
- `feed_items` is one unified table across `news | event | org_signal | funding | job | person_suggestion`, distinguished by a `type` column — do not create per-type tables (spec: Data Model).
- Dedup `feed_items` by `url` on insert.
- A failing research task must not block other tasks in the same cron run; log failures to `pipeline_runs` (spec: Error Handling).
- Automated testing targets the deterministic data-shaping/validation logic only — not AI output quality (spec: Testing).

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.gitignore`, `.env.local.example`

**Interfaces:**
- Produces: a running Next.js App Router project at the repo root with TypeScript + Tailwind CSS configured, that later tasks add files into (`src/app/...`, `src/db/...`, `src/lib/...`).

- [ ] **Step 1: Scaffold with create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --use-npm --yes
```

Expected: project files created in the current directory (`d:/projects/jade-career`), no prompts (the `--yes` flag accepts defaults for anything not covered by the explicit flags).

- [ ] **Step 2: Add project dependencies**

```bash
npm install drizzle-orm @libsql/client zod ai @ai-sdk/gateway
npm install -D drizzle-kit vitest @vitejs/plugin-react dotenv-cli
```

- [ ] **Step 3: Add `.env.local.example`**

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
DASHBOARD_PASSWORD=
SESSION_SECRET=
CRON_SECRET=
AI_GATEWAY_API_KEY=
```

- [ ] **Step 4: Verify the dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100`
Expected: `200`. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Drizzle, AI SDK deps"
```

---

### Task 2: Turso client and environment config

**Files:**
- Create: `src/db/client.ts`
- Modify: `.env.local.example` (already created in Task 1 — no change needed here, just referenced)

**Interfaces:**
- Produces: `getDb(): LibSQLDatabase<typeof schema>` from `src/db/client.ts` — lazily-initialized singleton, used by every data-access module in later tasks. Depends on `src/db/schema.ts` (Task 3), so this task only creates the client wiring; the import of `./schema` is added once Task 3 exists (this task can reference a not-yet-existing schema file since both tasks land before any code calls `getDb()` end-to-end — Task 3 completes the pair).

- [ ] **Step 1: Write the Turso client module**

```ts
// src/db/client.ts
import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  return drizzle(client, { schema })
}

let _db: LibSQLDatabase<typeof schema> | null = null

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) _db = createDb()
  return _db
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: add lazily-initialized Turso/Drizzle client"
```

(This will not type-check until Task 3 adds `src/db/schema.ts` — that's expected and resolved in the next task.)

---

### Task 3: Drizzle schema and migrations

**Files:**
- Create: `src/db/schema.ts`
- Create: `drizzle.config.ts`
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `src/db/client.ts` (Task 2)
- Produces: Drizzle table objects `profile`, `contacts`, `feedItems`, `skillsGuidance`, `pipelineRuns`, and their inferred row types `Profile`, `NewProfile`, `Contact`, `NewContact`, `FeedItem`, `NewFeedItem`, `SkillGuidance`, `NewSkillGuidance`, `PipelineRun`, `NewPipelineRun` — imported by every later data-access and pipeline task.

- [ ] **Step 1: Write the schema**

```ts
// src/db/schema.ts
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  location: text('location').notNull(),
  openToLocations: text('open_to_locations').notNull().default(''),
  interestTags: text('interest_tags').notNull().default(''),
  exclusionTags: text('exclusion_tags').notNull().default(''),
  careerStage: text('career_stage').notNull().default(''),
  currentRole: text('current_role').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  org: text('org').notNull().default(''),
  role: text('role').notNull().default(''),
  source: text('source').notNull().default(''),
  status: text('status', {
    enum: ['suggested', 'contacted', 'responded', 'connected', 'dormant'],
  }).notNull().default('suggested'),
  notes: text('notes').notNull().default(''),
  linkedinUrl: text('linkedin_url').notNull().default(''),
  email: text('email').notNull().default(''),
  lastContactAt: integer('last_contact_at', { mode: 'timestamp' }),
  nextFollowUpAt: integer('next_follow_up_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const feedItems = sqliteTable('feed_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', {
    enum: ['news', 'event', 'org_signal', 'funding', 'job', 'person_suggestion'],
  }).notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  url: text('url').notNull(),
  sourceName: text('source_name').notNull().default(''),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  discoveredAt: integer('discovered_at', { mode: 'timestamp' }).notNull(),
  locationRelevance: text('location_relevance', {
    enum: ['Victoria', 'Lower Mainland', 'BC-wide', 'national'],
  }).notNull().default('BC-wide'),
  embedding: blob('embedding', { mode: 'buffer' }),
  userStatus: text('user_status', {
    enum: ['new', 'saved', 'dismissed', 'acted_on'],
  }).notNull().default('new'),
})

export const skillsGuidance = sqliteTable('skills_guidance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  skillOrCredential: text('skill_or_credential').notNull(),
  rationale: text('rationale').notNull().default(''),
  relatedJobIds: text('related_job_ids').notNull().default(''),
})

export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  taskType: text('task_type', {
    enum: ['news', 'event', 'org_signal', 'funding', 'job', 'person_suggestion'],
  }).notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  itemCount: integer('item_count').notNull().default(0),
  errorMessage: text('error_message'),
})

export type Profile = typeof profile.$inferSelect
export type NewProfile = typeof profile.$inferInsert
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type FeedItem = typeof feedItems.$inferSelect
export type NewFeedItem = typeof feedItems.$inferInsert
export type SkillGuidance = typeof skillsGuidance.$inferSelect
export type NewSkillGuidance = typeof skillsGuidance.$inferInsert
export type PipelineRun = typeof pipelineRuns.$inferSelect
export type NewPipelineRun = typeof pipelineRuns.$inferInsert
```

- [ ] **Step 2: Write drizzle-kit config**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

- [ ] **Step 3: Write a schema smoke test (no live DB needed)**

```ts
// src/db/schema.test.ts
import { describe, it, expect } from 'vitest'
import { profile, contacts, feedItems, skillsGuidance, pipelineRuns } from './schema'

describe('schema', () => {
  it('exposes all five tables with their expected column keys', () => {
    expect(Object.keys(profile)).toContain('location')
    expect(Object.keys(contacts)).toContain('status')
    expect(Object.keys(feedItems)).toContain('type')
    expect(Object.keys(skillsGuidance)).toContain('skillOrCredential')
    expect(Object.keys(pipelineRuns)).toContain('taskType')
  })
})
```

- [ ] **Step 4: Run the test**

Run: `npx dotenv -e .env.local -- npx vitest run src/db/schema.test.ts`
Expected: PASS (this test needs no real Turso connection since it only inspects the schema objects).

- [ ] **Step 5: Provision Turso and push the schema**

```bash
vercel integration add turso
vercel env pull .env.local --yes
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected: drizzle-kit reports the five tables created in the linked Turso database.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle.config.ts
git commit -m "feat: add Drizzle schema for profile, contacts, feed_items, skills_guidance, pipeline_runs"
```

---

### Task 4: Password-gate auth

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/api/login/route.ts`
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `verifySession(cookieValue: string | undefined): boolean` and `makeSessionValue(): string` from `src/lib/auth.ts`, used by both the middleware and the login route.

- [ ] **Step 1: Write the failing test for the auth helper**

```ts
// src/lib/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { verifySession, makeSessionValue } from './auth'

describe('auth', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret'
  })

  it('verifies a session value produced by makeSessionValue', () => {
    const value = makeSessionValue()
    expect(verifySession(value)).toBe(true)
  })

  it('rejects an undefined or tampered session value', () => {
    expect(verifySession(undefined)).toBe(false)
    expect(verifySession('garbage')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — `./auth` has no exported members.

- [ ] **Step 3: Implement the auth helper**

```ts
// src/lib/auth.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Write the login API route**

```ts
// src/app/api/login/route.ts
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
```

- [ ] **Step 6: Write the login page**

```tsx
// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Password"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          Enter
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 7: Write the middleware**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }
  const session = req.cookies.get('session')?.value
  if (!verifySession(session)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev -- --port 3100 &`
Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/` — expect `307` (redirect to `/login`).
Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/login` — expect `200`.
Stop the dev server afterward.

- [ ] **Step 9: Commit**

```bash
git add src/middleware.ts src/app/login src/app/api/login src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: add password-gate auth via middleware"
```

---

### Task 5: Profile data layer and `/settings` page

**Files:**
- Create: `src/lib/profile.ts`
- Create: `src/app/settings/page.tsx`
- Create: `src/app/settings/actions.ts`
- Test: `src/lib/profile.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 2), `profile` table + `Profile`/`NewProfile` types (Task 3)
- Produces: `getProfile(): Promise<Profile | undefined>` and `upsertProfile(data: Omit<NewProfile, 'id' | 'updatedAt'>): Promise<void>` from `src/lib/profile.ts`, used by `/settings` (this task) and by the cron research route (Task 13).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/profile.test.ts
import { describe, it, expect, vi } from 'vitest'
import { shapeProfileForUpsert } from './profile'

describe('shapeProfileForUpsert', () => {
  it('trims fields and stamps updatedAt', () => {
    const before = Date.now()
    const row = shapeProfileForUpsert({
      location: '  Victoria, BC  ',
      openToLocations: 'Lower Mainland',
      interestTags: 'youth, newcomers',
      exclusionTags: 'clinical, child welfare',
      careerStage: 'early-career',
      currentRole: '',
    })
    expect(row.location).toBe('Victoria, BC')
    expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: FAIL — `shapeProfileForUpsert` not exported.

- [ ] **Step 3: Implement the profile data layer**

```ts
// src/lib/profile.ts
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { profile, type Profile, type NewProfile } from '@/db/schema'

type ProfileInput = Omit<NewProfile, 'id' | 'updatedAt'>

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: PASS

- [ ] **Step 5: Write the server action**

```ts
// src/app/settings/actions.ts
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
```

- [ ] **Step 6: Write the settings page**

```tsx
// src/app/settings/page.tsx
import { getProfile } from '@/lib/profile'
import { saveProfileAction } from './actions'

export default async function SettingsPage() {
  const profile = await getProfile()

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Profile</h1>
      <form action={saveProfileAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Location
          <input name="location" defaultValue={profile?.location ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Open to locations
          <input name="openToLocations" defaultValue={profile?.openToLocations ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Interest tags
          <input name="interestTags" defaultValue={profile?.interestTags ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Exclusion tags
          <input name="exclusionTags" defaultValue={profile?.exclusionTags ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Career stage
          <input name="careerStage" defaultValue={profile?.careerStage ?? ''} className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Current role
          <input name="currentRole" defaultValue={profile?.currentRole ?? ''} className="border rounded px-3 py-2" />
        </label>
        <button type="submit" className="bg-black text-white rounded px-3 py-2 w-fit">
          Save
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts src/app/settings
git commit -m "feat: add profile data layer and /settings page"
```

---

### Task 6: Feed items data layer and shared `FeedItemCard`

**Files:**
- Create: `src/lib/feedItems.ts`
- Create: `src/app/components/FeedItemCard.tsx`
- Create: `src/app/actions/feedItemActions.ts`
- Test: `src/lib/feedItems.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 2), `feedItems` table + `FeedItem` type (Task 3)
- Produces: `getFeedItemsByType(type: FeedItem['type'], status?: FeedItem['userStatus']): Promise<FeedItem[]>`, `setFeedItemStatus(id: number, status: FeedItem['userStatus']): Promise<void>` from `src/lib/feedItems.ts` — consumed by Tasks 7, 9, 10. `FeedItemCard` React component consumed by Tasks 7, 9, 10.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/feedItems.test.ts
import { describe, it, expect } from 'vitest'
import { sortByDiscoveredDesc } from './feedItems'
import type { FeedItem } from '@/db/schema'

function item(overrides: Partial<FeedItem>): FeedItem {
  return {
    id: 1,
    type: 'news',
    title: 't',
    summary: '',
    url: 'https://example.com',
    sourceName: '',
    publishedAt: null,
    discoveredAt: new Date('2026-01-01'),
    locationRelevance: 'BC-wide',
    embedding: null,
    userStatus: 'new',
    ...overrides,
  }
}

describe('sortByDiscoveredDesc', () => {
  it('orders items newest-discovered first', () => {
    const older = item({ id: 1, discoveredAt: new Date('2026-01-01') })
    const newer = item({ id: 2, discoveredAt: new Date('2026-02-01') })
    const sorted = sortByDiscoveredDesc([older, newer])
    expect(sorted.map((i) => i.id)).toEqual([2, 1])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/feedItems.test.ts`
Expected: FAIL — `sortByDiscoveredDesc` not exported.

- [ ] **Step 3: Implement the feed items data layer**

```ts
// src/lib/feedItems.ts
import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { feedItems, type FeedItem } from '@/db/schema'

export function sortByDiscoveredDesc(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime())
}

export async function getFeedItemsByType(
  type: FeedItem['type'],
  status: FeedItem['userStatus'] = 'new'
): Promise<FeedItem[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(feedItems)
    .where(and(eq(feedItems.type, type), eq(feedItems.userStatus, status)))
    .orderBy(desc(feedItems.discoveredAt))
  return rows
}

export async function setFeedItemStatus(
  id: number,
  status: FeedItem['userStatus']
): Promise<void> {
  const db = getDb()
  await db.update(feedItems).set({ userStatus: status }).where(eq(feedItems.id, id))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/feedItems.test.ts`
Expected: PASS

- [ ] **Step 5: Write the shared server actions for save/dismiss**

```ts
// src/app/actions/feedItemActions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { setFeedItemStatus } from '@/lib/feedItems'

export async function saveFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'saved')
  revalidatePath(path)
}

export async function dismissFeedItemAction(id: number, path: string) {
  await setFeedItemStatus(id, 'dismissed')
  revalidatePath(path)
}
```

- [ ] **Step 6: Write the shared FeedItemCard component**

```tsx
// src/app/components/FeedItemCard.tsx
'use client'
import type { FeedItem } from '@/db/schema'
import { saveFeedItemAction, dismissFeedItemAction } from '@/app/actions/feedItemActions'

export function FeedItemCard({ item, path }: { item: FeedItem; path: string }) {
  return (
    <div className="border rounded p-4 flex flex-col gap-2">
      <a href={item.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
        {item.title}
      </a>
      {item.summary && <p className="text-sm text-gray-600">{item.summary}</p>}
      <div className="text-xs text-gray-400">
        {item.sourceName} · {item.locationRelevance}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => saveFeedItemAction(item.id, path)}
          className="text-sm bg-black text-white rounded px-2 py-1"
        >
          Save
        </button>
        <button
          onClick={() => dismissFeedItemAction(item.id, path)}
          className="text-sm border rounded px-2 py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/feedItems.ts src/lib/feedItems.test.ts src/app/components/FeedItemCard.tsx src/app/actions/feedItemActions.ts
git commit -m "feat: add feed items data layer and shared FeedItemCard"
```

---

### Task 7: `/network` page — suggestions and events

**Files:**
- Create: `src/app/network/page.tsx`

**Interfaces:**
- Consumes: `getFeedItemsByType` (Task 6), `FeedItemCard` (Task 6)

- [ ] **Step 1: Write the page**

```tsx
// src/app/network/page.tsx
import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'

export default async function NetworkPage() {
  const [people, orgs, events] = await Promise.all([
    getFeedItemsByType('person_suggestion'),
    getFeedItemsByType('org_signal'),
    getFeedItemsByType('event'),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Network</h1>

      <section>
        <h2 className="font-medium mb-2">People &amp; orgs to reach out to</h2>
        <div className="flex flex-col gap-3">
          {[...people, ...orgs].map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {people.length === 0 && orgs.length === 0 && (
            <p className="text-sm text-gray-500">No new suggestions yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Events &amp; communities</h2>
        <div className="flex flex-col gap-3">
          {events.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {events.length === 0 && <p className="text-sm text-gray-500">No new events yet.</p>}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev -- --port 3100 &`, log in via the browser at `http://localhost:3100/login`, then visit `/network` and confirm the page renders without error (empty sections are fine — the pipeline hasn't run yet). Stop the dev server afterward.

- [ ] **Step 3: Commit**

```bash
git add src/app/network/page.tsx
git commit -m "feat: add /network page for suggestions and events"
```

---

### Task 8: Contacts CRM — data layer and UI

**Files:**
- Create: `src/lib/contacts.ts`
- Create: `src/app/network/contacts-actions.ts`
- Create: `src/app/network/ContactsList.tsx`
- Modify: `src/app/network/page.tsx`
- Test: `src/lib/contacts.test.ts`

**Interfaces:**
- Consumes: `getDb()` (Task 2), `contacts` table + `Contact`/`NewContact` types (Task 3)
- Produces: `listContactsByFollowUp(): Promise<Contact[]>`, `logInteraction(id: number, note: string, nextFollowUpAt: Date | null): Promise<void>`, `createContact(input): Promise<void>` from `src/lib/contacts.ts`, consumed by this task's UI and by the cron pipeline if it ever writes suggested contacts directly (out of scope for v1 — pipeline writes `person_suggestion` feed items instead, per spec).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/contacts.test.ts
import { describe, it, expect } from 'vitest'
import { appendNote } from './contacts'

describe('appendNote', () => {
  it('appends a timestamped note to existing notes', () => {
    const result = appendNote('', 'First call went well', new Date('2026-03-01T00:00:00Z'))
    expect(result).toBe('[2026-03-01] First call went well')
  })

  it('appends below existing notes, separated by a blank line', () => {
    const result = appendNote('[2026-01-01] Intro email sent', 'Replied', new Date('2026-03-01T00:00:00Z'))
    expect(result).toBe('[2026-01-01] Intro email sent\n\n[2026-03-01] Replied')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/contacts.test.ts`
Expected: FAIL — `appendNote` not exported.

- [ ] **Step 3: Implement the contacts data layer**

```ts
// src/lib/contacts.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/contacts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the contacts server actions**

```ts
// src/app/network/contacts-actions.ts
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
```

- [ ] **Step 6: Write the ContactsList component**

```tsx
// src/app/network/ContactsList.tsx
import type { Contact } from '@/db/schema'
import { createContactAction, logInteractionAction } from './contacts-actions'

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium">Contacts</h2>
      <form action={createContactAction} className="flex gap-2 flex-wrap">
        <input name="name" placeholder="Name" required className="border rounded px-2 py-1" />
        <input name="org" placeholder="Org" className="border rounded px-2 py-1" />
        <input name="role" placeholder="Role" className="border rounded px-2 py-1" />
        <button type="submit" className="bg-black text-white rounded px-3 py-1">
          Add contact
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {contacts.map((c) => (
          <div key={c.id} className="border rounded p-4">
            <div className="font-medium">
              {c.name} {c.org && `· ${c.org}`}
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Status: {c.status}
              {c.nextFollowUpAt && ` · Follow up ${c.nextFollowUpAt.toISOString().slice(0, 10)}`}
            </div>
            {c.notes && <pre className="text-sm whitespace-pre-wrap mb-2">{c.notes}</pre>}
            <form action={logInteractionAction} className="flex gap-2 flex-wrap items-center">
              <input type="hidden" name="id" value={c.id} />
              <input name="note" placeholder="Log an interaction" className="border rounded px-2 py-1 flex-1" />
              <input type="date" name="nextFollowUpAt" className="border rounded px-2 py-1" />
              <button type="submit" className="border rounded px-2 py-1 text-sm">
                Save
              </button>
            </form>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-sm text-gray-500">No contacts yet.</p>}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Wire ContactsList into `/network`**

```tsx
// src/app/network/page.tsx
import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'
import { listContactsByFollowUp } from '@/lib/contacts'
import { ContactsList } from './ContactsList'

export default async function NetworkPage() {
  const [people, orgs, events, contacts] = await Promise.all([
    getFeedItemsByType('person_suggestion'),
    getFeedItemsByType('org_signal'),
    getFeedItemsByType('event'),
    listContactsByFollowUp(),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Network</h1>

      <section>
        <h2 className="font-medium mb-2">People &amp; orgs to reach out to</h2>
        <div className="flex flex-col gap-3">
          {[...people, ...orgs].map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {people.length === 0 && orgs.length === 0 && (
            <p className="text-sm text-gray-500">No new suggestions yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Events &amp; communities</h2>
        <div className="flex flex-col gap-3">
          {events.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/network" />
          ))}
          {events.length === 0 && <p className="text-sm text-gray-500">No new events yet.</p>}
        </div>
      </section>

      <ContactsList contacts={contacts} />
    </main>
  )
}
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev -- --port 3100 &`, log in, visit `/network`, add a contact via the form, log an interaction with a follow-up date, confirm it reappears sorted by follow-up date. Stop the dev server afterward.

- [ ] **Step 9: Commit**

```bash
git add src/lib/contacts.ts src/lib/contacts.test.ts src/app/network
git commit -m "feat: add contacts CRM data layer and UI on /network"
```

---

### Task 9: `/stay-current` page

**Files:**
- Create: `src/app/stay-current/page.tsx`

**Interfaces:**
- Consumes: `getFeedItemsByType` (Task 6), `FeedItemCard` (Task 6)

- [ ] **Step 1: Write the page**

```tsx
// src/app/stay-current/page.tsx
import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'

export default async function StayCurrentPage() {
  const news = await getFeedItemsByType('news')

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Stay Current</h1>
      <div className="flex flex-col gap-3">
        {news.map((item) => (
          <FeedItemCard key={item.id} item={item} path="/stay-current" />
        ))}
        {news.length === 0 && <p className="text-sm text-gray-500">No new articles yet.</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev -- --port 3100 &`, log in, visit `/stay-current`, confirm it renders. Stop the dev server afterward.

- [ ] **Step 3: Commit**

```bash
git add src/app/stay-current/page.tsx
git commit -m "feat: add /stay-current news feed page"
```

---

### Task 10: `/career` page

**Files:**
- Create: `src/lib/skillsGuidance.ts`
- Create: `src/app/career/page.tsx`

**Interfaces:**
- Consumes: `getFeedItemsByType` (Task 6), `FeedItemCard` (Task 6), `skillsGuidance` table + `SkillGuidance` type (Task 3)
- Produces: `listSkillsGuidance(): Promise<SkillGuidance[]>` from `src/lib/skillsGuidance.ts`

- [ ] **Step 1: Write the skills guidance data layer**

```ts
// src/lib/skillsGuidance.ts
import { getDb } from '@/db/client'
import { skillsGuidance, type SkillGuidance } from '@/db/schema'

export async function listSkillsGuidance(): Promise<SkillGuidance[]> {
  const db = getDb()
  return db.select().from(skillsGuidance)
}
```

- [ ] **Step 2: Write the career page**

```tsx
// src/app/career/page.tsx
import { getFeedItemsByType } from '@/lib/feedItems'
import { FeedItemCard } from '@/app/components/FeedItemCard'
import { listSkillsGuidance } from '@/lib/skillsGuidance'

export default async function CareerPage() {
  const [jobs, orgSignals, funding, skills] = await Promise.all([
    getFeedItemsByType('job'),
    getFeedItemsByType('org_signal'),
    getFeedItemsByType('funding'),
    listSkillsGuidance(),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Career</h1>

      <section>
        <h2 className="font-medium mb-2">Job postings</h2>
        <div className="flex flex-col gap-3">
          {jobs.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {jobs.length === 0 && <p className="text-sm text-gray-500">No new postings yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Org &amp; sector radar</h2>
        <div className="flex flex-col gap-3">
          {orgSignals.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {orgSignals.length === 0 && <p className="text-sm text-gray-500">No new signals yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Funding &amp; program trends</h2>
        <div className="flex flex-col gap-3">
          {funding.map((item) => (
            <FeedItemCard key={item.id} item={item} path="/career" />
          ))}
          {funding.length === 0 && <p className="text-sm text-gray-500">No new trends yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Skills &amp; credentials guidance</h2>
        <div className="flex flex-col gap-3">
          {skills.map((s) => (
            <div key={s.id} className="border rounded p-4">
              <div className="font-medium">{s.skillOrCredential}</div>
              <p className="text-sm text-gray-600">{s.rationale}</p>
            </div>
          ))}
          {skills.length === 0 && <p className="text-sm text-gray-500">No guidance yet.</p>}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev -- --port 3100 &`, log in, visit `/career`, confirm all four sections render. Stop the dev server afterward.

- [ ] **Step 4: Commit**

```bash
git add src/lib/skillsGuidance.ts src/app/career/page.tsx
git commit -m "feat: add /career page with jobs, org radar, funding, and skills guidance"
```

---

### Task 11: Home overview page and navigation

**Files:**
- Create: `src/app/page.tsx` (overwrite the scaffold default)
- Create: `src/lib/pipelineRuns.ts`
- Modify: `src/app/layout.tsx` (add nav)
- Test: `src/lib/pipelineRuns.test.ts`

**Interfaces:**
- Consumes: `getFeedItemsByType` (Task 6), `listContactsByFollowUp` (Task 8), `pipelineRuns` table + `PipelineRun` type (Task 3)
- Produces: `getLatestRunPerType(): Promise<Record<FeedItem['type'], PipelineRun | undefined>>`, `isStale(run: PipelineRun | undefined, now: Date): boolean` from `src/lib/pipelineRuns.ts`, consumed by this task and reusable by any later staleness UI.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pipelineRuns.test.ts
import { describe, it, expect } from 'vitest'
import { isStale } from './pipelineRuns'
import type { PipelineRun } from '@/db/schema'

function run(overrides: Partial<PipelineRun>): PipelineRun {
  return {
    id: 1,
    startedAt: new Date('2026-01-01'),
    taskType: 'news',
    success: true,
    itemCount: 3,
    errorMessage: null,
    ...overrides,
  }
}

describe('isStale', () => {
  it('is stale when there is no run at all', () => {
    expect(isStale(undefined, new Date('2026-02-01'))).toBe(true)
  })

  it('is stale when the last run failed', () => {
    expect(isStale(run({ success: false, startedAt: new Date('2026-01-31') }), new Date('2026-02-01'))).toBe(true)
  })

  it('is stale when the last successful run is more than 8 days old', () => {
    expect(isStale(run({ startedAt: new Date('2026-01-01') }), new Date('2026-02-01'))).toBe(true)
  })

  it('is not stale when the last run succeeded within 8 days', () => {
    expect(isStale(run({ startedAt: new Date('2026-01-30') }), new Date('2026-02-01'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipelineRuns.test.ts`
Expected: FAIL — `isStale` not exported.

- [ ] **Step 3: Implement the pipeline runs data layer**

```ts
// src/lib/pipelineRuns.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipelineRuns.test.ts`
Expected: PASS

- [ ] **Step 5: Write the home page**

```tsx
// src/app/page.tsx
import { getFeedItemsByType } from '@/lib/feedItems'
import { listContactsByFollowUp } from '@/lib/contacts'
import { getLatestRunPerType, isStale } from '@/lib/pipelineRuns'

export default async function HomePage() {
  const types: Array<{ type: Parameters<typeof getFeedItemsByType>[0]; label: string }> = [
    { type: 'person_suggestion', label: 'People to reach out to' },
    { type: 'org_signal', label: 'Org signals' },
    { type: 'event', label: 'Events' },
    { type: 'news', label: 'News' },
    { type: 'job', label: 'Jobs' },
    { type: 'funding', label: 'Funding trends' },
  ]

  const [counts, contacts, runs] = await Promise.all([
    Promise.all(types.map(({ type }) => getFeedItemsByType(type))),
    listContactsByFollowUp(),
    getLatestRunPerType(),
  ])

  const now = new Date()
  const dueFollowUps = contacts.filter((c) => c.nextFollowUpAt && c.nextFollowUpAt <= now)
  const staleTypes = types.filter(({ type }) => isStale(runs[type], now))

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Overview</h1>

      {staleTypes.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded p-3 text-sm">
          These sections haven&apos;t updated recently: {staleTypes.map((t) => t.label).join(', ')}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {types.map(({ type, label }, i) => (
          <div key={type} className="border rounded p-4">
            <div className="text-2xl font-semibold">{counts[i].length}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="border rounded p-4">
        <div className="text-2xl font-semibold">{dueFollowUps.length}</div>
        <div className="text-sm text-gray-500">Follow-ups due</div>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Add navigation to the layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Career Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b p-4 flex gap-4 text-sm">
          <a href="/">Overview</a>
          <a href="/network">Network</a>
          <a href="/stay-current">Stay Current</a>
          <a href="/career">Career</a>
          <a href="/settings">Settings</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Manual verification**

Run: `npm run dev -- --port 3100 &`, log in, visit `/`, confirm counts render as `0` for every section and the staleness banner appears (no pipeline runs exist yet, so every type is stale — expected before Task 13 runs). Stop the dev server afterward.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/lib/pipelineRuns.ts src/lib/pipelineRuns.test.ts
git commit -m "feat: add home overview page with counts, follow-ups due, and staleness banner"
```

---

### Task 12: Research output validation/shaping logic

**Files:**
- Create: `src/lib/research/schemas.ts`
- Create: `src/lib/research/shape.ts`
- Test: `src/lib/research/shape.test.ts`

**Interfaces:**
- Consumes: `FeedItem['type']`, `NewFeedItem` (Task 3)
- Produces: `researchItemSchema: ZodSchema`, `shapeFeedItem(raw: unknown, type: FeedItem['type']): NewFeedItem | null` from `src/lib/research/shape.ts` — consumed by the cron route (Task 13). Returns `null` for input that fails validation rather than throwing, so the pipeline can skip bad items without failing the whole task.

- [ ] **Step 1: Write the Zod schema for a single research result**

```ts
// src/lib/research/schemas.ts
import { z } from 'zod'

export const researchItemSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(''),
  url: z.string().url(),
  sourceName: z.string().default(''),
  publishedAt: z.string().datetime().nullable().optional(),
  locationRelevance: z.enum(['Victoria', 'Lower Mainland', 'BC-wide', 'national']).default('BC-wide'),
})

export type ResearchItem = z.infer<typeof researchItemSchema>
```

- [ ] **Step 2: Write the failing test for shaping**

```ts
// src/lib/research/shape.test.ts
import { describe, it, expect } from 'vitest'
import { shapeFeedItem } from './shape'

describe('shapeFeedItem', () => {
  it('shapes a valid raw item into a NewFeedItem row', () => {
    const row = shapeFeedItem(
      {
        title: 'Settlement Workers of BC annual conference',
        summary: 'A gathering for settlement sector workers',
        url: 'https://example.org/swbc-conference',
        sourceName: 'SWBC',
        publishedAt: '2026-03-01T00:00:00.000Z',
        locationRelevance: 'BC-wide',
      },
      'event'
    )
    expect(row).not.toBeNull()
    expect(row!.type).toBe('event')
    expect(row!.title).toBe('Settlement Workers of BC annual conference')
    expect(row!.userStatus).toBe('new')
    expect(row!.discoveredAt).toBeInstanceOf(Date)
  })

  it('returns null for input missing a required field', () => {
    const row = shapeFeedItem({ summary: 'missing title and url' }, 'news')
    expect(row).toBeNull()
  })

  it('returns null for an invalid url', () => {
    const row = shapeFeedItem({ title: 'x', url: 'not-a-url' }, 'news')
    expect(row).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/research/shape.test.ts`
Expected: FAIL — `shapeFeedItem` not defined.

- [ ] **Step 4: Implement shaping**

```ts
// src/lib/research/shape.ts
import { researchItemSchema } from './schemas'
import type { NewFeedItem, FeedItem } from '@/db/schema'

export function shapeFeedItem(raw: unknown, type: FeedItem['type']): NewFeedItem | null {
  const parsed = researchItemSchema.safeParse(raw)
  if (!parsed.success) return null
  const item = parsed.data
  return {
    type,
    title: item.title,
    summary: item.summary,
    url: item.url,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    discoveredAt: new Date(),
    locationRelevance: item.locationRelevance,
    embedding: null,
    userStatus: 'new',
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/research/shape.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/research/schemas.ts src/lib/research/shape.ts src/lib/research/shape.test.ts
git commit -m "feat: add Zod schema and shaping logic for research pipeline output"
```

---

### Task 13: Cron research route

**Files:**
- Create: `src/app/api/cron/research/route.ts`
- Create: `src/lib/research/prompts.ts`
- Create: `vercel.json`
- Test: `src/lib/research/prompts.test.ts`

**Interfaces:**
- Consumes: `shapeFeedItem`, `researchItemSchema` (Task 12), `getProfile` (Task 5), `getDb()` + `feedItems`/`pipelineRuns` tables (Tasks 2–3)
- Produces: `buildResearchPrompt(profile: Profile, type: FeedItem['type'], recentTitles: string[]): string` from `src/lib/research/prompts.ts`, consumed by the cron route.

- [ ] **Step 1: Write the failing test for prompt building**

```ts
// src/lib/research/prompts.test.ts
import { describe, it, expect } from 'vitest'
import { buildResearchPrompt } from './prompts'
import type { Profile } from '@/db/schema'

const profile: Profile = {
  id: 1,
  location: 'Victoria, BC',
  openToLocations: 'Vancouver/Lower Mainland, BC',
  interestTags: 'community work, youth, newcomers and migrants to Canada',
  exclusionTags: 'clinical/mental health, child and family welfare, Indigenous-focused work',
  careerStage: 'early-career',
  currentRole: '',
  updatedAt: new Date(),
}

describe('buildResearchPrompt', () => {
  it('includes location, interests, exclusions, and the task type', () => {
    const prompt = buildResearchPrompt(profile, 'job', [])
    expect(prompt).toContain('Victoria, BC')
    expect(prompt).toContain('community work, youth, newcomers and migrants to Canada')
    expect(prompt).toContain('clinical/mental health')
    expect(prompt).toContain('job')
  })

  it('includes a dedup list when recent titles are given', () => {
    const prompt = buildResearchPrompt(profile, 'news', ['Already covered story'])
    expect(prompt).toContain('Already covered story')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/research/prompts.test.ts`
Expected: FAIL — `buildResearchPrompt` not defined.

- [ ] **Step 3: Implement prompt building**

```ts
// src/lib/research/prompts.ts
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
    'For each result, return title, a one-sentence summary, the source URL, the source name, the publish date if known, and location relevance (Victoria, Lower Mainland, BC-wide, or national).',
  ]
  if (recentTitles.length > 0) {
    lines.push(`Do not repeat these already-known items: ${recentTitles.join('; ')}`)
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/research/prompts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the cron route**

```ts
// src/app/api/cron/research/route.ts
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
```

- [ ] **Step 6: Configure the weekly cron schedule**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/research",
      "schedule": "0 6 * * 0"
    }
  ]
}
```

- [ ] **Step 7: Manual verification**

With `.env.local` populated (including a real `CRON_SECRET` and AI Gateway credentials) and a profile saved via `/settings`:
Run: `npm run dev -- --port 3100 &`
Run: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/research`
Expected: `{"ok":true}`, and rows appear in `feed_items` and `pipeline_runs` (check via `npx dotenv -e .env.local -- npx drizzle-kit studio` or a quick `select count(*) from feed_items;` through the Turso client). Stop the dev server afterward.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/cron/research/route.ts src/lib/research/prompts.ts src/lib/research/prompts.test.ts vercel.json
git commit -m "feat: add weekly cron research pipeline"
```

---

### Task 14: Deployment setup documentation

**Files:**
- Create: `README.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Write the README**

```markdown
# Career & Network Dashboard

Single-user dashboard for tracking networking, sector news, and career
opportunities in the BC community/settlement sector. See
`docs/superpowers/specs/2026-08-23-career-dashboard-design.md` for the full
design.

## Local setup

1. `npm install`
2. `vercel link` (link this directory to a Vercel project)
3. `vercel integration add turso` (provisions the Turso database and injects
   `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`)
4. `vercel env pull .env.local --yes`
5. Add the remaining local-only secrets to `.env.local`:
   - `DASHBOARD_PASSWORD` — the shared login password
   - `SESSION_SECRET` — any random string, used to sign the session cookie
   - `CRON_SECRET` — any random string, must match the value set in the
     Vercel project's Cron settings so `/api/cron/research` rejects
     unauthorized calls
   - `AI_GATEWAY_API_KEY` — from the Vercel AI Gateway
6. `npx dotenv -e .env.local -- npx drizzle-kit push` to create the schema in
   Turso.
7. `npm run dev`

## Deploying

`vercel --prod`. Set the same env vars in the Vercel project's Environment
Variables settings (Production) — `vercel env pull` only pulls, it doesn't
push. The weekly cron job is configured in `vercel.json` and runs
automatically once deployed.

## Running tests

`npx vitest run`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup and deployment README"
```

---

## Self-Review Notes

- **Spec coverage:** Auth (Task 4), profile/settings (Task 5), feed items + save/dismiss (Task 6), network suggestions/events (Task 7), CRM (Task 8), stay-current (Task 9), career incl. skills guidance (Task 10), home overview + staleness banner (Task 11), research validation (Task 12), cron pipeline + dedup + error logging (Task 13), deployment docs (Task 14). All five data-model tables and all five pages from the spec are covered.
- **Placeholder scan:** No TBD/TODO markers; every step has runnable code or an exact command.
- **Type consistency:** `FeedItem['type']` and `FeedItem['userStatus']` string-literal unions are used consistently from Task 3 onward; `getFeedItemsByType(type, status)` signature (Task 6) matches all call sites in Tasks 7, 9, 10; `shapeFeedItem(raw, type): NewFeedItem | null` (Task 12) matches its usage in Task 13.
