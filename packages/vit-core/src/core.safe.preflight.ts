/**
 * Module: core.safe.preflight
 *
 * Role
 * - Anti-scam pre-transaction verification (PRIORITY 2.5 in MVP plan).
 * - Screen transactions BEFORE signing/executing to detect phishing, drainers, malicious approvals.
 *
 * Workflow
 * - Call `preflightRiskCheck(transactions)` right before `safe4337Pack.signSafeOperation()`.
 * - Returns a verdict (OK/WARN/BLOCK) with reasons and flagged addresses.
 * - BLOCK: prevent signing by default (allow override only in expert mode).
 * - WARN: show warning + friction (extra confirmation).
 *
 * Relations
 * - core.safe.4337: integrates preflight before executeVia4337
 * - vit-backend: optionally calls a backend risk screening endpoint
 */
import { ethers } from 'ethers';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Risk verdict levels */
export type RiskVerdict = 'OK' | 'WARN' | 'BLOCK';

/** Individual risk flag */
export interface RiskFlag {
  type: 'recipient' | 'spender' | 'operator' | 'approval_amount' | 'unknown_contract';
  address: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

/** Result of preflight risk check */
export interface PreflightResult {
  verdict: RiskVerdict;
  flags: RiskFlag[];
  /** Summary message for UI */
  summary: string;
}

/** Transaction to screen */
export interface TransactionToScreen {
  to: string;
  data: string;
  value?: bigint;
}

/** Preflight configuration */
export interface PreflightConfig {
  /** Backend risk screening endpoint (optional, MVP can use local-only) */
  backendEndpoint?: string;
  /** API key for backend (if required) */
  apiKey?: string;
  /** Local blocklist (addresses to always BLOCK) */
  blocklist?: Set<string>;
  /** Local allowlist (addresses to always OK) */
  allowlist?: Set<string>;
  /** Threshold for unlimited approval warning (default: max uint256 / 2) */
  unlimitedApprovalThreshold?: bigint;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Common function selectors for risky calls */
export const RISKY_SELECTORS = {
  // ERC-20 approve(address spender, uint256 value)
  ERC20_APPROVE: '0x095ea7b3',
  // ERC-721/1155 setApprovalForAll(address operator, bool approved)
  SET_APPROVAL_FOR_ALL: '0xa22cb465',
  // Permit2 approve (various signatures)
  PERMIT2_APPROVE: '0x2b67b570',
  // ERC-20 permit (EIP-2612)
  ERC20_PERMIT: '0xd505accf',
} as const;

/** Default unlimited approval threshold (half of max uint256) */
const DEFAULT_UNLIMITED_THRESHOLD = BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

// -----------------------------------------------------------------------------
// Parsing helpers
// -----------------------------------------------------------------------------

/** Extract spender from ERC-20 approve calldata */
export function parseErc20Approve(data: string): { spender: string; amount: bigint } | null {
  if (!data.startsWith(RISKY_SELECTORS.ERC20_APPROVE)) return null;
  try {
    const iface = new ethers.Interface(['function approve(address spender, uint256 value)']);
    const decoded = iface.decodeFunctionData('approve', data);
    return { spender: decoded[0] as string, amount: decoded[1] as bigint };
  } catch {
    return null;
  }
}

/** Extract operator from setApprovalForAll calldata */
export function parseSetApprovalForAll(data: string): { operator: string; approved: boolean } | null {
  if (!data.startsWith(RISKY_SELECTORS.SET_APPROVAL_FOR_ALL)) return null;
  try {
    const iface = new ethers.Interface(['function setApprovalForAll(address operator, bool approved)']);
    const decoded = iface.decodeFunctionData('setApprovalForAll', data);
    return { operator: decoded[0] as string, approved: decoded[1] as boolean };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Local risk analysis (no network calls)
// -----------------------------------------------------------------------------

/**
 * Analyze a single transaction for risky patterns (local analysis only).
 */
export function analyzeTransactionLocally(
  tx: TransactionToScreen,
  config: PreflightConfig,
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const toLower = tx.to.toLowerCase();
  const blocklist = config.blocklist ?? new Set();
  const allowlist = config.allowlist ?? new Set();
  const unlimitedThreshold = config.unlimitedApprovalThreshold ?? DEFAULT_UNLIMITED_THRESHOLD;

  // 1. Check recipient against blocklist
  if (blocklist.has(toLower)) {
    flags.push({
      type: 'recipient',
      address: tx.to,
      reason: 'Recipient is on local blocklist (known scam/phishing)',
      severity: 'high',
    });
  }

  // Skip further checks if allowlisted
  if (allowlist.has(toLower)) {
    return flags;
  }

  // 2. Check for ERC-20 approve
  const approveData = parseErc20Approve(tx.data);
  if (approveData) {
    const spenderLower = approveData.spender.toLowerCase();

    // Check spender against blocklist
    if (blocklist.has(spenderLower)) {
      flags.push({
        type: 'spender',
        address: approveData.spender,
        reason: 'Spender is on local blocklist (known drainer)',
        severity: 'high',
      });
    }

    // Check for unlimited approval
    if (approveData.amount >= unlimitedThreshold) {
      flags.push({
        type: 'approval_amount',
        address: approveData.spender,
        reason: 'Unlimited or very large approval amount detected',
        severity: 'medium',
      });
    }
  }

  // 3. Check for setApprovalForAll
  const approvalForAll = parseSetApprovalForAll(tx.data);
  if (approvalForAll && approvalForAll.approved) {
    const operatorLower = approvalForAll.operator.toLowerCase();

    if (blocklist.has(operatorLower)) {
      flags.push({
        type: 'operator',
        address: approvalForAll.operator,
        reason: 'Operator is on local blocklist (known malicious operator)',
        severity: 'high',
      });
    } else {
      // setApprovalForAll is inherently risky
      flags.push({
        type: 'operator',
        address: approvalForAll.operator,
        reason: 'setApprovalForAll grants full control over your NFTs to this operator',
        severity: 'medium',
      });
    }
  }

  return flags;
}

// -----------------------------------------------------------------------------
// Backend risk screening (optional)
// -----------------------------------------------------------------------------

/** Response from backend risk screening endpoint */
export interface BackendRiskResponse {
  verdict: RiskVerdict;
  flags: RiskFlag[];
}

/**
 * Call backend risk screening endpoint.
 * Expected request: POST { addresses: string[], transactions: TransactionToScreen[] }
 * Expected response: { verdict: RiskVerdict, flags: RiskFlag[] }
 */
export async function callBackendRiskScreening(
  config: PreflightConfig,
  transactions: TransactionToScreen[],
): Promise<BackendRiskResponse | null> {
  if (!config.backendEndpoint) return null;

  try {
    // Extract all addresses to screen
    const addresses = new Set<string>();
    for (const tx of transactions) {
      addresses.add(tx.to.toLowerCase());
      const approve = parseErc20Approve(tx.data);
      if (approve) addresses.add(approve.spender.toLowerCase());
      const approvalForAll = parseSetApprovalForAll(tx.data);
      if (approvalForAll) addresses.add(approvalForAll.operator.toLowerCase());
    }

    const response = await fetch(config.backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        addresses: Array.from(addresses),
        transactions,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.warn(`Backend risk screening failed: ${response.status}`);
      return null;
    }

    return (await response.json()) as BackendRiskResponse;
  } catch (error) {
    console.warn('Backend risk screening error:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Main preflight check
// -----------------------------------------------------------------------------

/**
 * Compute verdict from flags.
 */
function computeVerdict(flags: RiskFlag[]): RiskVerdict {
  if (flags.some((f) => f.severity === 'high')) return 'BLOCK';
  if (flags.some((f) => f.severity === 'medium')) return 'WARN';
  return 'OK';
}

/**
 * Generate summary message from flags.
 */
function generateSummary(verdict: RiskVerdict, flags: RiskFlag[]): string {
  if (verdict === 'OK') return 'No risks detected';
  if (verdict === 'BLOCK') {
    const highFlags = flags.filter((f) => f.severity === 'high');
    return `Transaction blocked: ${highFlags.map((f) => f.reason).join('; ')}`;
  }
  const mediumFlags = flags.filter((f) => f.severity === 'medium');
  return `Warning: ${mediumFlags.map((f) => f.reason).join('; ')}`;
}

/**
 * Main preflight risk check.
 * Call this BEFORE signing any Safe transaction or UserOperation.
 *
 * @param transactions - Array of transactions to screen
 * @param config - Preflight configuration (optional)
 * @returns PreflightResult with verdict, flags, and summary
 */
export async function preflightRiskCheck(
  transactions: TransactionToScreen[],
  config: PreflightConfig = {},
): Promise<PreflightResult> {
  const allFlags: RiskFlag[] = [];

  // 1. Local analysis (always runs)
  for (const tx of transactions) {
    const localFlags = analyzeTransactionLocally(tx, config);
    allFlags.push(...localFlags);
  }

  // 2. Backend analysis (optional, if configured)
  const backendResult = await callBackendRiskScreening(config, transactions);
  if (backendResult) {
    // Merge backend flags (dedupe by address+type)
    for (const flag of backendResult.flags) {
      const exists = allFlags.some(
        (f) => f.address.toLowerCase() === flag.address.toLowerCase() && f.type === flag.type,
      );
      if (!exists) {
        allFlags.push(flag);
      }
    }
  }

  // 3. Compute final verdict
  const verdict = computeVerdict(allFlags);
  const summary = generateSummary(verdict, allFlags);

  return { verdict, flags: allFlags, summary };
}

// -----------------------------------------------------------------------------
// Convenience: Quick blocklist check
// -----------------------------------------------------------------------------

/**
 * Quick check if an address is on the local blocklist.
 */
export function isBlocked(address: string, blocklist: Set<string>): boolean {
  return blocklist.has(address.toLowerCase());
}

/**
 * Quick check if an address is on the local allowlist.
 */
export function isAllowed(address: string, allowlist: Set<string>): boolean {
  return allowlist.has(address.toLowerCase());
}

