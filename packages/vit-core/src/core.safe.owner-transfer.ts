/**
 * Module: core.safe.owner-transfer
 *
 * Role
 * - Safe owner management helpers: add/remove owners and adjust threshold.
 *
 * Workflow
 * - For recovery flows, a module may validate a recovery code and then call these helpers to update owners.
 * - addOwnerViaSafe / removeOwnerViaSafe create, sign and execute Safe transactions for owner changes.
 *
 * Relations
 * - core.safe.modules: recovery validator module triggers owner changes
 * - core.safe.account: must operate on a deployed Safe
 */
import Safe from '@safe-global/protocol-kit';
import { ModuleCall } from './core.types';

export interface TransferOwnerParams {
  provider: string; // RPC URL
  signer: string;   // private key
  safeAddress: string;
  newOwner: string;
  threshold?: number;
}

export async function addOwnerViaSafe(params: TransferOwnerParams): Promise<string> {
  const { provider, signer, safeAddress, newOwner, threshold = 1 } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createAddOwnerTx({ ownerAddress: newOwner, threshold });
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}

export interface RemoveOwnerParams {
  provider: string; signer: string; safeAddress: string; owner: string; threshold?: number;
}

export async function removeOwnerViaSafe(params: RemoveOwnerParams): Promise<string> {
  const { provider, signer, safeAddress, owner, threshold = 1 } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const tx = await safe.createRemoveOwnerTx({ ownerAddress: owner, threshold });
  const signed = await safe.signTransaction(tx);
  const executed = await safe.executeTransaction(signed);
  return (executed as any).hash ?? (await (executed as any).transactionResponse?.wait())?.hash;
}


