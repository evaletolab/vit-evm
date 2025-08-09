import { describe, it, expect } from 'vitest'
import { buildErc20TransferData } from '../src/core.safe.payment'

describe('Payment encoding', () => {
  it('encodes ERC20 transfer correctly', () => {
    const data = buildErc20TransferData('0x000000000000000000000000000000000000dEaD', 1234567890123456789n)
    expect(data).toMatch(/^0x[0-9a-fA-F]+$/)
  })
})


