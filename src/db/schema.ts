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
