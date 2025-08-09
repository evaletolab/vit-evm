/**
 * Module: core.safe.modules
 *
 * Role
 * - Build low-level module calls and provide Safe v6 helpers to enable/disable modules.
 *
 * Workflow
 * - For ERC-7579 modules, first deploy/install your module contract.
 * - Use enableModuleViaSafe/disableModuleViaSafe to toggle module access on the Safe.
 * - Batch calls can be built with batchModuleCalls and executed using core.safe.execute or Safe SDK directly.
 *
 * Relations
 * - core.safe.account for Safe creation
 * - core.safe.guard for enabling transaction guards
 * - core.safe.webauthn for biometric validator module installation/linking
 * - core.safe.owner-transfer for ownership flows that may be initiated by modules
 */
import Safe from '@safe-global/protocol-kit';
import { ModuleCall } from './core.types';

// Minimal scaffolding for managing ERC-7579 modules via Safe

export interface InstallModuleParams {
  safeAddress: string;
  moduleAddress: string;
  data?: string; // optional init calldata
}

export interface UninstallModuleParams {
  safeAddress: string;
  moduleAddress: string;
}

export function installModule(params: InstallModuleParams): ModuleCall {
  // Placeholder: replace with real Safe module manager ABI if needed
  const data = params.data ?? '0x';
  return { to: params.moduleAddress, data, value: 0n };
}

export function uninstallModule(params: UninstallModuleParams): ModuleCall {
  // Placeholder
  return { to: params.moduleAddress, data: '0x', value: 0n };
}

export function batchModuleCalls(calls: ModuleCall[]): { to: string; data: string; value?: bigint }[] {
  return calls.map((c) => ({ to: c.to, data: c.data, value: c.value ?? 0n }));
}

// --- Safe SDK v6 helpers (direct execution)

export interface SafeEnableModuleParams {
  provider: string; // RPC URL
  signer: string;   // private key or passkey signer supported by v6
  safeAddress: string;
  moduleAddress: string;
}

export async function enableModuleViaSafe(params: SafeEnableModuleParams): Promise<string> {
  const { provider, signer, safeAddress, moduleAddress } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createEnableModuleTx(moduleAddress);
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}

export async function disableModuleViaSafe(params: SafeEnableModuleParams): Promise<string> {
  const { provider, signer, safeAddress, moduleAddress } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createDisableModuleTx(moduleAddress);
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}


