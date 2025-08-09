import { describe, it, expect } from 'vitest'
import { batchModuleCalls } from '../src/core.safe.modules'

describe('core.safe.modules', () => {
  it('batchModuleCalls maps to minimal txs array', () => {
    const calls = [
      { to: '0x1', data: '0x', value: 0n },
      { to: '0x2', data: '0xdeadbeef' },
    ]
    const txs = batchModuleCalls(calls)
    expect(txs.length).toBe(2)
    expect(txs[0]).toEqual({ to: '0x1', data: '0x', value: 0n })
    expect(txs[1]).toEqual({ to: '0x2', data: '0xdeadbeef', value: 0n })
  })
})


