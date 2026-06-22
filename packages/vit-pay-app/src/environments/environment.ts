export const environment = {
  production: true,
  // Sepolia testnet — config publique pour la PWA déployée sur GH Pages.
  // Pour OP mainnet, voir la section Option 2 dans la doc env.
  chainId: 11155111n,
  chainName: 'sepolia',
  jsonRpcProvider: 'https://ethereum-sepolia-rpc.publicnode.com',
  // Candide endpoints publics (la clé API user n'est pas activée pour
  // Sepolia côté dashboard Candide).
  bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
  paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
  sponsorshipPolicyId: undefined as string | undefined,
  // MockZCHF Sepolia (faucet ouvert, mint public).
  zchfTokenAddress: '0x0a024786a7f6308409Dc74107e27f443f3F524B5',
  // Sepolia n'a PAS le précompile P256 EIP-7212 — abstractionkit utilise
  // son fallback contract verifier.
  p256Precompile: '0x0000000000000000000000000000000000000000',
  // After3Minutes SocialRecoveryModule (Candide) pour pouvoir tester F6
  // (finalize recovery) sans attendre 3 jours.
  socialRecoveryModuleAddress: '0x949d01d424bE050D09C16025dd007CB59b3A8c66' as string | undefined,
  // Limite de paiement journalière en wei ZCHF (1000 ZCHF, MVP 0.3 §11).
  maxDailyZchfAmount: 1000n * 10n ** 18n,
  // VitClaimLink déployé sur Sepolia. Hash-locked escrow pour links de claim.
  claimLinkAddress: '0x4159090C5CbA619126cEE49d2802b0Dcee337F0e' as string,
  // OAuth Google (People API readonly). Crée un OAuth Client ID Web dans la
  // Google Cloud Console, ajoute l'origine GH Pages, et colle le client ID ici.
  // '' = bouton "Importer contacts Google" masqué.
  googleClientId: '' as string,
};
