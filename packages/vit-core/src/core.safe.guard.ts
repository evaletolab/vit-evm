/**
 * Module: core.safe.guard
 *
 * Role
 * - Configure and toggle Safe transaction guards (policy enforcement for outgoing txs).
 *
 * Workflow
 * - Encode any guard-specific rules with configurePaymentGuard (placeholder ABI encoding).
 * - Enable a guard via enableGuardViaSafe; disable via disableGuardViaSafe.
 *
 * Relations
 * - core.safe.modules: guards can be complementary to modules for validation
 * - core.safe.payment: guards enforce payment rules (limits, whitelists)
 * - core.safe.account: requires a deployed Safe to attach a guard
 */
import Safe from '@safe-global/protocol-kit';
import { ModuleCall } from './core.types';

// Skeleton for a basic payment validation guard interactions

export interface ConfigureGuardParams {
  safeAddress: string;
  guardAddress: string;
  rulesData?: string; // ABI-encoded rules
}

export function configurePaymentGuard(params: ConfigureGuardParams): ModuleCall {
  // Placeholder: guard-specific ABI should be encoded here
  const data = params.rulesData ?? '0x';
  return { to: params.guardAddress, data, value: 0n };
}

export interface SafeGuardEnableParams {
  provider: string;
  signer: string;
  safeAddress: string;
  guardAddress: string;
}

export async function enableGuardViaSafe(params: SafeGuardEnableParams): Promise<string> {
  const { provider, signer, safeAddress, guardAddress } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createEnableGuardTx(guardAddress);
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}

export async function disableGuardViaSafe(params: Omit<SafeGuardEnableParams, 'guardAddress'>): Promise<string> {
  const { provider, signer, safeAddress } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createDisableGuardTx();
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}


