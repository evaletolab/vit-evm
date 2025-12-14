import { ModuleCall } from './core.types';
import type { UserOperation, SponsorResponse } from './core.userop.types';

export interface ConfigurePaymasterParams {
  safeAddress: string;
  paymasterAddress: string;
  tokenAddress?: string; // e.g., xCHF for sponsorship
}

export function configurePaymaster(params: ConfigurePaymasterParams): ModuleCall {
  // Placeholder: encode real paymaster config
  const data = '0x';
  return { to: params.paymasterAddress, data, value: 0n };
}

export interface SponsorUserOpParams {
  endpoint: string; // e.g., Pimlico sponsor endpoint
  apiKey?: string;
  chainId: number;
  userOp: UserOperation;
}

export async function sponsorUserOp(params: SponsorUserOpParams): Promise<SponsorResponse> {
  const { endpoint, apiKey, chainId, userOp } = params;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ chainId, userOperation: userOp }),
  });
  if (!res.ok) throw new Error(`sponsorUserOp failed: ${res.status}`);
  const data = await res.json();
  return data as SponsorResponse;
}


