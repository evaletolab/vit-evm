import {
  buildContactShareUrl,
  decodeContactCard,
  encodeContactCard,
  extractCardParam,
} from './contact-share';

describe('contact-share', () => {
  it('round-trips a full card', () => {
    const encoded = encodeContactCard({
      n: 'Léa Martin',
      a: '0x1111111111111111111111111111111111111111',
      t: '+41790000000',
      e: 'lea@example.ch',
      w: 'lea',
    });
    expect(decodeContactCard(encoded)).toEqual({
      n: 'Léa Martin',
      a: '0x1111111111111111111111111111111111111111',
      t: '+41790000000',
      e: 'lea@example.ch',
      w: 'lea',
    });
  });

  it('accepts a card without address', () => {
    const card = decodeContactCard(encodeContactCard({ n: 'Bob', t: ' +41780000000 ' }));
    expect(card?.n).toBe('Bob');
    expect(card?.a).toBeUndefined();
    expect(card?.t).toBe('+41780000000');
  });

  it('rejects a nameless or corrupted card', () => {
    expect(() => encodeContactCard({ n: '  ' })).toThrowError(/Nom requis/);
    expect(decodeContactCard('not-base64url!!')).toBeNull();
    expect(decodeContactCard(btoa('{"x":1}'))).toBeNull();
  });

  it('builds a share URL and reads the payload back', () => {
    const encoded = encodeContactCard({ n: 'Léa' });
    const url = buildContactShareUrl(encoded, true);
    expect(url).toContain('/#/contacts?add=');
    expect(extractCardParam(url)).toBe(encoded);
    expect(extractCardParam(encoded)).toBe(encoded);
    expect(extractCardParam('https://example.com/other')).toBeNull();
  });
});
