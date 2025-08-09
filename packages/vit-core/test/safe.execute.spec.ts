import { describe, it, expect } from 'vitest'
import { executeViaSafe } from '../src/core.safe.execute'

describe('core.safe.execute', () => {
  it('exports executeViaSafe function', () => {
    expect(typeof executeViaSafe).toBe('function')
  })
})


