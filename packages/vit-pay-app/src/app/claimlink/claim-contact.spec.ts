import {
  encodeContactPayload,
  decodeContactPayload,
  contactMetaHash,
} from './claim-contact';
import {
  enqueuePendingClaim,
  listPendingClaims,
  removePendingClaim,
  clearPendingClaims,
} from './pending-claims';

describe('claim-contact payload', () => {
  it('encodes UTF-8 names (accents / emoji)', () => {
    const enc = encodeContactPayload({ n: 'Zoë 🎉', t: '+4179', e: 'z@ex.com' });
    const dec = decodeContactPayload(enc);
    expect(dec?.n).toBe('Zoë 🎉');
    expect(dec?.t).toBe('+4179');
    expect(dec?.e).toBe('z@ex.com');
  });

  it('rejects empty name', () => {
    expect(() => encodeContactPayload({ n: '  ' })).toThrow();
  });

  // The on-chain metaHash is computed on the encoded string, and the claim
  // recomputes it from the URL: a decode/re-encode round-trip must be stable,
  // otherwise the claim reverts with MetaMismatch.
  it('keeps metaHash stable across a decode → re-encode round-trip', () => {
    const enc = encodeContactPayload({ n: 'Zoë 🎉', t: ' +4179 ', e: 'z@ex.com' });
    const reencoded = encodeContactPayload(decodeContactPayload(enc)!);
    expect(reencoded).toBe(enc);
    expect(contactMetaHash(reencoded)).toBe(contactMetaHash(enc));
  });
});

describe('pending-claims queue', () => {
  beforeEach(() => {
    clearPendingClaims();
  });

  it('enqueues multiple claims and removes by id', () => {
    enqueuePendingClaim({
      id: '0x1',
      secret: '0xs',
      returnQuery: 'id=0x1&s=0xs',
    });
    enqueuePendingClaim({
      id: '0x2',
      secret: '0xt',
      returnQuery: 'id=0x2&s=0xt',
    });
    expect(listPendingClaims().length).toBe(2);
    removePendingClaim('0x1');
    expect(listPendingClaims().map((c) => c.id)).toEqual(['0x2']);
    clearPendingClaims();
    expect(listPendingClaims().length).toBe(0);
  });
});
