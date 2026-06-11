export const environment = {
  production: false,
  // Sepolia (Ethereum testnet) — switch depuis OP Sepolia pour tester si l'AA24
  // était spécifique à OP Sepolia ou à abstractionkit's SafeWebAuthnSharedSigner.
  chainId: 11155111n,
  chainName: 'sepolia',
  jsonRpcProvider: 'https://ethereum-sepolia-rpc.publicnode.com',
  // Candide endpoints — endpoint PUBLIC (la clé API user n'est pas activée pour
  // Sepolia côté dashboard Candide). On utilise donc la policy publique.
  bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
  paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
  // Endpoint public n'accepte pas les sponsorshipPolicyId persos.
  sponsorshipPolicyId: undefined as string | undefined,
  // MockZCHF déployé sur Sepolia (faucet ouvert, mint public).
  zchfTokenAddress: '0x0a024786a7f6308409Dc74107e27f443f3F524B5',
  // Sepolia n'a PAS le précompile P256 EIP-7212 (uniquement OP Sepolia, Base
  // Sepolia post-Granite). Donc abstractionkit utilise son fallback contract
  // verifier `0x445a0683...`, qui devrait fonctionner ici.
  p256Precompile: '0x0000000000000000000000000000000000000000',
  // After3Minutes SocialRecoveryModule (Candide). Permet de tester F6 (finalize
  // recovery) sans attendre 3 jours. Default abstractionkit = After3Days.
  socialRecoveryModuleAddress: '0x949d01d424bE050D09C16025dd007CB59b3A8c66' as string | undefined,
  // Limite de paiement journalière en wei ZCHF (1000 ZCHF en dev, MVP 0.3
  // §11). Mettre à `undefined` pour désactiver.
  maxDailyZchfAmount: 1000n * 10n ** 18n,
};
