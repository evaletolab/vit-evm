import {
  ZCHF_DECIMALS,
  formatZchfAmount,
  isValidEvmAddress,
  mapPaymasterError,
  parseZchfAmount,
  shortAddress,
} from './wallet.utils';

describe('wallet.utils', () => {
  describe('parseZchfAmount', () => {
    it('converts a whole number to 18-decimal bigint', () => {
      expect(parseZchfAmount('1')).toBe(10n ** BigInt(ZCHF_DECIMALS));
    });

    it('handles decimals correctly', () => {
      expect(parseZchfAmount('0.01')).toBe(10n ** 16n);
    });

    it('rejects an empty string', () => {
      expect(() => parseZchfAmount('')).toThrowError(/empty/i);
    });

    it('rejects negative amounts', () => {
      expect(() => parseZchfAmount('-1')).toThrowError(/positive/i);
    });

    it('rejects non-numeric input', () => {
      expect(() => parseZchfAmount('abc')).toThrowError(/format/i);
    });
  });

  describe('formatZchfAmount', () => {
    it('round-trips parseZchfAmount', () => {
      const raw = parseZchfAmount('123.456');
      expect(formatZchfAmount(raw)).toBe('123.456');
    });
  });

  describe('isValidEvmAddress', () => {
    it('accepts a valid address', () => {
      expect(
        isValidEvmAddress('0x0000000000000000000000000000000000000001'),
      ).toBe(true);
    });

    it('rejects garbage', () => {
      expect(isValidEvmAddress('not-an-address')).toBe(false);
    });
  });

  describe('shortAddress', () => {
    it('shortens a valid address', () => {
      expect(
        shortAddress('0x1234567890abcdef1234567890abcdef12345678'),
      ).toBe('0x1234…5678');
    });

    it('passes through invalid input', () => {
      expect(shortAddress('not-an-address')).toBe('not-an-address');
    });
  });

  describe('mapPaymasterError', () => {
    it('maps policy errors', () => {
      expect(mapPaymasterError(new Error('no active policy found'))).toMatch(
        /policy/i,
      );
    });

    it('maps budget errors', () => {
      expect(mapPaymasterError(new Error('budget exceeded'))).toMatch(
        /budget/i,
      );
    });

    it('maps rejection errors', () => {
      expect(mapPaymasterError(new Error('request was denied'))).toMatch(
        /rejet/i,
      );
    });

    it('falls back to a generic message', () => {
      expect(mapPaymasterError(new Error('weird unknown error'))).toMatch(
        /sponsorisée/i,
      );
    });
  });
});
