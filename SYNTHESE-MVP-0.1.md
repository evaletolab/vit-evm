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

**Résumé exécutif** : MVP fonctionnel F1-F5 validé E2E, F6 en cours, dépendance Candide totale mais découplable en ~1-2 sprints via le `PaymasterProvider` déjà amorcé dans `vit-core`.
