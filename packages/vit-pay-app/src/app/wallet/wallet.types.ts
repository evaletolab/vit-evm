export interface WebauthnPublicKey {
  x: bigint;
  y: bigint;
}

export interface PasskeyOwner {
  rawId: string;
  pubkeyCoordinates: WebauthnPublicKey;
}

export interface DailySpendingTracker {
  /** ISO date 'YYYY-MM-DD' in local timezone. Counter resets when the day changes. */
  date: string;
  /** Cumulative ZCHF spent today, hex-encoded wei. */
  spentWei: string;
}

export interface SerializedRecoveryRequest {
  newOwners: string[];
  newThreshold: number;
  /** Hex string (bigint serialized) — block timestamp after which finalize is allowed. */
  executeAfter: string;
  approvalsRequired: number;
  approvalsReceived: number;
  /** Unix ms when this cache was last refreshed on-chain. */
  cachedAt: number;
}

export interface StoredWallet {
  version: 1;
  accountAddress: string;
  chainId: number;
  credentialId: string;
  webauthnPublicKey: {
    x: string;
    y: string;
  };
  owners: string[];
  recoveryEnabled: boolean;
  zchfTokenAddress: string;
  /** Pseudo / prénom connu des amis (optionnel pour wallets créés avant). */
  displayName?: string;
  /**
   * Identité locale <nom>@vit.app (V1 — pas de registre).
   * Sert d'URL (/nom/vault) et d'username du coffre.
   */
  walletName?: string;
  /** Optional contact profile for claim-link embedding (local only). */
  profileTel?: string;
  profileEmail?: string;
  /** Default ON when profile has at least a displayName. */
  attachContactToClaims?: boolean;
  /**
   * True once recovery codes were confirmed saved (vault / QR) OR user skipped.
   * Skip leaves recoveryEnabled=false and shows a persistent banner.
   */
  backupKitConfirmed?: boolean;
  /** @deprecated V1 mnemonic-owner path — ignored; kept for migration reads. */
  recoveryOwnerAddress?: string;
  /** Last RecoveryRequest read on-chain — used for instant UX on page load. */
  recoveryRequestCache?: SerializedRecoveryRequest;
  /** Tracks ZCHF spent today against `maxDailyZchfAmount` in WalletConfig. */
  dailySpending?: DailySpendingTracker;
}

export interface WalletState {
  accountAddress: string;
  chainId: number;
  owners: string[];
  recoveryEnabled: boolean;
  zchfTokenAddress: string;
  passkey: PasskeyOwner;
  deployed: boolean;
  displayName?: string;
  walletName?: string;
  profileTel?: string;
  profileEmail?: string;
  attachContactToClaims?: boolean;
  backupKitConfirmed?: boolean;
  /** @deprecated */
  recoveryOwnerAddress?: string;
}

export interface UserOperationDebug {
  /** EIP-712 hash of the userOp (matches what the passkey signed). */
  userOpEip712Hash?: string;
  /** Raw userOp at send time, JSON-safe (bigints stringified, hex preserved). */
  userOpJson?: string;
  /** Sponsor paymaster URL used (no secrets). */
  paymasterUrl?: string;
  /** Bundler URL used. */
  bundlerUrl?: string;
}

export interface PreflightWarning {
  /** Human-readable summary from preflightRiskCheck. */
  summary: string;
  /** Number of flags raised (≥1 for WARN, ≥1 high-severity for BLOCK). */
  flagCount: number;
}

export interface UserOperationResult {
  userOpHash: string;
  transactionHash?: string;
  success: boolean;
  error?: string;
  debug?: UserOperationDebug;
  /** Non-blocking warning raised by preflight before signing. */
  preflight?: PreflightWarning;
}

export interface RecoveryRequest {
  accountAddress: string;
  newOwners: string[];
  newThreshold: number;
  executeAfter: bigint;
  approvalsRequired: number;
  approvalsReceived: number;
}

export interface ParsedAmount {
  raw: bigint;
  decimals: number;
  formatted: string;
}
