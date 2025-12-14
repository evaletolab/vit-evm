/**
 * Module: core.safe.4337
 *
 * Role
 * - MVP "true path" wrapper for Safe + ERC-4337 (Account Abstraction) via Relay Kit v4.
 * - Provides the complete flow: create Safe → swap to ZCHF → send ZCHF payment (gasless).
 *
 * Workflow
 * - Initialize Safe4337Pack with passkey signer + bundler/paymaster URLs.
 * - Create a new Safe with [passkeyOwner, recoveryEOA] and threshold 1.
 * - Build transactions (ZCHF transfer, swap) and execute via UserOperation.
 *
 * Relations
 * - core.passkey: provides passkey credentials for signer creation
 * - core.safe.preflight: anti-scam check before signing (PRIORITY 2.5)
 * - core.safe.paymaster: paymaster provider abstraction (Pimlico first)
 * - defi.uniswap: swap encoding helpers
 */
import { ethers } from 'ethers';

// -----------------------------------------------------------------------------
// Constants — ZCHF on Optimism
// -----------------------------------------------------------------------------
export const ZCHF_OPTIMISM = '0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553';
export const ZCHF_DECIMALS = 18;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Configuration for Safe4337Pack initialization */
export interface Safe4337Config {
  /** RPC URL for the target chain (e.g., Optimism) */
  rpcUrl: string;
  /** Bundler URL (ERC-4337 bundler endpoint) */
  bundlerUrl: string;
  /** Paymaster URL (Pimlico or other sponsor endpoint) */
  paymasterUrl: string;
  /** Chain ID */
  chainId: number;
}

/** Params for creating a new Safe with passkey + recovery EOA */
export interface CreateSafeWithPasskeyParams {
  config: Safe4337Config;
  /** Passkey public key (uncompressed P-256, 0x04...) or address derived from passkey */
  passkeyOwner: string;
  /** Recovery EOA address */
  recoveryEOA: string;
  /** Threshold (default 1 for UX, 2 for security) */
  threshold?: number;
  /** Optional salt for deterministic address */
  saltNonce?: string;
}

/** Result of Safe creation */
export interface SafeCreationResult {
  safeAddress: string;
  owners: string[];
  threshold: number;
  userOpHash?: string;
}

/** Single transaction in a batch */
export interface SafeTransaction {
  to: string;
  data: string;
  value?: bigint;
}

/** ZCHF transfer params */
export interface ZchfTransferParams {
  to: string;
  /** Amount in ZCHF base units (18 decimals) */
  amount: bigint;
  /** Token address override (default ZCHF on Optimism) */
  token?: string;
}

/** Swap to ZCHF params (simple MVP swap) */
export interface SwapToZchfParams {
  /** Router address (e.g., Uniswap V2 compatible) */
  router: string;
  /** Token to swap from */
  tokenIn: string;
  /** Amount of tokenIn */
  amountIn: bigint;
  /** Minimum ZCHF to receive (slippage protection) */
  amountOutMin: bigint;
  /** Recipient (usually Safe address) */
  recipient: string;
  /** Deadline timestamp */
  deadline: bigint;
  /** ZCHF address override */
  zchfAddress?: string;
}

/** Execution result */
export interface ExecutionResult {
  userOpHash: string;
  success: boolean;
}

// -----------------------------------------------------------------------------
// Transaction Builders (pure functions, no SDK dependency)
// -----------------------------------------------------------------------------

/**
 * Build ERC-20 transfer calldata
 */
export function buildErc20Transfer(to: string, amount: bigint): string {
  const iface = new ethers.Interface(['function transfer(address to, uint256 value)']);
  return iface.encodeFunctionData('transfer', [to, amount]);
}

/**
 * Build ERC-20 approve calldata
 */
export function buildErc20Approve(spender: string, amount: bigint): string {
  const iface = new ethers.Interface(['function approve(address spender, uint256 value)']);
  return iface.encodeFunctionData('approve', [spender, amount]);
}

/**
 * Build ZCHF transfer transaction
 */
export function buildZchfTransfer(params: ZchfTransferParams): SafeTransaction {
  const token = params.token ?? ZCHF_OPTIMISM;
  const data = buildErc20Transfer(params.to, params.amount);
  return { to: token, data, value: 0n };
}

/**
 * Build swap-to-ZCHF transaction batch (approve + swap)
 * Uses Uniswap V2 style swapExactTokensForTokens
 */
export function buildSwapToZchf(params: SwapToZchfParams): SafeTransaction[] {
  const zchf = params.zchfAddress ?? ZCHF_OPTIMISM;
  const path = [params.tokenIn, zchf];

  // 1. Approve router to spend tokenIn
  const approveData = buildErc20Approve(params.router, params.amountIn);
  const approveTx: SafeTransaction = { to: params.tokenIn, data: approveData, value: 0n };

  // 2. Swap
  const swapIface = new ethers.Interface([
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[])',
  ]);
  const swapData = swapIface.encodeFunctionData('swapExactTokensForTokens', [
    params.amountIn,
    params.amountOutMin,
    path,
    params.recipient,
    params.deadline,
  ]);
  const swapTx: SafeTransaction = { to: params.router, data: swapData, value: 0n };

  return [approveTx, swapTx];
}

// -----------------------------------------------------------------------------
// Safe4337Pack Wrapper (requires @safe-global/relay-kit at runtime)
// -----------------------------------------------------------------------------

/**
 * Initialize Safe4337Pack for an existing Safe.
 * This is a thin wrapper that returns the pack instance for further operations.
 *
 * NOTE: Actual passkey signer creation should use Safe.createPasskeySigner() from protocol-kit.
 * For MVP, we accept a private key signer (string) or a pre-built passkey signer object.
 */
export async function initSafe4337Pack(
  config: Safe4337Config,
  safeAddress: string,
  signer: string | unknown, // private key or passkey signer
): Promise<unknown> {
  // Dynamic import to avoid bundling relay-kit in all builds
  const { Safe4337Pack } = await import('@safe-global/relay-kit');

  const pack = await Safe4337Pack.init({
    provider: config.rpcUrl,
    signer: signer as string,
    bundlerUrl: config.bundlerUrl,
    paymasterOptions: {
      isSponsored: true,
      paymasterUrl: config.paymasterUrl,
    },
    options: {
      safeAddress,
    },
  });

  return pack;
}

/**
 * Create a new Safe via ERC-4337 (gasless deployment).
 * Returns predicted address and userOp hash.
 */
export async function createSafeWithPasskey(
  params: CreateSafeWithPasskeyParams,
  signer: string | unknown,
): Promise<SafeCreationResult> {
  const { config, passkeyOwner, recoveryEOA, threshold = 1, saltNonce } = params;
  const { Safe4337Pack } = await import('@safe-global/relay-kit');

  const pack = await Safe4337Pack.init({
    provider: config.rpcUrl,
    signer: signer as string,
    bundlerUrl: config.bundlerUrl,
    paymasterOptions: {
      isSponsored: true,
      paymasterUrl: config.paymasterUrl,
    },
    options: {
      owners: [passkeyOwner, recoveryEOA],
      threshold,
      saltNonce,
    },
  });

  const safeAddress = await pack.protocolKit.getAddress();
  const owners = [passkeyOwner, recoveryEOA];

  // Check if already deployed
  const isDeployed = await pack.protocolKit.isSafeDeployed();
  if (isDeployed) {
    return { safeAddress, owners, threshold };
  }

  // Create deployment UserOperation (empty tx triggers deployment)
  const safeOp = await pack.createTransaction({
    transactions: [{ to: safeAddress, data: '0x', value: '0' }],
  });
  const signedOp = await pack.signSafeOperation(safeOp);
  const userOpHash = await pack.executeTransaction({ executable: signedOp });

  return { safeAddress, owners, threshold, userOpHash };
}

/**
 * Execute transactions via Safe4337Pack (gasless via paymaster).
 * Caller is responsible for calling preflight anti-scam check BEFORE this.
 */
export async function executeVia4337(
  pack: unknown,
  transactions: SafeTransaction[],
): Promise<ExecutionResult> {
  const safePack = pack as {
    createTransaction: (opts: { transactions: Array<{ to: string; data: string; value: string }> }) => Promise<unknown>;
    signSafeOperation: (op: unknown) => Promise<unknown>;
    executeTransaction: (opts: { executable: unknown }) => Promise<string>;
  };

  const txs = transactions.map((t) => ({
    to: t.to,
    data: t.data,
    value: (t.value ?? 0n).toString(),
  }));

  const safeOp = await safePack.createTransaction({ transactions: txs });
  const signedOp = await safePack.signSafeOperation(safeOp);
  const userOpHash = await safePack.executeTransaction({ executable: signedOp });

  return { userOpHash, success: true };
}

/**
 * High-level helper: send ZCHF payment via 4337.
 */
export async function sendZchfVia4337(
  pack: unknown,
  params: ZchfTransferParams,
): Promise<ExecutionResult> {
  const tx = buildZchfTransfer(params);
  return executeVia4337(pack, [tx]);
}

/**
 * High-level helper: swap to ZCHF via 4337.
 */
export async function swapToZchfVia4337(
  pack: unknown,
  params: SwapToZchfParams,
): Promise<ExecutionResult> {
  const txs = buildSwapToZchf(params);
  return executeVia4337(pack, txs);
}

// -----------------------------------------------------------------------------
// Utility: Parse ZCHF amount
// -----------------------------------------------------------------------------

/**
 * Parse a human-readable ZCHF amount to base units (18 decimals).
 */
export function parseZchf(amount: string | number): bigint {
  return ethers.parseUnits(amount.toString(), ZCHF_DECIMALS);
}

/**
 * Format ZCHF base units to human-readable string.
 */
export function formatZchf(amount: bigint): string {
  return ethers.formatUnits(amount, ZCHF_DECIMALS);
}

