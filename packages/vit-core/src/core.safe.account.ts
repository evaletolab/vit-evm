/**
 * Module: core.safe.account
 *
 * Role
 * - Safe v6 account lifecycle helpers: deterministic prediction and deployment, and basic info.
 *
 * Workflow
 * - Create predicted Safe config (owners, threshold, optional saltNonce) and call Safe.init({ provider, signer, predictedSafe }).
 * - If not deployed, create a deployment transaction and broadcast it (RPC URL + private key signer supported).
 * - Query Safe info (owners, threshold) via Safe.init({ provider, safeAddress }).
 *
 * Relations
 * - Works hand-in-hand with:
 *   - core.safe.modules: enable/disable ERC-7579 modules on a deployed Safe
 *   - core.safe.guard: enable/disable transaction guards
 *   - core.safe.owner-transfer: owner add/remove flows, often used by recovery modules
 *   - core.safe.payment: basic ETH/ERC20 payments executed through the Safe
 *   - core.safe.webauthn: WebAuthn bridge installing/linking a biometric validator module
 */
import { ethers } from 'ethers';
import Safe, { PredictedSafeProps, SafeAccountConfig, SafeDeploymentConfig } from '@safe-global/protocol-kit';

type Eip1193ProviderLike = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export interface CreateSafeParams {
  provider: string; // RPC URL (v6 accepts EIP-1193 too)
  signerPrivateKey: string; // Owner private key
  owners: string[];      // initial owners
  threshold?: number;    // default 1
  saltNonce?: string;    // optional for deterministic
}

export interface SafeInfo {
  address: string;
  owners: string[];
  threshold: number;
}

export async function createSafeAccount(params: CreateSafeParams): Promise<SafeInfo> {
  const { provider, signerPrivateKey, owners, threshold = 1, saltNonce } = params;

  const safeAccountConfig: SafeAccountConfig = { owners, threshold };
  const safeDeploymentConfig: SafeDeploymentConfig = { saltNonce };
  const predictedSafe: PredictedSafeProps = { safeAccountConfig, safeDeploymentConfig };

  // Initialize with predicted Safe
  const safe = await Safe.init({ provider, signer: signerPrivateKey, predictedSafe });
  const predictedAddress = await safe.getAddress();

  // Deploy if needed
  const isDeployed = await safe.isSafeDeployed();
  if (!isDeployed) {
    const tx = await safe.createSafeDeploymentTransaction();
    // Attempt broadcast if provider is RPC URL
    if (typeof provider === 'string') {
      const rpc = new ethers.JsonRpcProvider(provider);
      const wallet = new ethers.Wallet(signerPrivateKey, rpc);
      const resp = await wallet.sendTransaction({ to: tx.to as string, data: tx.data as string, value: tx.value ? BigInt(tx.value) : 0n });
      await resp.wait();
    } else {
      throw new Error('Cannot broadcast deployment: provide RPC URL provider to auto-deploy');
    }
  }

  return { address: predictedAddress, owners, threshold };
}

export async function getSafeInfo(address: string, provider: string): Promise<SafeInfo> {
  const safe = await Safe.init({ provider, safeAddress: address });
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  return { address, owners, threshold };
}


