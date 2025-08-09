import { describe, it, expect } from 'vitest'
import { createSafeAccount, getSafeInfo } from '../src/core.safe.account'

describe('core.safe.account', () => {
  it('exports createSafeAccount and getSafeInfo', () => {
    expect(typeof createSafeAccount).toBe('function')
    expect(typeof getSafeInfo).toBe('function')
  })
})


