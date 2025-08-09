/**
 * Module: core.safe.payment
 *
 * Role
 * - Basic payment helpers executed via Safe v6: ETH and ERC-20 transfers.
 *
 * Workflow
 * - Build transactions with Safe.createTransaction, sign and execute them through Safe SDK.
 * - For ERC-20, encode transfer(to, amount) using buildErc20TransferData.
 *
 * Relations
 * - core.safe.guard: guards can enforce spending policies on these payments
 * - core.safe.modules: payment-related modules can be enabled/disabled
 * - core.safe.account: requires deployed Safe and signer
 */
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

export interface SafePaymentBaseParams {
  provider: string; // RPC URL
  signer: string;   // private key (or passkey signer) supported by v6
  safeAddress: string;
}

export interface SendEthParams extends SafePaymentBaseParams {
  to: string;
  amountWei: bigint;
}

export async function sendEthViaSafe(params: SendEthParams): Promise<string> {
  const { provider, signer, safeAddress, to, amountWei } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const safeTx = await safe.createTransaction({ transactions: [{ to, data: '0x', value: amountWei.toString() }] });
  const signed = await safe.signTransaction(safeTx);
  const exec = await safe.executeTransaction(signed);
  return (exec as any).hash ?? (await (exec as any).transactionResponse?.wait())?.hash;
}

export function buildErc20TransferData(to: string, amount: bigint): string {
  const iface = new ethers.Interface(['function transfer(address to,uint256 value)']);
  return iface.encodeFunctionData('transfer', [to, amount]);
}

export interface SendErc20Params extends SafePaymentBaseParams {
  token: string; // ERC-20 contract
  to: string;
  amount: bigint; // in token base units
}

export async function sendErc20ViaSafe(params: SendErc20Params): Promise<string> {
  const { provider, signer, safeAddress, token, to, amount } = params;
  const safe = await Safe.init({ provider, signer, safeAddress });
  const data = buildErc20TransferData(to, amount);
  const tx = await safe.createTransaction({ transactions: [{ to: token, data, value: '0' }] });
  const signed = await safe.signTransaction(tx);
  const exec = await safe.executeTransaction(signed);
  return (exec as any).hash ?? (await (exec as any).transactionResponse?.wait())?.hash;
}


