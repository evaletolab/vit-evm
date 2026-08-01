# 02 — Architecture

État au 2026-07-27.

## Stack

Angular 18 + abstractionkit 0.3.8 (Safe Account v1.4.1, EntryPoint v0.7, ERC-4337) + WebAuthn P-256 + Candide bundler/paymaster.

## Isolation

Tout `abstractionkit` est confiné à `wallet.service.ts` + `lib/userOp.ts` (vérifié par grep). Les components Angular n'appellent que `WalletService`.

## Sauvegarde & recovery — codes guardians (V1.1)

**Décision** : pas de Horcrux on-chain, **pas** de second owner EOA / mnémonique. Le Safe est **mono-owner passkey**. La recovery utilise le `SocialRecoveryModule` Candide : **3 codes de secours = 3 guardians**, seuil **2 sur 3**.

**Codes** (`app/wallet/recovery-codes.ts`) :

| Propriété | Valeur |
|---|---|
| Format | base32 Crockford, 16 car. `XXXX-XXXX-XXXX-XXXX` (75 bits + checksum 5 bits) |
| Dérivation | `scrypt(N=2^16, r=8, p=1)` → secp256k1, sel `sha256("vit-recovery-v{n}\|safe\|index")` |
| Version KDF | octet `v` dans la charge utile ; repli documenté `N=2^15` |
| Stockage | jamais en localStorage — coffre (`credentials.store` / formulaire) ou QR |

**Identité** `<nom>@3vit.ch` (`wallet-name.ts`) : locale en V1 (pas de registre). Sert d'URL (`/<nom>/vault`, `/<nom>/restore`) et d'`id` du coffre. L'adresse Safe voyage dans la charge utile du code (`resolveWalletAddress`).

**Flux** :

1. Landing création → passkey → `/<nom>/vault`
2. Génération 3 codes → destinations (défaut 1 coffre + 2 QR) → UserOp `enableModule` + 3× `addGuardianWithThreshold(2)`
3. Soft restore : code 1 (métadonnées passkey) + passkey sync
4. Hard restore : 2 codes → EIP-712 → `multiConfirmRecovery(execute)` → délai → `finalizeRecovery` (via Safe temporaire sponsorisé)
5. Rotation post-restore + `cancelRecovery` pendant le délai (UI `/recovery`)

⚠️ **Délai de grâce** : `After3Minutes` (dev). Basculer `After3Days` avant prod. Sans notification owner, `cancelRecovery` est théorique.

## Modules front

- `wallet/recovery-codes.ts` — encodage / KDF / coffre / QR.
- `wallet/wallet-name.ts` — validateur + mots réservés.
- `pages/page-vault`, `pages/page-restore` — UX codes.
- `wallet/tx-overlay.*` — overlay plein écran UserOp.
- `claimlink/*`, `contacts/*`, `shared/base64url.ts` — inchangés (Wave B).

## Garde-fous UX

- Préflight anti-scam dans `sendZchfPayment`.
- Debug UserOperation (mode dev).
- Limite journalière client `maxDailyZchfAmount`.

## Sécurité

- Aucun secret en localStorage (`privateKey` / `mnemonic` / `seed` / `shares` / codes).
- Un guardian ne peut **jamais** dépenser — seulement proposer un changement d'owner.
- Subvention Candide obligatoire pour les UserOps du Safe utilisateur.
- Hard restore : gas via Safe temporaire sponsorisé (nouvelle passkey).

## Tests

- Front : specs Karma — utils, storage, recovery-codes, wallet-name, claim-contact.
- Contrats : Hardhat dans `vit-safe-modules` (suites legacy encore bruyantes).

## Dette résiduelle

- Registre de noms on-chain (V2) pour unicité + payer `alice@3vit.ch`.
- Notification pendant le délai de grâce (V2).
- Bascule module `After3Days` avant production (P0).
- Domaine dédié définitif (RP ID passkeys + origine coffre).
