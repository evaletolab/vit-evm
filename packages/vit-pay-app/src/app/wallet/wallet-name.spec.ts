import {
  isValidWalletName,
  normalizeWalletName,
  validateWalletName,
  walletHandle,
  RESERVED_WALLET_NAMES,
} from './wallet-name';

describe('wallet-name', () => {
  it('normalizes and validates names', () => {
    expect(normalizeWalletName('  Alice ')).toBe('alice');
    expect(isValidWalletName('alice')).toBe(true);
    expect(isValidWalletName('al')).toBe(false);
    expect(isValidWalletName('Alice')).toBe(true);
    expect(isValidWalletName('buy')).toBe(false);
    expect(isValidWalletName('-bad')).toBe(false);
    expect(validateWalletName('bob-42')).toBe('bob-42');
    expect(walletHandle('Bob')).toBe('bob@vit.swiss');
  });

  it('reserves flat routes', () => {
    expect(RESERVED_WALLET_NAMES.has('wallet')).toBe(true);
    expect(RESERVED_WALLET_NAMES.has('vault')).toBe(true);
    expect(() => validateWalletName('recovery')).toThrowError(/reserve/i);
  });
});
