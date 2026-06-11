import { ethers } from 'ethers';

export const ZCHF_DECIMALS = 18;

export function parseZchfAmount(input: string): bigint {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '-') {
    throw new Error('Amount is empty');
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount format: "${input}"`);
  }
  const parsed = ethers.parseUnits(trimmed, ZCHF_DECIMALS);
  if (parsed <= 0n) {
    throw new Error('Amount must be positive');
  }
  return parsed;
}

export function formatZchfAmount(amount: bigint): string {
  return ethers.formatUnits(amount, ZCHF_DECIMALS);
}

export function isValidEvmAddress(value: string): boolean {
  return ethers.isAddress(value);
}

export function shortAddress(address: string, prefix = 6, suffix = 4): string {
  if (!isValidEvmAddress(address)) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}

export function mapPaymasterError(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  if (message.includes('policy')) {
    return 'Aucune policy de subvention active pour cette transaction.';
  }
  if (message.includes('budget') || message.includes('quota')) {
    return 'Budget paymaster insuffisant. Réessayer plus tard.';
  }
  if (message.includes('reject') || message.includes('denied')) {
    return 'Transaction rejetée par le paymaster.';
  }
  return 'Transaction non sponsorisée.';
}
