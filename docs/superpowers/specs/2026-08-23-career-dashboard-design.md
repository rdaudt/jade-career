# Career & Network Dashboard — Design Spec

**Date:** 2026-08-23
**Status:** Approved (pending user review of this document)

## Purpose

A personal, single-user web dashboard to help an early-career social worker
grow her professional network, stay current on developments in her niche, and
surface career opportunities — all curated automatically and grounded in her
specific profile, rather than generic feeds.

## User Profile (initial)

- **Field:** Social work, bachelor's degree, early-career professional.
- **Focus areas:** Community work; working with youth; working with newcomers
  and migrants to Canada.
- **Explicit exclusions:** Clinical/mental health work, child & family welfare,
  Indigenous-focused work.
- **Location:** Victoria, BC. Open to opportunities in Vancouver/Lower
  Mainland, BC.
- **Primary user:** She uses the dashboard herself, day to day.

This profile is stored as data (not hardcoded) and is user-editable via
`/settings`, since it's the steering input for all research.

## Goals

1. **Network:** Discover people/orgs worth reaching out to, surface relevant
   events & communities, and help her keep up outreach habits via a
   lightweight CRM with follow-up reminders.
2. **Stay current:** A curated news feed relevant to her focus areas and
   location, refreshed on a schedule (not live/on-demand).
3. **Career opportunities:** Tailored job postings, org/sector radar (which
   organizations are growing/hiring/launching programs), funding & program
   trends, and skills/credentials guidance.

## Non-Goals

- Not a multi-user product — built and scoped for one person.
- Not a real-time feed — content refreshes on a weekly cron schedule, not on
  page load.
- Not attempting deep automated quality-testing of AI-generated research
  content — that's inherently non-deterministic; manual spot-checking is the
  realistic bar (see Testing).
- No LinkedIn scraping/API integration — outreach targets are AI-researched
  suggestions (via web search), not pulled live from LinkedIn's API.

## Architecture

- **Framework:** Next.js (App Router), deployed on Vercel.
- **Data store:** Turso (libSQL), provisioned via the Vercel Marketplace
  integration (`vercel integration add turso`), env vars auto-injected.
- **Auth:** Simple password gate — a single shared password checked in
  middleware, session via cookie. No user-account system.
- **Scheduled research:** Vercel Cron (weekly) triggers a research job.
- **AI layer:** AI SDK via Vercel AI Gateway, using web search, to research
  each `feed_items` type. Output is structured (schema-validated) before
  being written to Turso.
- **Dashboard:** Reads only from Turso — no live AI calls on page load, so
  pages load fast and consistently.

### Data flow

```
Vercel Cron (weekly)
  → Research job (AI SDK + web search, one task per feed_items type,
     grounded in profile + recent-items dedup list)
  → Structured output validated → written to Turso

Dashboard (Next.js, password-gated)
  → Reads Turso → renders Network / Stay Current / Career sections

User actions (save contact, log interaction, snooze follow-up,
  dismiss/save feed item, edit profile)
  → Written back to Turso directly (no cron involved)
```

## Data Model

### `profile` (single row)

| field | notes |
|---|---|
| location | city/province |
| open_to_locations | e.g. Vancouver/Lower Mainland |
| interest_tags | free text/tags — community work, youth, newcomers/migrants |
| exclusion_tags | clinical/mental health, child/family welfare, Indigenous-focused |
| career_stage | e.g. early-career |
| current_role | optional |

### `contacts` (lightweight CRM)

| field | notes |
|---|---|
| name, org, role | |
| source | how/why suggested |
| status | suggested → contacted → responded → connected → dormant |
| notes | append-only interaction log |
| last_contact_at | |
| next_follow_up_at | drives reminders |
| linkedin_url, email | optional |

### `feed_items` (unified table for discovered content)

| field | notes |
|---|---|
| type | news \| event \| org_signal \| funding \| job \| person_suggestion |
| title, summary, url, source_name | |
| published_at, discovered_at | |
| location_relevance | Victoria \| Lower Mainland \| BC-wide \| national |
| embedding | F32_BLOB, optional, for future similarity search (native Turso vector search, no extension needed) |
| user_status | new → saved → dismissed → acted_on |

One table across all discovered-content types keeps the research pipeline and
dashboard queries uniform — filtering by `type` + `user_status` covers every
section without schema duplication. `contacts` stays a separate table since
it has a genuinely different lifecycle (an ongoing CRM record, not a
discovered/dismissed item).

### `skills_guidance` (small, infrequently updated)

| field | notes |
|---|---|
| skill_or_credential | |
| rationale | why it matters |
| related_job_ids | optional links into `feed_items` (type=job) |

### `pipeline_runs` (operational log)

| field | notes |
|---|---|
| started_at | |
| task_type | maps to a feed_items type |
| success | bool |
| item_count | items inserted this run |
| error_message | optional |

## Pages

- **`/login`** — password gate, sets session cookie on success.
- **`/`** — overview: counts of new items per section, follow-ups due soon.
- **`/network`** — suggested people/orgs (save/dismiss), events & communities
  (save/dismiss, location-filterable), CRM view of tracked contacts sorted by
  `next_follow_up_at` with log-interaction and snooze actions.
- **`/stay-current`** — news feed (type=news), reverse-chronological,
  save/dismiss, filterable.
- **`/career`** — job postings (type=job, save/dismiss, apply links), org/sector
  radar (type=org_signal), funding & program trends (type=funding),
  skills/credentials guidance (from `skills_guidance`).
- **`/settings`** — edit profile fields that steer the research pipeline.

Note: funding/program trends were placed under `/career` (opportunity signal)
rather than `/stay-current` (sector awareness) — a fuzzy boundary either way,
easy to relocate later if it doesn't feel right in use.

## Research Pipeline Detail

- Weekly Vercel Cron job runs one research task per `feed_items` type.
- Each task is an AI SDK call (via AI Gateway) with web search, prompted with
  the current `profile` row plus a short "already have these" list (recent
  titles/URLs) to reduce duplicate suggestions.
- Output is structured/schema-validated before insert; items are deduped by
  URL.
- The `job` task's prompt is biased toward known channels relevant to the
  BC settlement/community sector (e.g. Charity Village, specific org career
  pages) rather than relying on generic web search alone, since general
  search is weaker at surfacing live job postings.

## Error Handling

- A failing research task is logged to `pipeline_runs` and skipped; other
  tasks in the same run still complete — one bad task doesn't block the rest
  of the week's update.
- The dashboard surfaces a small banner when a section's feed didn't update
  in the most recent run (read from `pipeline_runs`), so staleness is visible
  rather than silent.
- The password gate has no lockout/rate-limiting logic — out of scope at this
  scale (single user, low-value target).

## Testing

- Unit tests for the structured-output → DB row validation/shaping logic,
  using fixture data (not live AI calls).
- Manual end-to-end verification of the cron pipeline against the real DB
  before relying on it.
- Automated testing of AI-generated content *quality* is not practical
  (non-deterministic); spot-checking is the realistic bar.
- Dashboard component/page tests are optional and light-touch, given single-
  user scope — not a priority investment.

## Open Items / Future Ideas (explicitly out of scope for v1)

- Embedding-based "similar to what she's saved" recommendations (schema
  supports it via `feed_items.embedding`, but not built in v1).
- Email/digest notifications (currently dashboard-only; she visits the app
  directly).
- Any move away from the single shared-password auth model.
