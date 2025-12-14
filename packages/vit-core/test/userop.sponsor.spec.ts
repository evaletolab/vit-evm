import { describe, it, expect } from 'vitest'
import { sponsorUserOp } from '../src/core.safe.paymaster'

describe('sponsorUserOp', () => {
  it('handles network error quickly', async () => {
    const controller = new AbortController()
    controller.abort() // force immediate abort
    // @ts-ignore
    const fn = () => sponsorUserOp({ endpoint: 'http://127.0.0.1:9', chainId: 10, userOp: { sender: '0x0', callData: '0x' } })
    await expect(fn()).rejects.toBeTruthy()
  }, 1000)
})


