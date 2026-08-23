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
