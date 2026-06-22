# 09 — Changelog

## Itération 0.4 — 2026-06-19

**UX, dev-gate, on/off-ramp Mt Pelerin**

- Guard wallet (`requireWalletGuard`) appliqué sur toutes les routes sauf `/wallet` et `/claim` → bloque l'utilisateur sur la page Carte tant qu'aucun wallet.
- `ThemeService` + 5 presets de couleurs (Lumen, Sunset, Forêt, Océan, Mono) ; 5 sliders visibles dans Profil → Réglages (Fond droit / Fond gauche / Texte / Bouton gauche / Bouton droit) + gradients régénérés dynamiquement.
- Toggle « Mode dev » qui gate la carte « Recevoir » + les 4 blocs `<details class="debug">` sur `/wallet`.
- Nouvelle route `/iban` + tuile sur Profil — wizard 4 étapes (Préparer / KYC / Saisir / Fini) avec validation mod-97 ISO 13616.
- Holo-card du wallet : nouvelle ligne IBAN qui affiche l'IBAN formaté ou un lien « Configurer → ».
- Bug claim link cancel : decode du selector `0x7dc6505a = NotPending()`, preflight on-chain + `refreshStatuses()` parallel.

Voir [04 — UX](04-ux.md) · [05 — Intégration Mt Pelerin](05-integrations-mtpelerin.md) · [06 — Debug log](06-debug-log.md).

## Itération 0.3 — 2026-06-11

**Limite journalière côté client**

- `WalletConfig.maxDailyZchfAmount?: bigint` (1000 ZCHF en dev).
- Tracker `dailySpending: { date, spentWei }` dans `StoredWallet`, reset à minuit local.
- `sendZchfPayment` check avant signature et incrémente après succès uniquement.
- Garde-fou UX, pas une protection on-chain (vidable via localStorage).

Voir journal §19.

## Itération 0.2 — 2026-06-10

**Préflight + page debug**

- Préflight anti-scam câblé dans `sendZchfPayment` (allow/warn/block).
- Page debug `UserOperationDebug` collapsible (4 sections, copier JSON).
- F4 flow `addOwnerByAddress` (variante simple sans QR).
- Cache `recoveryRequestCache` dans `StoredWallet` pour UX instant.

Voir journal §18.

## Itération 0.1 (MVP de base) — 2026-06-05 → 2026-06-11

**F1-F5 livrés**

- F1 — créer wallet via passkey.
- F2 — recevoir ZCHF test (faucet MockZCHF).
- F3 — paiement sponsorisé.
- F4 — ajouter device (option A passkey locale).
- F5 — activer recovery.
- F6 — restaurer wallet : ⚠️ partiel.

**Fixes WebAuthn AA24** : Fix 3 (override 5 addresses canoniques) + Fix 4 (`userVerification: 'required'`). Voir [06 — Debug log](06-debug-log.md).
