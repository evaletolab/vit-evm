/**
 * Tests for core.safe.paymaster — PaymasterProvider interface
 */
import { describe, it, expect } from 'vitest';
import {
  PimlicoProvider,
  StackupProvider,
  createPaymasterProvider,
  sponsorUserOp,
  configurePaymaster,
  type PaymasterProviderConfig,
  type UserOperation,
} from '../src/core.safe.paymaster';

describe('core.safe.paymaster', () => {
  const mockConfig: PaymasterProviderConfig = {
    endpoint: 'https://api.pimlico.io/v2/1/rpc',
    apiKey: 'test-api-key',
    chainId: 1,
  };

  const mockUserOp: UserOperation = {
    sender: '0x1234567890123456789012345678901234567890',
    callData: '0xabcdef',
    nonce: '0x1',
  };

  describe('PimlicoProvider', () => {
    it('should be instantiable with config', () => {
      const provider = new PimlicoProvider(mockConfig);
      expect(provider.name).toBe('pimlico');
    });

    it('should support token paymaster', () => {
      const provider = new PimlicoProvider(mockConfig);
      expect(provider.supportsTokenPaymaster()).toBe(true);
    });

    it('should have sponsorUserOp method', () => {
      const provider = new PimlicoProvider(mockConfig);
      expect(typeof provider.sponsorUserOp).toBe('function');
    });

    it('should have getTokenPaymasterData method', () => {
      const provider = new PimlicoProvider(mockConfig);
      expect(typeof provider.getTokenPaymasterData).toBe('function');
    });
  });

  describe('StackupProvider', () => {
    it('should be instantiable with config', () => {
      const provider = new StackupProvider(mockConfig);
      expect(provider.name).toBe('stackup');
    });

    it('should not support token paymaster (stub)', () => {
      const provider = new StackupProvider(mockConfig);
      expect(provider.supportsTokenPaymaster()).toBe(false);
    });

    it('should throw on getTokenPaymasterData (not implemented)', async () => {
      const provider = new StackupProvider(mockConfig);
      await expect(
        provider.getTokenPaymasterData({
          userOp: mockUserOp,
          token: '0xtoken',
        }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('createPaymasterProvider', () => {
    it('should create PimlicoProvider for "pimlico" vendor', () => {
      const provider = createPaymasterProvider('pimlico', mockConfig);
      expect(provider.name).toBe('pimlico');
      expect(provider).toBeInstanceOf(PimlicoProvider);
    });

    it('should create StackupProvider for "stackup" vendor', () => {
      const provider = createPaymasterProvider('stackup', mockConfig);
      expect(provider.name).toBe('stackup');
      expect(provider).toBeInstanceOf(StackupProvider);
    });

    it('should throw for unknown vendor', () => {
      expect(() => createPaymasterProvider('unknown' as any, mockConfig)).toThrow(
        'Unknown paymaster vendor',
      );
    });
  });

  describe('legacy sponsorUserOp function', () => {
    it('should be exported for backwards compatibility', () => {
      expect(typeof sponsorUserOp).toBe('function');
    });

    // Note: actual network calls are tested in integration tests
    // Here we just verify the function signature works
    it('should accept SponsorUserOpParams', async () => {
      // This will fail with network error (expected, no mock server)
      await expect(
        sponsorUserOp({
          endpoint: 'http://localhost:9999/nonexistent',
          apiKey: 'test',
          chainId: 1,
          userOp: mockUserOp,
        }),
      ).rejects.toThrow();
    });
  });

  describe('legacy configurePaymaster function', () => {
    it('should return ModuleCall with placeholder data', () => {
      const result = configurePaymaster({
        safeAddress: '0x1111111111111111111111111111111111111111',
        paymasterAddress: '0x2222222222222222222222222222222222222222',
      });

      expect(result.to).toBe('0x2222222222222222222222222222222222222222');
      expect(result.data).toBe('0x');
      expect(result.value).toBe(0n);
    });
  });

  describe('PaymasterProvider interface compliance', () => {
    const providers = [
      { name: 'pimlico', create: () => new PimlicoProvider(mockConfig) },
      { name: 'stackup', create: () => new StackupProvider(mockConfig) },
    ];

    providers.forEach(({ name, create }) => {
      describe(`${name} provider`, () => {
        it('should have "name" property', () => {
          const provider = create();
          expect(typeof provider.name).toBe('string');
          expect(provider.name.length).toBeGreaterThan(0);
        });

        it('should have sponsorUserOp method', () => {
          const provider = create();
          expect(typeof provider.sponsorUserOp).toBe('function');
        });

        it('should have getTokenPaymasterData method', () => {
          const provider = create();
          expect(typeof provider.getTokenPaymasterData).toBe('function');
        });

        it('should have supportsTokenPaymaster method', () => {
          const provider = create();
          expect(typeof provider.supportsTokenPaymaster).toBe('function');
          expect(typeof provider.supportsTokenPaymaster()).toBe('boolean');
        });
      });
    });
  });
});

