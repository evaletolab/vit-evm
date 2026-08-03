# 09 — Changelog

## UX shell — 2026-08-03

**Hub accueil, buy/sent par URL, carnet QR, profil éditable**

- Accueil : solde + devise, N contacts (meta = tél/e-mail), activité ; settings ⚙ ; recherche « Choisir un contact » seulement si carnet > N ; empty state Scanner / Connecter carnet.
- `/buy` : destinataire depuis `?to=` / `?name=` / `?c=` (chip + montant) ; sinon scan QR ; sans adresse → claim link (mail/SMS/partage) ; `vit-amount-field` gros + `xCHF`.
- `/sent` : QR de réception ou counterpart ; copy = lien ViT avec carte `c=`.
- Carnet : scan QR (topbar + CTA) pour ajouter une carte ; `upsertFromShare` — **adresse = discriminant fort** (plus de fusion e-mail/tél qui écrase une autre fiche).
- Contact share : `?add=` → ajout auto ; Google People + Microsoft Graph (OAuth popup, `ContactAccessService`).
- Profil / Réglages : édition pseudo · tél · e-mail ; Compte s’ouvre sur le **pseudo**, pas l’adresse.
- Style plat (bordures 0) ; bannière PWA auto-dismiss 30 s ; tuile mint MockZCHF visible si mode dev.

Voir [04bis — UX Wireframes](04-ux-wireframes.md) · [02 — Architecture](02-architecture.md) · [04 — UX](04-ux.md).

## V1.1 — 2026-07-27 → 2026-07-28

**Codes de secours = guardians SocialRecoveryModule**

- Remplace le kit mnémonique / second owner EOA.
- Safe mono-owner passkey ; 3 codes base32 16 car. (scrypt → EOA guardians), seuil 2/3.
- Identité locale `<nom>@3vit.ch` ; routes `/<nom>/vault` et `/<nom>/restore`.
- Armement UserOp : `enableModule` + 3 guardians ; hard restore via `multiConfirmRecovery` + `finalizeRecovery`.
- Suppression de `backup-kit.ts` (BIP39 owner).
- Banc d'essai : `packages/vit-pay-app/scripts/bench-recovery-codes.mjs`.
- Landing `/wallet` (2026-07-28) : champ nom style Argent (input aligné à droite + suffixe `@3vit.ch` grisé, hors des styles `label` de carte), « Créer mon compte » désactivé tant que le pseudo est vide, restauration en `<a routerLink>` au lieu d'un bouton (`goToRestore()` supprimé).
- 39 specs Karma vertes (`ChromeHeadlessNoSandbox`).

Voir [02 — Architecture](02-architecture.md).

## V1 — 2026-07-26

**Backup off-chain (remplacé en V1.1), claim links v2, shell produit** (journal §23)

- ~~Kit de secours mnémonique BIP39~~ → remplacé par codes guardians (V1.1).
- **`VitClaimLink` v2** : proxy UUPS, `metaHash`, `cancelExpired(id)`. Scripts deploy/upgrade. ⚠️ Contrat à redéployer.
- **Shell produit P0–P8** : accueil / carnet / envoyer / activité / profil, contacts, pending claims, `/request`, overlay tx, UI allégée.
- OpenZeppelin 5.4.0, `.env` Hardhat, exclusion `vit-welcome` des tests.

Voir [02 — Architecture](02-architecture.md) · [03 — Contracts](03-contracts.md) · [04bis — UX Wireframes](04-ux-wireframes.md).

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
