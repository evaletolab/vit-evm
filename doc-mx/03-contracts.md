# 03 — Contracts

État au 2026-06-17. Tous les contrats Solidity vivent dans `packages/vit-safe-modules/contracts/`.

## Production (Optimism mainnet)

À déployer post-MVP. Les addresses seront collées dans `environment.ts`.

## Dev (Sepolia, chainId `11155111`)

| Contrat | Address | Rôle | Déployé via |
|---|---|---|---|
| **MockZCHF** | `0x0a024786a7f6308409Dc74107e27f443f3F524B5` | ERC-20 testnet avec `mint()` ouvert pour faucet | `scripts/deployMockZchf.js` |
| **VitSafeRecoveryValidator** | (cf. console post-deploy) | Validator ERC-7579 pour `executeRecovery` côté Safe | `scripts/deploy.js` |
| **VitSafeWebAuthnValidator** | (cf. console post-deploy) | Validator ERC-7579 pour passkey P-256 | `scripts/deploy.js` |
| **VitSafePaymentGuard** | (cf. console post-deploy) | Guard ERC-7579 (limite journalière on-chain) | `scripts/deploy.js` |
| **VitClaimLink** | `0x4159090C5CbA619126cEE49d2802b0Dcee337F0e` | Hash-locked escrow ERC-20 pour envoi par URL | `scripts/deployClaimLink.js` |
| **SocialRecoveryModule** (Candide) | `0x949d01d424bE050D09C16025dd007CB59b3A8c66` | Module After-3-Minutes (variant dev) | déploiement externe |

## `VitClaimLink` — détail (nouveau, 2026-06-17)

Contrat trustless permettant d'envoyer des xCHF par URL. Le sender lock les fonds avec un hash de secret ; quiconque détient le secret peut réclamer ; le sender peut **annuler à tout moment** tant que le link est en `Pending` (y compris après expiry pour récupérer ses fonds en cas de lien perdu).

### API

- `create(bytes32 id, address token, uint128 amount, uint64 expiry, bytes32 secretHash)` — lock après `approve`. `expiry = 0` = pas d'expiration.
- `claim(bytes32 id, bytes32 secret, address recipient)` — n'importe qui avec le secret transfère au recipient. Vérifie `keccak256(abi.encode(secret)) == secretHash` et `block.timestamp <= expiry`.
- `cancel(bytes32 id)` — sender uniquement, autorisé tant que status = `Pending`.
- `getLink(bytes32 id)` — état complet `(sender, token, amount, expiry, status, secretHash)`.

### Statuts

`Pending` (0) → `Claimed` (1) ou `Cancelled` (2). Aucune transition réversible.

### Errors custom

`AlreadyExists`, `NotPending`, `NotSender`, `Expired`, `WrongSecret`, `ZeroAmount`. Selectors décodés dans [06 — Debug log](06-debug-log.md#claim-link-notpending).

### Sécurité

- `ReentrancyGuard` sur create/claim/cancel.
- `SafeERC20` pour les transferts (tolère les tokens non-conformes).
- Le secret est révélé on-chain au claim — c'est attendu : le link doit transiter off-chain par un canal de confiance (chat chiffré, NFC, QR), tout comme une crypto-address copier-collée.
- Pas de fee, pas d'owner, pas d'upgrade — contrat immuable et neutre.

### Tests

`test/Vit.ClaimLink.js` : 12 specs (create, double-claim, wrong-secret, expiry, cancel par sender et par non-sender, cancel après expiry). 12/12 passants.

### Wiring frontend (`packages/vit-pay-app`)

- `wallet.service.ts` : `createClaimLink` (approve + create en 1 UserOp sponsorisé), `claimClaimLink`, `cancelClaimLink`, `readClaimLink`.
- `claimlink/claimlink.service.ts` : génère `id`+`secret` aléatoires (32 bytes chacun), construit URL `/claim?id=&s=`, stocke metadata locale en `vit-claimlinks:<address>`.
- Pages : `/links` (liste + create + cancel) et `/claim?id=&s=` (destinataire, vérifie le hash localement avant tx).

### Limite UX connue

Si l'utilisateur perd la liste localStorage (cache wipe), il perd la traçabilité de ses links — mais peut toujours `cancel(id)` s'il a noté l'ID, et le contrat reste source de vérité via `getLink(id)`.
