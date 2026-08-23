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
