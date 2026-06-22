# 02 — Architecture

## Stack

Angular 18 + abstractionkit 0.3.8 (Safe Account v1.4.1, EntryPoint v0.7, ERC-4337) + WebAuthn P-256 + Candide bundler/paymaster.

## Isolation

Tout `abstractionkit` est confiné à `wallet.service.ts` + `lib/userOp.ts` (vérifié par grep). Les components Angular n'appellent que `WalletService`.

## Plumberie résolue

- Workspace npm pointait sur `file:../karibou-web3` (chemin mort) → fixé à `"*"`.
- Barrel `kng2-web3` tire `@safe-global/protocol-kit` browser-incompatible → utiliser subpath `kng2-web3/preflight`.

## Garde-fous UX

- **Préflight anti-scam** câblé dans `sendZchfPayment` (iter 0.2, journal §18.2).
- **Page debug UserOperation** collapsible (4 sections, copier JSON) — outil principal de diagnostic en prod (iter 0.2 §18.1). Gaté derrière le mode dev en iter 0.4.
- **Limite journalière** `maxDailyZchfAmount` (1000 ZCHF en dev), reset à minuit local, check avant signature + increment après succès UserOp (iter 0.3 §19).

## Sécurité contractuelle

- Aucun secret stocké en localStorage (`privateKey` / `mnemonic` / `seed` / `shares` interdits, validation runtime via `WalletStorageService.isStoredWallet`).
- Subvention obligatoire (pas de fallback ETH) — erreur explicite « Transaction non sponsorisée » via `mapPaymasterError`.
- Recovery par rotation d'owners (pas de seed phrase à restaurer).

## Dette résiduelle

**Itération 0.4 (journal §11)** :
- F4 « ajout depuis appareil cible » avec QR + signature distante (M).
- Migration `relay-kit` Safe officiel pour découpler de `abstractionkit` (L).
- Suppression des démos historiques `vit-mint/` + `vit-passkey/` (S).
- Tests E2E Cypress / Playwright (L) — actuellement aucun test automatisé, validation 100 % manuelle.

**Découvertes E2E récentes** :
- Le bouton « Activer / mettre à jour » devient cliquable seulement après hard reload — Angular ne rebind pas le handler après HMR sur changement d'env (bug mineur de DX).
- `ethers.isAddress` rejette les checksums EIP-55 invalides silencieusement (UX guardian).
- Dépendance grace period `SocialRecoveryModule` : After3Days par défaut bloque tout test E2E session, nécessite switch vers After3Minutes + re-activation propre.

## Voir aussi

- [03 — Contracts](03-contracts.md) — adresses déployées
- [06 — Debug log](06-debug-log.md) — fixes WebAuthn AA24 (Fix 3 & 4)
- [07 — Découpler Candide](07-paymaster-decoupling.md) — plan de découplage
- [08 — Dead code](08-dead-code.md) — cleanup `vit-core` + `vit-safe-modules`
