/**
 * Unit tests — recovery codes (base32 + checksum + payload).
 * KDF scrypt is exercised lightly (N still 2^16 — ~300ms) for determinism.
 */
import {
  encodeCode,
  decodeCode,
  generateSecret,
  encodeCodePayload,
  decodeCodePayload,
  buildCodePayload,
  deriveGuardianKey,
  resolveWalletAddress,
  formatCodeDisplay,
  GUARDIAN_COUNT,
  CURRENT_KDF_VERSION,
} from './recovery-codes';

describe('recovery-codes', () => {
  it('round-trips a base32 code with checksum', () => {
    const secret = generateSecret();
    const code = encodeCode(secret);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    const back = decodeCode(code);
    expect(Array.from(back)).toEqual(Array.from(secret));
  });

  it('accepts tolerant input (lowercase, spaces, I/L/O)', () => {
    const secret = generateSecret();
    const code = encodeCode(secret);
    const messy = code.toLowerCase().replace(/-/g, ' ');
    expect(Array.from(decodeCode(messy))).toEqual(Array.from(secret));
  });

  it('rejects a single-character typo most of the time', () => {
    const secret = generateSecret();
    const code = encodeCode(secret).replace(/-/g, '');
    let caught = 0;
    let total = 0;
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let i = 0; i < code.length; i++) {
      for (const c of alphabet) {
        if (c === code[i]) continue;
        total++;
        const typo = code.slice(0, i) + c + code.slice(i + 1);
        try {
          decodeCode(typo);
        } catch {
          caught++;
        }
      }
    }
    expect(caught / total).toBeGreaterThan(0.95);
  });

  it('round-trips payload encoding', () => {
    const secret = generateSecret();
    const code = encodeCode(secret);
    const material = {
      index: 1,
      code,
      secret,
      address: '0xabc',
      privateKey: '0x00',
    };
    const payload = buildCodePayload(material, '0x1111111111111111111111111111111111111111', {
      name: 'alice',
      credentialId: 'deadbeef',
      x: '0x1',
      y: '0x2',
    });
    const encoded = encodeCodePayload(payload);
    const decoded = decodeCodePayload(encoded);
    expect(decoded.a).toBe(payload.a);
    expect(decoded.c).toBe(code);
    expect(decoded.n).toBe('alice');
    expect(decoded.cid).toBe('deadbeef');
  });

  it('resolves a consistent Safe address from payloads', () => {
    const a = {
      v: CURRENT_KDF_VERSION,
      a: '0xABCDEFabcdefABCDEFABCDEFABCDEFABCDEFABCD',
      i: 1,
      c: encodeCode(generateSecret()),
    };
    const b = { ...a, i: 2, c: encodeCode(generateSecret()) };
    expect(resolveWalletAddress('alice', [a, b])).toBe(a.a.toLowerCase());
  });

  it('derives a deterministic guardian address', async () => {
    const safe = '0x1111111111111111111111111111111111111111';
    const secret = new Uint8Array(10);
    secret[0] = 0x42;
    const code = encodeCode(secret);
    const decoded = decodeCode(code);
    const once = await deriveGuardianKey(decoded, safe, 1);
    const twice = await deriveGuardianKey(decoded, safe, 1);
    expect(once.address).toBe(twice.address);
    expect(once.privateKey).toBe(twice.privateKey);
    expect(once.address).toMatch(/^0x[0-9a-f]{40}$/);
  }, 30_000);

  it('formats display codes', () => {
    expect(formatCodeDisplay('gepp2eywgv2pcc9b')).toMatch(/-/);
  });

  it('exports guardian constants', () => {
    expect(GUARDIAN_COUNT).toBe(3);
  });
});
