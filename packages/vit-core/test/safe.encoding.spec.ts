import { describe, it, expect } from 'vitest';
import { linkPasskeyToSafe, executeWithPasskey } from '../src/core.safe.webauthn';
import { WebAuthnModuleConfig } from '../src/core.types';

describe('WebAuthn ABI encoding', () => {
  const cfg: WebAuthnModuleConfig = {
    chainId: 10,
    safeAddress: '0x000000000000000000000000000000000000dEaD',
    moduleAddress: '0x000000000000000000000000000000000000BEEF',
  };

  it('encodes linkPasskeyToSafe', () => {
    const credId = 'AAECAwQ'; // base64url
    const pub = '0x04' + '11'.repeat(64); // dummy 65 bytes
    const call = linkPasskeyToSafe({ config: cfg, credentialId: credId, publicKeyUncompressed: pub });
    expect(call.to).to.equal(cfg.moduleAddress);
    expect(call.data).to.match(/^0x[0-9a-fA-F]+$/);
  });

  it('encodes executeWithPasskey', () => {
    const sig = {
      credentialId: 'AAECAwQ',
      clientDataJSON: 'AQIDBA',
      authenticatorData: 'Zm9v',
      signature: 'YmFy',
      userHandle: null,
    };
    const call = executeWithPasskey({
      config: cfg,
      signature: sig,
      target: '0x0000000000000000000000000000000000000001',
      data: '0x',
      value: 0n,
    });
    expect(call.to).to.equal(cfg.moduleAddress);
    expect(call.data).to.match(/^0x[0-9a-fA-F]+$/);
  });
});


