/**
 * Module: core.safe.paymaster
 *
 * Role
 * - Paymaster abstraction layer for ERC-4337 gas sponsorship.
 * - Provides a PaymasterProvider interface to swap between Pimlico, Stackup, etc.
 *
 * Workflow
 * - Create a provider instance (e.g., PimlicoProvider) with config.
 * - Call provider.sponsorUserOp(userOp) to get paymasterAndData for sponsored transactions.
 * - For token paymaster: call provider.getTokenPaymasterData(userOp, token).
 *
 * Relations
 * - core.safe.4337: uses paymaster for gasless execution via Safe4337Pack
 * - Relay Kit: integrates paymaster via paymasterUrl option
 */
import { ModuleCall } from './core.types';
import type { UserOperation, SponsorResponse } from './core.userop.types';

// -----------------------------------------------------------------------------
// PaymasterProvider Interface
// -----------------------------------------------------------------------------

/** Configuration for a paymaster provider */
export interface PaymasterProviderConfig {
  /** Paymaster API endpoint */
  endpoint: string;
  /** API key (if required) */
  apiKey?: string;
  /** Chain ID */
  chainId: number;
  /** Entry point address (v0.6 or v0.7) */
  entryPoint?: string;
}

/** Token paymaster request params */
export interface TokenPaymasterParams {
  userOp: UserOperation;
  /** ERC-20 token address to pay gas with */
  token: string;
  /** Optional: max token amount willing to pay */
  maxTokenAmount?: bigint;
}

/**
 * PaymasterProvider interface — abstracts paymaster vendor differences.
 * Implement this for each vendor (Pimlico, Stackup, Biconomy, etc.).
 */
export interface PaymasterProvider {
  /** Provider name for logging/debugging */
  readonly name: string;

  /**
   * Sponsor a UserOperation (gas paid by paymaster, user pays nothing).
   * Returns paymasterAndData and optional gas overrides.
   */
  sponsorUserOp(userOp: UserOperation): Promise<SponsorResponse>;

  /**
   * Get paymaster data for token payment (user pays gas in ERC-20).
   * Not all providers support this; throws if unsupported.
   */
  getTokenPaymasterData(params: TokenPaymasterParams): Promise<SponsorResponse>;

  /**
   * Check if token paymaster is supported.
   */
  supportsTokenPaymaster(): boolean;
}

// -----------------------------------------------------------------------------
// Pimlico Provider Implementation
// -----------------------------------------------------------------------------

export class PimlicoProvider implements PaymasterProvider {
  readonly name = 'pimlico';
  private config: PaymasterProviderConfig;

  constructor(config: PaymasterProviderConfig) {
    this.config = config;
  }

  async sponsorUserOp(userOp: UserOperation): Promise<SponsorResponse> {
    const { endpoint, apiKey, chainId } = this.config;

    // Pimlico uses JSON-RPC style endpoint
    // POST to endpoint with pm_sponsorUserOperation method
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [
        userOp,
        this.config.entryPoint ?? '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // v0.6 default
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Pimlico sponsorUserOp failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Pimlico error: ${json.error.message ?? JSON.stringify(json.error)}`);
    }

    // Pimlico returns result with paymasterAndData and gas values
    return json.result as SponsorResponse;
  }

  async getTokenPaymasterData(params: TokenPaymasterParams): Promise<SponsorResponse> {
    // Pimlico ERC-20 paymaster uses pm_getPaymasterData with token context
    // This is a simplified implementation; real integration may need quoting first
    const { endpoint, apiKey } = this.config;

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterData',
      params: [
        params.userOp,
        this.config.entryPoint ?? '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        { token: params.token },
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Pimlico getTokenPaymasterData failed: ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Pimlico error: ${json.error.message ?? JSON.stringify(json.error)}`);
    }

    return json.result as SponsorResponse;
  }

  supportsTokenPaymaster(): boolean {
    return true; // Pimlico supports ERC-20 paymaster
  }
}

// -----------------------------------------------------------------------------
// Stackup Provider Stub (for future migration)
// -----------------------------------------------------------------------------

export class StackupProvider implements PaymasterProvider {
  readonly name = 'stackup';
  private config: PaymasterProviderConfig;

  constructor(config: PaymasterProviderConfig) {
    this.config = config;
  }

  async sponsorUserOp(userOp: UserOperation): Promise<SponsorResponse> {
    // Stackup uses similar JSON-RPC interface
    // POST to endpoint with pm_sponsorUserOperation
    const { endpoint, apiKey } = this.config;

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [
        userOp,
        this.config.entryPoint ?? '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        { type: 'payg' }, // Stackup-specific: pay-as-you-go mode
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Stackup sponsorUserOp failed: ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Stackup error: ${json.error.message ?? JSON.stringify(json.error)}`);
    }

    return json.result as SponsorResponse;
  }

  async getTokenPaymasterData(_params: TokenPaymasterParams): Promise<SponsorResponse> {
    // TODO: Implement Stackup token paymaster when needed
    throw new Error('Stackup token paymaster not yet implemented');
  }

  supportsTokenPaymaster(): boolean {
    return false; // Stub: not implemented yet
  }
}

// -----------------------------------------------------------------------------
// Factory function
// -----------------------------------------------------------------------------

export type PaymasterVendor = 'pimlico' | 'stackup';

/**
 * Create a PaymasterProvider instance for the specified vendor.
 */
export function createPaymasterProvider(
  vendor: PaymasterVendor,
  config: PaymasterProviderConfig,
): PaymasterProvider {
  switch (vendor) {
    case 'pimlico':
      return new PimlicoProvider(config);
    case 'stackup':
      return new StackupProvider(config);
    default:
      throw new Error(`Unknown paymaster vendor: ${vendor}`);
  }
}

// -----------------------------------------------------------------------------
// Legacy exports (for backwards compatibility)
// -----------------------------------------------------------------------------

export interface ConfigurePaymasterParams {
  safeAddress: string;
  paymasterAddress: string;
  tokenAddress?: string;
}

/** @deprecated Use PaymasterProvider interface instead */
export function configurePaymaster(params: ConfigurePaymasterParams): ModuleCall {
  const data = '0x';
  return { to: params.paymasterAddress, data, value: 0n };
}

export interface SponsorUserOpParams {
  endpoint: string;
  apiKey?: string;
  chainId: number;
  userOp: UserOperation;
}

/**
 * Standalone sponsorUserOp function (legacy).
 * @deprecated Use PimlicoProvider.sponsorUserOp() instead for better abstraction.
 */
export async function sponsorUserOp(params: SponsorUserOpParams): Promise<SponsorResponse> {
  const provider = new PimlicoProvider({
    endpoint: params.endpoint,
    apiKey: params.apiKey,
    chainId: params.chainId,
  });
  return provider.sponsorUserOp(params.userOp);
}
