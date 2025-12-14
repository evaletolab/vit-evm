/**
 * Tests for core.safe.4337 — Safe4337Pack wrapper for MVP flow
 */
import { describe, it, expect } from 'vitest';
import {
  ZCHF_OPTIMISM,
  ZCHF_DECIMALS,
  buildErc20Transfer,
  buildErc20Approve,
  buildZchfTransfer,
  buildSwapToZchf,
  parseZchf,
  formatZchf,
} from '../src/core.safe.4337';
import { ethers } from 'ethers';

describe('core.safe.4337', () => {
  describe('constants', () => {
    it('should export ZCHF_OPTIMISM address', () => {
      expect(ZCHF_OPTIMISM).toBe('0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553');
    });

    it('should export ZCHF_DECIMALS as 18', () => {
      expect(ZCHF_DECIMALS).toBe(18);
    });
  });

  describe('buildErc20Transfer', () => {
    it('should encode ERC-20 transfer correctly', () => {
      const to = '0x1234567890123456789012345678901234567890';
      const amount = 1000000000000000000n; // 1 token

      const data = buildErc20Transfer(to, amount);

      // Verify it starts with transfer selector
      const iface = new ethers.Interface(['function transfer(address to, uint256 value)']);
      const selector = iface.getFunction('transfer')!.selector;
      expect(data.startsWith(selector)).toBe(true);

      // Decode and verify
      const decoded = iface.decodeFunctionData('transfer', data);
      expect(decoded[0].toLowerCase()).toBe(to.toLowerCase());
      expect(decoded[1]).toBe(amount);
    });
  });

  describe('buildErc20Approve', () => {
    it('should encode ERC-20 approve correctly', () => {
      const spender = '0xabcdef0123456789abcdef0123456789abcdef01';
      const amount = 5000000000000000000n; // 5 tokens

      const data = buildErc20Approve(spender, amount);

      const iface = new ethers.Interface(['function approve(address spender, uint256 value)']);
      const decoded = iface.decodeFunctionData('approve', data);
      expect(decoded[0].toLowerCase()).toBe(spender.toLowerCase());
      expect(decoded[1]).toBe(amount);
    });
  });

  describe('buildZchfTransfer', () => {
    it('should build ZCHF transfer transaction with default token', () => {
      const to = '0x1111111111111111111111111111111111111111';
      const amount = parseZchf('100'); // 100 ZCHF

      const tx = buildZchfTransfer({ to, amount });

      expect(tx.to).toBe(ZCHF_OPTIMISM);
      expect(tx.value).toBe(0n);
      expect(tx.data).toBeDefined();
      expect(tx.data.length).toBeGreaterThan(10);
    });

    it('should use custom token address when provided', () => {
      const customToken = '0x2222222222222222222222222222222222222222';
      const tx = buildZchfTransfer({
        to: '0x1111111111111111111111111111111111111111',
        amount: 1000n,
        token: customToken,
      });

      expect(tx.to).toBe(customToken);
    });
  });

  describe('buildSwapToZchf', () => {
    it('should build approve + swap transaction batch', () => {
      const params = {
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 router
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        amountIn: 1000000n, // 1 USDC (6 decimals)
        amountOutMin: 900000000000000000n, // 0.9 ZCHF min
        recipient: '0x3333333333333333333333333333333333333333',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
      };

      const txs = buildSwapToZchf(params);

      expect(txs).toHaveLength(2);

      // First tx: approve
      expect(txs[0].to).toBe(params.tokenIn);
      expect(txs[0].value).toBe(0n);

      // Second tx: swap
      expect(txs[1].to).toBe(params.router);
      expect(txs[1].value).toBe(0n);

      // Verify swap calldata contains path with ZCHF
      const swapIface = new ethers.Interface([
        'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
      ]);
      const decoded = swapIface.decodeFunctionData('swapExactTokensForTokens', txs[1].data);
      expect(decoded[0]).toBe(params.amountIn);
      expect(decoded[1]).toBe(params.amountOutMin);
      expect(decoded[2]).toContain(ZCHF_OPTIMISM); // path includes ZCHF
      expect(decoded[3].toLowerCase()).toBe(params.recipient.toLowerCase());
    });

    it('should use custom ZCHF address when provided', () => {
      const customZchf = '0x4444444444444444444444444444444444444444';
      const params = {
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: 1000000n,
        amountOutMin: 900000000000000000n,
        recipient: '0x3333333333333333333333333333333333333333',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
        zchfAddress: customZchf,
      };

      const txs = buildSwapToZchf(params);

      const swapIface = new ethers.Interface([
        'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
      ]);
      const decoded = swapIface.decodeFunctionData('swapExactTokensForTokens', txs[1].data);
      expect(decoded[2]).toContain(customZchf);
    });
  });

  describe('parseZchf / formatZchf', () => {
    it('should parse ZCHF amount correctly', () => {
      expect(parseZchf('1')).toBe(1000000000000000000n);
      expect(parseZchf('100')).toBe(100000000000000000000n);
      expect(parseZchf('0.5')).toBe(500000000000000000n);
      expect(parseZchf(10)).toBe(10000000000000000000n);
    });

    it('should format ZCHF amount correctly', () => {
      expect(formatZchf(1000000000000000000n)).toBe('1.0');
      expect(formatZchf(100000000000000000000n)).toBe('100.0');
      expect(formatZchf(500000000000000000n)).toBe('0.5');
    });

    it('should round-trip parse and format', () => {
      const original = '123.456';
      const parsed = parseZchf(original);
      const formatted = formatZchf(parsed);
      expect(formatted).toBe('123.456');
    });
  });

  describe('exports smoke test', () => {
    it('should export initSafe4337Pack function', async () => {
      const { initSafe4337Pack } = await import('../src/core.safe.4337');
      expect(typeof initSafe4337Pack).toBe('function');
    });

    it('should export createSafeWithPasskey function', async () => {
      const { createSafeWithPasskey } = await import('../src/core.safe.4337');
      expect(typeof createSafeWithPasskey).toBe('function');
    });

    it('should export executeVia4337 function', async () => {
      const { executeVia4337 } = await import('../src/core.safe.4337');
      expect(typeof executeVia4337).toBe('function');
    });

    it('should export sendZchfVia4337 function', async () => {
      const { sendZchfVia4337 } = await import('../src/core.safe.4337');
      expect(typeof sendZchfVia4337).toBe('function');
    });

    it('should export swapToZchfVia4337 function', async () => {
      const { swapToZchfVia4337 } = await import('../src/core.safe.4337');
      expect(typeof swapToZchfVia4337).toBe('function');
    });
  });
});

