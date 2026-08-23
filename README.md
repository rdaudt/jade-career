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
