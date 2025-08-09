import { describe, it, expect } from 'vitest'
import { linkPasskeyToSafe, executeWithPasskey } from '../src/core.safe.webauthn'

describe('core.safe.webauthn', () => {
  it('linkPasskeyToSafe encodes calldata', () => {
    const call = linkPasskeyToSafe({
      config: { chainId: 10, safeAddress: '0x0', moduleAddress: '0xBEEF' },
      credentialId: 'AAECAwQ',
      publicKeyUncompressed: '0x04' + '11'.repeat(64)
    })
    expect(call.data.startsWith('0x')).toBe(true)
  })

  it('executeWithPasskey encodes calldata', () => {
    const call = executeWithPasskey({
      config: { chainId: 10, safeAddress: '0x0', moduleAddress: '0xBEEF' },
      signature: {
        credentialId: 'AAECAwQ',
        clientDataJSON: 'AQIDBA',
        authenticatorData: 'Zm9v',
        signature: 'YmFy',
        userHandle: null
      },
      target: '0x0000000000000000000000000000000000000001',
      data: '0x',
      value: 0n
    })
    expect(call.data.startsWith('0x')).toBe(true)
  })
})


