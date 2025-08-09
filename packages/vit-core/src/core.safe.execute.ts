/**
 * Module: core.safe.execute
 *
 * Role
 * - Generic single/batch execution helpers over a Safe.
 *
 * Workflow
 * - Build an array of transactions (to, data, value) and call executeViaSafe with provider + signer.
 *
 * Relations
 * - core.safe.modules/core.safe.guard/core.safe.payment build transactions executed through here
 * - core.safe.account provides the Safe address lifecycle
 */
import Safe from '@safe-global/protocol-kit';

export interface ExecuteParams {
  safeAddress: string;
  provider: string; // RPC URL for simplicity (v6 accepts EIP-1193 too)
  signer: string; // private key or passkey signer supported by v6
  txs: Array<{ to: string; data: string; value?: bigint }>;
}

export async function executeViaSafe(params: ExecuteParams): Promise<string> {
  const { safeAddress, provider, signer, txs } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });

  const safeTx = await safe.createTransaction({ transactions: txs.map((t) => ({
    to: t.to,
    data: t.data,
    value: (t.value ?? 0n).toString(),
  })) });

  const signed = await safe.signTransaction(safeTx);
  const exec = await safe.executeTransaction(signed);
  // v6 returns a TransactionResult with hash
  const hash = (exec as any).hash as string | undefined;
  if (hash) return hash;
  const txResp = (exec as any).transactionResponse as { wait: () => Promise<{ hash: string }> } | undefined;
  const receipt = await txResp?.wait();
  if (!receipt) throw new Error('No transaction receipt');
  return receipt.hash;
}

export async function executeModuleCalls(): Promise<string> {
  throw new Error('Use executeViaSafe with provider and signer string for v6');
}


