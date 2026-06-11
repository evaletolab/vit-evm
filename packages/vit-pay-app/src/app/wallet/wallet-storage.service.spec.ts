import { TestBed } from '@angular/core/testing';
import { WalletStorageService } from './wallet-storage.service';
import { StoredWallet } from './wallet.types';

const SAMPLE: StoredWallet = {
  version: 1,
  accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: 11155420,
  credentialId: 'abcd1234',
  webauthnPublicKey: {
    x: '0xdeadbeef',
    y: '0xfeedface',
  },
  owners: ['0x0000000000000000000000000000000000000001'],
  recoveryEnabled: false,
  zchfTokenAddress: '0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553',
};

describe('WalletStorageService', () => {
  let service: WalletStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletStorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(service.load()).toBeNull();
  });

  it('round-trips a valid wallet', () => {
    service.save(SAMPLE);
    const loaded = service.load();
    expect(loaded).toEqual(SAMPLE);
  });

  it('returns null when the blob is corrupt JSON', () => {
    localStorage.setItem('vit-wallet', '{not-json');
    expect(service.load()).toBeNull();
  });

  it('rejects a blob with the wrong shape', () => {
    localStorage.setItem('vit-wallet', JSON.stringify({ foo: 'bar' }));
    expect(service.load()).toBeNull();
  });

  it('rejects a blob with an unknown version', () => {
    const bad = { ...SAMPLE, version: 99 };
    localStorage.setItem('vit-wallet', JSON.stringify(bad));
    expect(service.load()).toBeNull();
  });

  it('clear() removes the wallet', () => {
    service.save(SAMPLE);
    expect(service.load()).not.toBeNull();
    service.clear();
    expect(service.load()).toBeNull();
  });
});
