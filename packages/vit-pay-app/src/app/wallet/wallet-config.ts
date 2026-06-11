import { environment } from '../../environments/environment';

export interface WalletConfig {
  chainId: bigint;
  chainName: string;
  nodeRpcUrl: string;
  bundlerUrl: string;
  paymasterUrl: string;
  sponsorshipPolicyId?: string;
  zchfTokenAddress: string;
  p256Precompile: string;
  socialRecoveryModuleAddress?: string;
  /** Hard cap on cumulative ZCHF sent per day (wei). Undefined = no limit. */
  maxDailyZchfAmount?: bigint;
}

export function getWalletConfig(): WalletConfig {
  const env = environment as unknown as Partial<WalletConfig> & {
    chainId: bigint;
    chainName: string;
    jsonRpcProvider: string;
    bundlerUrl: string;
    paymasterUrl: string;
  };

  const config: WalletConfig = {
    chainId: env.chainId,
    chainName: env.chainName,
    nodeRpcUrl: env.jsonRpcProvider,
    bundlerUrl: env.bundlerUrl,
    paymasterUrl: env.paymasterUrl,
    sponsorshipPolicyId: env.sponsorshipPolicyId,
    zchfTokenAddress:
      env.zchfTokenAddress ?? '0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553',
    p256Precompile:
      env.p256Precompile ?? '0x0000000000000000000000000000000000000100',
    socialRecoveryModuleAddress: env.socialRecoveryModuleAddress,
    maxDailyZchfAmount: env.maxDailyZchfAmount,
  };

  return config;
}

export function assertConfigUsable(config: WalletConfig): void {
  const missing: string[] = [];
  if (!config.nodeRpcUrl) missing.push('nodeRpcUrl');
  if (!config.bundlerUrl) missing.push('bundlerUrl');
  if (!config.paymasterUrl) missing.push('paymasterUrl');
  if (missing.length > 0) {
    throw new Error(
      `WalletConfig is missing required fields: ${missing.join(', ')}. ` +
        `Set them in environments/environment*.ts before using the wallet.`,
    );
  }
}
