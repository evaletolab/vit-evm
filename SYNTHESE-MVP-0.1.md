# Synthèse technique — vit-evm MVP 0.1

État au **2026-06-11**.

## Couverture du spec `packages/VIT-MVP-0.1.tmp.md`

| Feature spec | Livré | API `WalletService` | Validation E2E |
|---|---|---|---|
| **F1** — Créer wallet via passkey | ✅ | `createWalletWithPasskey()` | Wallet créé sur Sepolia, adresse stable post-refresh |
| **F2** — Recevoir ZCHF test | ✅ (+ faucet UI) | `mintTestZchf(amount)` + `getZchfBalance()` | Mint 100 ZCHF inclus (tx `0xfd9caba1…0c8770`) |
| **F3** — Paiement sponsorisé | ✅ | `sendZchfPayment(to, amount)` | Tx burner incluse, solde décrémenté, limite journalière trackée |
| **F4** — Ajouter device | ⚠️ partiel | `addDeviceWithPasskey()` (option A) + `addOwnerByAddress(addr)` (option B §18.3) | Option B validée (vitalik ajouté comme co-owner). Pas testé : signature distante via QR (iter 0.4) |
| **F5** — Activer recovery | ✅ | `enableRecovery(guardians, threshold)` | Module After3Days activé, guardian Hardhat#0 ajouté |
| **F6** — Restaurer wallet | ⚠️ partiel | `startRecovery()` / `getRecoveryRequest()` / `finalizeRecovery()` | **En cours** — bloqué sur identification du Safe address actuel + grace period 3 jours côté After3Days |

## Architecture livrée

**Stack** : Angular 18 + abstractionkit 0.3.8 (Safe Account v1.4.1, EntryPoint v0.7, ERC-4337) + WebAuthn P-256 + Candide bundler/paymaster.

**Isolation** : tout `abstractionkit` est confiné à `wallet.service.ts` + `lib/userOp.ts` (vérifié par grep). Les components Angular n'appellent que `WalletService`.

**Plumberie résolue** :
- Workspace npm pointait sur `file:../karibou-web3` (chemin mort) → fixé à `"*"`
- Barrel `kng2-web3` tire `@safe-global/protocol-kit` browser-incompatible → utiliser subpath `kng2-web3/preflight`

**Bugs résolus** (skill `debug` méthode 5-Whys + commit-then-instrument) :
- **Fix 3 (journal §17)** — abstractionkit pointe par défaut sur sa copie non-canonique du `SafeWebAuthnSharedSigner` (`0xfD90FAd3…`). Override des 5 adresses webauthn vers `SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_*` (canoniques v0.2.1, addresses Safe officielles).
- **Fix 4 (journal §20)** — `navigator.credentials.get()` sans `userVerification: 'required'` → flags `UV=0` dans `authenticatorData` → `AUTH_FLAG_MASK = 0x05` Safe v0.2.1 rejette → AA24. Patch + assert détection précoce dans `lib/userOp.ts`.

**Garde-fous UX** :
- Préflight anti-scam câblé dans `sendZchfPayment` (iter 0.2 §18.2)
- Page debug UserOperation collapsible (4 sections, copier JSON) — outil principal de diagnostic en prod (iter 0.2 §18.1)
- Limite journalière `maxDailyZchfAmount` 1000 ZCHF dev, reset à minuit local, check avant signature + increment après succès UserOp (iter 0.3 §19)

**Sécurité contractuelle** :
- Aucun secret stocké en localStorage (`privateKey`/`mnemonic`/`seed`/`shares` interdits, validation runtime `WalletStorageService.isStoredWallet`)
- Subvention obligatoire (pas de fallback ETH), erreur explicite « Transaction non sponsorisée » via `mapPaymasterError`
- Recovery par rotation d'owners (pas de seed phrase à restaurer)

## Dette résiduelle

**Itération 0.4 (journal §11)** :
- F4 « ajout depuis appareil cible » avec QR + signature distante (M)
- Migration `relay-kit` Safe officiel pour découpler de `abstractionkit` (L)
- Suppression des démos historiques `vit-mint/` + `vit-passkey/` (S)
- Tests E2E Cypress / Playwright (L) — actuellement aucun test automatisé, validation 100% manuelle

**Découvertes E2E récentes** :
- Le bouton « Activer / mettre à jour » devient cliquable seulement après hard reload — Angular ne rebind pas le handler après HMR sur changement d'env (bug mineur de DX)
- `ethers.isAddress` rejette les checksums EIP-55 invalides silencieusement (UX guardian)
- Dépendance grace period `SocialRecoveryModule` : After3Days par défaut bloque tout test E2E session, nécessite switch vers After3Minutes + re-activation propre

## Couper la dépendance Candide

L'idée directrice : le **smart account reste neutre** (Safe + EntryPoint canoniques), seul le **transport off-chain** est Candide-spécifique. La découpler = changer les pièces remplaçables tout en gardant les contrats.

**Niveau 1 — Switch provider** (effort : S, 1 commit)
- Remplacer `bundlerUrl` et `paymasterUrl` dans `environment.ts` par Pimlico (`api.pimlico.io`), Stackup (`api.stackup.sh`) ou Alchemy (`alchemy.com/.../v3`). Tous parlent le même JSON-RPC ERC-4337.
- Le `CandidePaymaster` côté `abstractionkit` doit être remplacé par le client paymaster du nouveau fournisseur (interface différente). C'est ~30 lignes dans `executeSponsoredUserOp`.
- Conséquence : on troque un vendor pour un autre. Suffisant pour résilience opérationnelle mais pas pour souveraineté.

**Niveau 2 — Abstraire le `PaymasterProvider`** (effort : M, déjà amorcé)
- Commit `3666efc` dans `vit-core` ajoute déjà `PaymasterProvider` interface avec stubs Pimlico+Stackup. La récupérer côté `vit-pay-app` :
  ```ts
  interface PaymasterProvider {
    sponsor(userOp, bundlerUrl, policyId?): Promise<SponsoredUserOp>;
  }
  ```
- Branchement de 2-3 implémentations en parallèle + heuristique de fallback côté `WalletService` (try primary, fallback secondary si 5xx ou timeout > 5s).
- Conséquence : si Candide tombe, l'UI bascule auto sur Pimlico/Stackup sans intervention.

**Niveau 3 — Self-host bundler** (effort : L, infra)
- Tourner un bundler open-source : Etherspot **Skandha** (TypeScript), Stackup **go-bundler** (Go), Pimlico **alto** (TypeScript). Docker + un RPC node (Infura/Alchemy/Erigon self-hosted).
- Pour le paymaster : déployer son propre `Paymaster` contract (template Safe officiel), funder son entryPoint deposit, signer les sponsorings avec sa propre clé.
- Conséquence : zéro dépendance vendor, mais coût opérationnel (uptime, monitoring, refill paymaster).

**Niveau 4 — Bypass ERC-4337** (effort : S, mais perd UX)
- Appel direct `Safe.execTransaction(to, value, data, op, ..., signatures)` depuis n'importe quel EOA. Signatures = passkey via le Safe Passkey Module v0.2.1 (mêmes contrats canoniques).
- Sacrifice : l'utilisateur doit avoir un EOA avec ETH pour payer le gas → on perd la sponsorisation et la « zéro-friction » de l'AA. Mais les fonds sont accessibles même si toute l'infra ERC-4337 (bundlers + paymasters) du monde est down.
- Utilité : **fallback dernier recours**, à intégrer comme « mode rescue » dans le wallet (bouton « Sortir mes fonds » qui produit une `execTransaction` brute à signer ailleurs).

**Reco MVP 0.4 → 0.5** : implémenter le **niveau 2** comme baseline (un seul switch côté UI), documenter le **niveau 4** comme rescue path dans la FAQ utilisateur. Le **niveau 3** n'a de sens qu'à l'échelle (>10k users) ou pour conformité régulatoire stricte.

---

## Contrats déployés

État au 2026-06-17. Tous les contrats Solidity vivent dans `packages/vit-safe-modules/contracts/`.

### Production (Optimism mainnet)

À déployer post-MVP. Les addresses seront collées dans `environment.ts`.

### Dev (Sepolia, chainId `11155111`)

| Contrat | Address | Rôle | Déployé via |
|---|---|---|---|
| **MockZCHF** | `0x0a024786a7f6308409Dc74107e27f443f3F524B5` | ERC-20 testnet avec `mint()` ouvert pour faucet | `scripts/deployMockZchf.js` |
| **VitSafeRecoveryValidator** | (cf. console post-deploy) | Validator ERC-7579 pour `executeRecovery` côté Safe | `scripts/deploy.js` |
| **VitSafeWebAuthnValidator** | (cf. console post-deploy) | Validator ERC-7579 pour passkey P-256 | `scripts/deploy.js` |
| **VitSafePaymentGuard** | (cf. console post-deploy) | Guard ERC-7579 (limite journalière on-chain) | `scripts/deploy.js` |
| **VitClaimLink** | `0x4159090C5CbA619126cEE49d2802b0Dcee337F0e` | Hash-locked escrow ERC-20 pour envoi par URL | `scripts/deployClaimLink.js` |
| **SocialRecoveryModule** (Candide) | `0x949d01d424bE050D09C16025dd007CB59b3A8c66` | Module After-3-Minutes (variant dev) | déploiement externe |

### `VitClaimLink` — détail (nouveau, 2026-06-17)

Contrat trustless permettant d'envoyer des xCHF par URL. Le sender lock les fonds avec un hash de secret ; quiconque détient le secret peut réclamer ; le sender peut **annuler à tout moment** tant que le link est en `Pending` (y compris après expiry pour récupérer ses fonds en cas de lien perdu).

**API** :
- `create(bytes32 id, address token, uint128 amount, uint64 expiry, bytes32 secretHash)` — lock après `approve`. `expiry = 0` = pas d'expiration.
- `claim(bytes32 id, bytes32 secret, address recipient)` — n'importe qui avec le secret transfère au recipient. Vérifie `keccak256(abi.encode(secret)) == secretHash` et `block.timestamp <= expiry`.
- `cancel(bytes32 id)` — sender uniquement, autorisé tant que status = `Pending`.
- `getLink(bytes32 id)` — état complet `(sender, token, amount, expiry, status, secretHash)`.

**Statuts** : `Pending` (0) → `Claimed` (1) ou `Cancelled` (2). Aucune transition réversible.

**Errors custom** : `AlreadyExists`, `NotPending`, `NotSender`, `Expired`, `WrongSecret`, `ZeroAmount`.

**Sécurité** :
- `ReentrancyGuard` sur create/claim/cancel.
- `SafeERC20` pour les transferts (tolère les tokens non-conformes).
- Le secret est révélé on-chain au claim — c'est attendu : le link doit transiter off-chain par un canal de confiance (chat chiffré, NFC, QR), tout comme une crypto-address copier-collée.
- Pas de fee, pas d'owner, pas d'upgrade — contrat immuable et neutre.

**Tests** (`test/Vit.ClaimLink.js`) : 12 specs (create, double-claim, wrong-secret, expiry, cancel par sender et par non-sender, cancel après expiry). 12/12 passants.

**Wiring frontend** (`packages/vit-pay-app`) :
- `wallet.service.ts` : `createClaimLink` (approve + create en 1 UserOp sponsorisé), `claimClaimLink`, `cancelClaimLink`, `readClaimLink`.
- `claimlink/claimlink.service.ts` : génère `id`+`secret` aléatoires (32 bytes chacun), construit URL `/claim?id=&s=`, stocke metadata locale en `vit-claimlinks:<address>`.
- Pages : `/links` (liste + create + cancel) et `/claim?id=&s=` (destinataire, vérifie le hash localement avant tx).

**Limite UX connue** : si l'utilisateur perd la liste localStorage (cache wipe), il perd la traçabilité de ses links — mais peut toujours `cancel(id)` s'il a noté l'ID, et le contrat reste source de vérité via `getLink(id)`.

---

## Dead code (snapshot 2026-06-17)

Audit du code déclaré mais non consommé en production. Ne couvre pas les tests : les symboles « test-only » sont des candidats à isoler hors du barrel public (`index.ts`) si non destinés à être API.

### vit-core

**Fichiers entiers à supprimer ou à isoler hors du barrel** (aucun import depuis vit-pay-app, et exportés via `src/index.ts`) :

- `packages/vit-core/src/defi.aave.ts` — `aaveDeposit`, `aaveDepositedAmount`, `aaveInterest`, `aaveLendingPools`, `aaveLendingProposals`, `encodeAaveSupply`, `encodeAaveWithdraw`. Aucune référence externe.
- `packages/vit-core/src/defi.rocketpool.ts` — `rocketPoolStake`, `rocketPoolStakedAmount`, `rocketPoolInterest`. Aucune référence externe.
- `packages/vit-core/src/defi.uniswap.ts` — `swap`, `encodeSwapExactTokensForTokens`. Duplication avec `core.safe.4337.ts:buildSwapToZchf` qui est la version réellement utilisée → consolider ou supprimer.
- `packages/vit-core/src/core.horcrux.ts` — `publish`, `restore`. Contrat associé (`Horcrux.sol`) lui-même non déployé (voir §vit-safe-modules).

**Symboles test-only** (utilisés uniquement par `packages/vit-core/test/*.spec.ts`, mais exportés publiquement via `index.ts`) :

- `core.SSS.ts` : `createShamirSecretFromSeed`, `combineShamirSecret`
- `core.derivation.ts` : `derivationFromSeed`, `createFromKey`, `isValidPrivateKey`
- `core.entropy.ts` : `retrieveEntropy`, `createMnemonic`, `isValidMnemonic`, `randomDigits`
- `tools.ts` : `numberToKecc256`, `nonStdMnemonicToBytes`, `bytesToNonStdMenomnic`

**Décision à prendre** : si ces APIs sont destinées aux consommateurs externes du package `kng2-web3` (digital identity / horcrux), garder l'export et le documenter ; sinon, retirer du barrel et passer en `internal`.

**Dépendance npm non importée** :
- `secrets.js-34r7h` dans `packages/vit-core/package.json`. Aucun import dans le code source.

### vit-pay-app

**Code applicatif** : aucun fichier orphelin, aucun composant Angular non utilisé, toutes les routes (`/`, `/account`, `/buy`, `/sent`, `/txs`, `/wallet`) sont atteignables.

**Dépendances npm non importées** :
- `store` (^2.0.12) dans `dependencies`. Aucun `from 'store'` dans `src/`.
- `@types/qrcode` (^1.5.6) dans `devDependencies`. `qrcode` (runtime) embarque déjà ses types depuis v1.5 — types redondants.

### vit-safe-modules

**Contrats à retirer** :
- `contracts/Horcrux.sol` — non déployé par `scripts/deploy.js`, aucun test (`test/` ne le mentionne pas), aucune référence repo.
- `contracts/Lock.sol` — template par défaut de Hardhat, testé seulement par `test/Lock.js` (boilerplate), non intégré au système ViT.

**Mocks légitimes** (à conserver) : `MockERC20.sol` (utilisé par `test/Vit.Escrow.js` + `scripts/deployMockZchf.js`), `MockSafe.sol` (utilisé par `test/Vit.SafeModule.Withdrawal.js`).

### Plan de nettoyage suggéré

| Priorité | Action | Gain |
|---|---|---|
| P1 | Supprimer `Horcrux.sol`, `Lock.sol` + `test/Lock.js` | Réduit surface contrats |
| P1 | Retirer `defi.aave.ts`, `defi.rocketpool.ts`, `defi.uniswap.ts` du barrel `index.ts` (ou supprimer) | Réduit bundle frontend, élimine duplication Uniswap |
| P1 | Supprimer `core.horcrux.ts` (alignement avec suppression du contrat) | Cohérence |
| P2 | Statuer sur SSS / derivation / entropy / horcrux test-only → API publique ou interne | Clarifie le contrat de `kng2-web3` |
| P3 | Retirer `store`, `@types/qrcode`, `secrets.js-34r7h` des `package.json` | `npm i` plus rapide, lockfile plus propre |

---

**Résumé exécutif** : MVP fonctionnel F1-F5 validé E2E, F6 en cours, dépendance Candide totale mais découplable en ~1-2 sprints via le `PaymasterProvider` déjà amorcé dans `vit-core`.
