import { ModuleCall } from './core.types';

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


