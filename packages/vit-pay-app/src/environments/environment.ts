export const environment = {
  production: true,
  // Optimism mainnet
  chainId: 10n,
  chainName: 'optimism',
  jsonRpcProvider: 'https://mainnet.optimism.io',
  bundlerUrl: '',
  paymasterUrl: '',
  sponsorshipPolicyId: '' as string | undefined,
  zchfTokenAddress: '0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553',
  p256Precompile: '0x0000000000000000000000000000000000000100',
  socialRecoveryModuleAddress: undefined as string | undefined,
  // OAuth Google (People API readonly) pour importer les noms du carnet
  // d'adresses Google. Laisser '' pour désactiver le bouton.
  googleClientId: '' as string,
};
