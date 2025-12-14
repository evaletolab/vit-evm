/**
 * Tests for core.safe.preflight — Anti-scam risk screening hook
 */
import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import {
  preflightRiskCheck,
  analyzeTransactionLocally,
  parseErc20Approve,
  parseSetApprovalForAll,
  isBlocked,
  isAllowed,
  RISKY_SELECTORS,
  type PreflightConfig,
  type TransactionToScreen,
} from '../src/core.safe.preflight';

describe('core.safe.preflight', () => {
  // Helper to build approve calldata
  function buildApprove(spender: string, amount: bigint): string {
    const iface = new ethers.Interface(['function approve(address spender, uint256 value)']);
    return iface.encodeFunctionData('approve', [spender, amount]);
  }

  // Helper to build setApprovalForAll calldata
  function buildSetApprovalForAll(operator: string, approved: boolean): string {
    const iface = new ethers.Interface(['function setApprovalForAll(address operator, bool approved)']);
    return iface.encodeFunctionData('setApprovalForAll', [operator, approved]);
  }

  describe('parseErc20Approve', () => {
    it('should parse valid approve calldata', () => {
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = 1000000000000000000n;
      const data = buildApprove(spender, amount);

      const result = parseErc20Approve(data);

      expect(result).not.toBeNull();
      expect(result!.spender.toLowerCase()).toBe(spender.toLowerCase());
      expect(result!.amount).toBe(amount);
    });

    it('should return null for non-approve calldata', () => {
      const data = '0x12345678abcdef';
      expect(parseErc20Approve(data)).toBeNull();
    });

    it('should return null for empty calldata', () => {
      expect(parseErc20Approve('0x')).toBeNull();
    });
  });

  describe('parseSetApprovalForAll', () => {
    it('should parse valid setApprovalForAll calldata', () => {
      const operator = '0xabcdef0123456789abcdef0123456789abcdef01';
      const data = buildSetApprovalForAll(operator, true);

      const result = parseSetApprovalForAll(data);

      expect(result).not.toBeNull();
      expect(result!.operator.toLowerCase()).toBe(operator.toLowerCase());
      expect(result!.approved).toBe(true);
    });

    it('should parse setApprovalForAll with approved=false', () => {
      const operator = '0xabcdef0123456789abcdef0123456789abcdef01';
      const data = buildSetApprovalForAll(operator, false);

      const result = parseSetApprovalForAll(data);

      expect(result).not.toBeNull();
      expect(result!.approved).toBe(false);
    });

    it('should return null for non-setApprovalForAll calldata', () => {
      expect(parseSetApprovalForAll('0x12345678')).toBeNull();
    });
  });

  describe('analyzeTransactionLocally', () => {
    const blockedAddress = '0xdeadbeef00000000000000000000000000000001';
    const config: PreflightConfig = {
      blocklist: new Set([blockedAddress.toLowerCase()]),
      allowlist: new Set(),
    };

    it('should flag recipient on blocklist as high severity', () => {
      const tx: TransactionToScreen = {
        to: blockedAddress,
        data: '0x',
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags).toHaveLength(1);
      expect(flags[0].type).toBe('recipient');
      expect(flags[0].severity).toBe('high');
    });

    it('should flag spender on blocklist in approve call', () => {
      const normalRecipient = '0x1111111111111111111111111111111111111111';
      const tx: TransactionToScreen = {
        to: normalRecipient,
        data: buildApprove(blockedAddress, 1000n),
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags.some((f) => f.type === 'spender' && f.severity === 'high')).toBe(true);
    });

    it('should flag unlimited approval as medium severity', () => {
      const normalSpender = '0x2222222222222222222222222222222222222222';
      const maxUint = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const tx: TransactionToScreen = {
        to: '0x1111111111111111111111111111111111111111',
        data: buildApprove(normalSpender, maxUint),
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags.some((f) => f.type === 'approval_amount' && f.severity === 'medium')).toBe(true);
    });

    it('should flag setApprovalForAll as medium severity warning', () => {
      const operator = '0x3333333333333333333333333333333333333333';
      const tx: TransactionToScreen = {
        to: '0x1111111111111111111111111111111111111111',
        data: buildSetApprovalForAll(operator, true),
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags.some((f) => f.type === 'operator' && f.severity === 'medium')).toBe(true);
    });

    it('should flag operator on blocklist as high severity', () => {
      const tx: TransactionToScreen = {
        to: '0x1111111111111111111111111111111111111111',
        data: buildSetApprovalForAll(blockedAddress, true),
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags.some((f) => f.type === 'operator' && f.severity === 'high')).toBe(true);
    });

    it('should return empty flags for safe transaction', () => {
      const tx: TransactionToScreen = {
        to: '0x1111111111111111111111111111111111111111',
        data: '0x', // simple ETH transfer
        value: 1000000000000000000n,
      };

      const flags = analyzeTransactionLocally(tx, config);

      expect(flags).toHaveLength(0);
    });

    it('should skip checks for allowlisted recipients', () => {
      const allowedAddress = '0x4444444444444444444444444444444444444444';
      const configWithAllowlist: PreflightConfig = {
        blocklist: new Set(),
        allowlist: new Set([allowedAddress.toLowerCase()]),
      };

      const tx: TransactionToScreen = {
        to: allowedAddress,
        data: buildApprove('0x5555555555555555555555555555555555555555', BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')),
        value: 0n,
      };

      const flags = analyzeTransactionLocally(tx, configWithAllowlist);

      // Should skip unlimited approval check because recipient is allowlisted
      expect(flags).toHaveLength(0);
    });
  });

  describe('preflightRiskCheck', () => {
    it('should return OK verdict for safe transactions', async () => {
      const transactions: TransactionToScreen[] = [
        { to: '0x1111111111111111111111111111111111111111', data: '0x', value: 1000n },
      ];

      const result = await preflightRiskCheck(transactions);

      expect(result.verdict).toBe('OK');
      expect(result.flags).toHaveLength(0);
      expect(result.summary).toBe('No risks detected');
    });

    it('should return BLOCK verdict when recipient is blocklisted', async () => {
      const blockedAddress = '0xbad0000000000000000000000000000000000001';
      const config: PreflightConfig = {
        blocklist: new Set([blockedAddress.toLowerCase()]),
      };
      const transactions: TransactionToScreen[] = [
        { to: blockedAddress, data: '0x', value: 1000n },
      ];

      const result = await preflightRiskCheck(transactions, config);

      expect(result.verdict).toBe('BLOCK');
      expect(result.flags.some((f) => f.severity === 'high')).toBe(true);
      expect(result.summary).toContain('blocked');
    });

    it('should return WARN verdict for unlimited approval', async () => {
      const maxUint = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const transactions: TransactionToScreen[] = [
        {
          to: '0x1111111111111111111111111111111111111111',
          data: buildApprove('0x2222222222222222222222222222222222222222', maxUint),
          value: 0n,
        },
      ];

      const result = await preflightRiskCheck(transactions);

      expect(result.verdict).toBe('WARN');
      expect(result.flags.some((f) => f.type === 'approval_amount')).toBe(true);
      expect(result.summary).toContain('Warning');
    });

    it('should handle multiple transactions and aggregate flags', async () => {
      const blockedAddress = '0xbad0000000000000000000000000000000000001';
      const config: PreflightConfig = {
        blocklist: new Set([blockedAddress.toLowerCase()]),
      };
      const transactions: TransactionToScreen[] = [
        { to: '0x1111111111111111111111111111111111111111', data: '0x', value: 1000n },
        { to: blockedAddress, data: '0x', value: 500n },
      ];

      const result = await preflightRiskCheck(transactions, config);

      expect(result.verdict).toBe('BLOCK');
      expect(result.flags).toHaveLength(1);
    });
  });

  describe('isBlocked / isAllowed', () => {
    it('should check blocklist case-insensitively', () => {
      const blocklist = new Set(['0xabc123']);
      expect(isBlocked('0xABC123', blocklist)).toBe(true);
      expect(isBlocked('0xabc123', blocklist)).toBe(true);
      expect(isBlocked('0xdef456', blocklist)).toBe(false);
    });

    it('should check allowlist case-insensitively', () => {
      const allowlist = new Set(['0xdef456']);
      expect(isAllowed('0xDEF456', allowlist)).toBe(true);
      expect(isAllowed('0xdef456', allowlist)).toBe(true);
      expect(isAllowed('0xabc123', allowlist)).toBe(false);
    });
  });

  describe('RISKY_SELECTORS', () => {
    it('should export correct ERC20_APPROVE selector', () => {
      const iface = new ethers.Interface(['function approve(address,uint256)']);
      const selector = iface.getFunction('approve')!.selector;
      expect(RISKY_SELECTORS.ERC20_APPROVE).toBe(selector);
    });

    it('should export correct SET_APPROVAL_FOR_ALL selector', () => {
      const iface = new ethers.Interface(['function setApprovalForAll(address,bool)']);
      const selector = iface.getFunction('setApprovalForAll')!.selector;
      expect(RISKY_SELECTORS.SET_APPROVAL_FOR_ALL).toBe(selector);
    });
  });
});

