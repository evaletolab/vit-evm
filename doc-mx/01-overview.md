# 01 — Overview

## Couverture du spec `packages/VIT-MVP-0.1.tmp.md`

| Feature spec | Livré | API `WalletService` | Validation E2E |
|---|---|---|---|
| **F1** — Créer wallet via passkey | ✅ | `createWalletWithPasskey()` | Wallet créé sur Sepolia, adresse stable post-refresh |
| **F2** — Recevoir ZCHF test | ✅ (+ faucet UI) | `mintTestZchf(amount)` + `getZchfBalance()` | Mint 100 ZCHF inclus (tx `0xfd9caba1…0c8770`) |
| **F3** — Paiement sponsorisé | ✅ | `sendZchfPayment(to, amount)` | Tx burner incluse, solde décrémenté, limite journalière trackée |
| **F4** — Ajouter device | ⚠️ partiel | `addDeviceWithPasskey()` (option A) + `addOwnerByAddress(addr)` (option B §18.3) | Option B validée (vitalik ajouté comme co-owner). Pas testé : signature distante via QR (iter 0.4) |
| **F5** — Activer recovery | ✅ | `enableRecovery(guardians, threshold)` | Module After3Days activé, guardian Hardhat#0 ajouté |
| **F6** — Restaurer wallet | ✅ V1.1 | Soft : `importFromCodePayload` · Hard : `restoreWithRecoveryCodes` (2 codes → multiConfirm + finalize) · Rotation : `rotateRecoveryGuardians` | E2E Sepolia à valider (After3Minutes) |

## Résumé exécutif

MVP fonctionnel **F1-F5**, F6 via **codes de secours guardians** (V1.1). Dépendance Candide découplable — voir [07 — Découpler Candide](07-paymaster-decoupling.md).

Travaux UX (iter 0.4) : guard wallet, thème, mode dev, Mt Pelerin — voir [04 — UX](04-ux.md), [05 — Intégration Mt Pelerin](05-integrations-mtpelerin.md), [09 — Changelog](09-changelog.md).

## V1.1 — codes guardians + identité (2026-07-27)

- 3 codes base32 → SocialRecoveryModule (seuil 2/3), Safe mono-owner passkey — [02 — Architecture](02-architecture.md).
- Identité `<nom>@vit.app`, routes `/vault` et `/restore`.
- `VitClaimLink` v2 UUPS toujours à redéployer — [03 — Contracts](03-contracts.md).
- Shell P0–P8 inchangé — [04bis — UX Wireframes](04-ux-wireframes.md).
