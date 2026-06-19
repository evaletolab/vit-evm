# 01 — Overview

## Couverture du spec `packages/VIT-MVP-0.1.tmp.md`

| Feature spec | Livré | API `WalletService` | Validation E2E |
|---|---|---|---|
| **F1** — Créer wallet via passkey | ✅ | `createWalletWithPasskey()` | Wallet créé sur Sepolia, adresse stable post-refresh |
| **F2** — Recevoir ZCHF test | ✅ (+ faucet UI) | `mintTestZchf(amount)` + `getZchfBalance()` | Mint 100 ZCHF inclus (tx `0xfd9caba1…0c8770`) |
| **F3** — Paiement sponsorisé | ✅ | `sendZchfPayment(to, amount)` | Tx burner incluse, solde décrémenté, limite journalière trackée |
| **F4** — Ajouter device | ⚠️ partiel | `addDeviceWithPasskey()` (option A) + `addOwnerByAddress(addr)` (option B §18.3) | Option B validée (vitalik ajouté comme co-owner). Pas testé : signature distante via QR (iter 0.4) |
| **F5** — Activer recovery | ✅ | `enableRecovery(guardians, threshold)` | Module After3Days activé, guardian Hardhat#0 ajouté |
| **F6** — Restaurer wallet | ⚠️ partiel | `startRecovery()` / `getRecoveryRequest()` / `finalizeRecovery()` | **En cours** — bloqué sur identification du Safe address actuel + grace period 3 jours côté After3Days |

## Résumé exécutif

MVP fonctionnel **F1-F5 validé E2E**, F6 en cours. Dépendance Candide totale mais découplable en ~1-2 sprints via le `PaymasterProvider` déjà amorcé dans `vit-core` — voir [07 — Découpler Candide](07-paymaster-decoupling.md).

Travaux UX (iter 0.4) : guard wallet, thème dynamique avec presets, mode dev gating, intégration Mt Pelerin pour on/off-ramp xCHF, fix UX claim link cancel — voir [04 — UX](04-ux.md), [05 — Intégration Mt Pelerin](05-integrations-mtpelerin.md), [09 — Changelog](09-changelog.md).
