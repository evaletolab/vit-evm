# 03 — Contracts

État au 2026-07-26. Tous les contrats Solidity vivent dans `packages/vit-safe-modules/contracts/`.

## Toolchain

- Solidity `0.8.24`, Hardhat 2.22, `@openzeppelin/hardhat-upgrades` 3.x.
- **OpenZeppelin pinné sur `5.4.0` exact** (`contracts` + `contracts-upgradeable`). OZ 5.5 a supprimé `ReentrancyGuardUpgradeable` au profit du `ReentrancyGuard` standard marqué `@custom:stateless` — annotation que `hardhat-upgrades` 3.x ne reconnaît pas encore (« Contract ReentrancyGuard has a constructor »). Monter de version impose donc d'attendre le support côté plugin. Le pin exact force aussi une install locale que les `npm install` à la racine du monorepo ne peuvent pas déduper.
- Secrets de déploiement : `packages/vit-safe-modules/.env` (gabarit `.env.example`, chargé par `hardhat.config.js`, ignoré par git).

## Production (Optimism mainnet)

À déployer post-MVP. Les addresses seront collées dans `environment.ts`.

## Dev (Sepolia, chainId `11155111`)

| Contrat | Address | Rôle | Déployé via |
|---|---|---|---|
| **MockZCHF** | `0x0a024786a7f6308409Dc74107e27f443f3F524B5` | ERC-20 testnet avec `mint()` ouvert pour faucet | `scripts/deployMockZchf.js` |
| **VitSafeRecoveryValidator** | (cf. console post-deploy) | Validator ERC-7579 pour `executeRecovery` côté Safe | `scripts/deploy.js` |
| **VitSafeWebAuthnValidator** | (cf. console post-deploy) | Validator ERC-7579 pour passkey P-256 | `scripts/deploy.js` |
| **VitSafePaymentGuard** | (cf. console post-deploy) | Guard ERC-7579 (limite journalière on-chain) | `scripts/deploy.js` |
| **VitClaimLink (v2 UUPS)** | ⚠️ à redéployer — coller le proxy dans `environment.ts` | Hash-locked escrow ERC-20 pour envoi par URL | `scripts/deployClaimLink.js` |
| ~~VitClaimLink (v1)~~ | ~~`0x4159090C5CbA619126cEE49d2802b0Dcee337F0e`~~ | **Abandonné** — version non-upgradeable, ABI incompatible v2 (`create` à 5 args, `getLink` à 6 champs) | — |
| **SocialRecoveryModule** (Candide) | `0x949d01d424bE050D09C16025dd007CB59b3A8c66` | Module After-3-Minutes (variant dev) | déploiement externe |

## `VitClaimLink` v2 — détail (UUPS, 2026-07-26)

Contrat permettant d'envoyer des ZCHF par URL. Le sender lock les fonds avec un hash de secret ; quiconque détient le secret peut réclamer ; le sender peut **annuler tant que le link est en `Pending`** (y compris après expiry pour récupérer ses fonds en cas de lien perdu).

Deux ajouts par rapport à v1 : le `metaHash` (intégrité du contact transporté dans l'URL) et `cancelExpired` (n'importe qui peut rembourser un lien périmé, les fonds retournant toujours au sender).

### API

- `initialize(address owner_)` — appelée une fois par le proxy. L'owner ne sert **qu'aux upgrades**.
- `create(bytes32 id, address token, uint128 amount, uint64 expiry, bytes32 secretHash, bytes32 metaHash)` — lock après `approve`. `expiry = 0` = pas d'expiration, `metaHash = 0` = pas de contact attaché.
- `claim(bytes32 id, bytes32 secret, address recipient, bytes32 expectedMetaHash)` — n'importe qui avec le secret transfère au recipient. Vérifie `keccak256(abi.encode(secret)) == secretHash`, `block.timestamp <= expiry`, et `expectedMetaHash == metaHash` quand ce dernier est non nul.
- `cancel(bytes32 id)` — sender uniquement, tant que status = `Pending`.
- `cancelExpired(bytes32 id)` — **permissionless**, seulement si `expiry != 0 && block.timestamp > expiry`. Rembourse le sender d'origine, jamais l'appelant.
- `getLink(bytes32 id)` — état complet `(sender, token, amount, expiry, status, secretHash, metaHash)`.

### Statuts

`Pending` (0) → `Claimed` (1) ou `Cancelled` (2). Aucune transition réversible.

### Errors custom

`AlreadyExists`, `NotPending`, `NotSender`, `Expired`, `NotExpired`, `WrongSecret`, `ZeroAmount`, `MetaMismatch`. Selectors décodés dans [06 — Debug log](06-debug-log.md#claim-link-notpending).

### `metaHash` — intégrité du contact

Le lien de claim peut embarquer le contact de l'émetteur (pseudo / tél / e-mail) dans le **fragment** de l'URL (`#/claim?id=&s=&c=<base64url>`), donc jamais transmis au serveur. `metaHash = keccak256(utf8(<base64url>))` est stocké on-chain, et le claim le revérifie : un lien dont le `c=` a été altéré en transit révèle `MetaMismatch` **avant** que le destinataire n'accepte les fonds.

Conséquence côté app : c'est la chaîne encodée d'origine (`contactEncoded`) qui doit être réutilisée telle quelle pour reconstruire l'URL. Ré-encoder un payload décodé peut changer un octet et faire échouer le claim.

### Sécurité

- `ReentrancyGuardUpgradeable` sur create/claim/cancel/cancelExpired.
- `SafeERC20` pour les transferts (tolère les tokens non-conformes).
- `_disableInitializers()` dans le constructeur de l'implémentation.
- Le secret est révélé on-chain au claim — c'est attendu : le link doit transiter off-chain par un canal de confiance (chat chiffré, NFC, QR), tout comme une crypto-address copier-collée.
- ⚠️ **Compromis assumé du passage en UUPS** : le contrat n'est plus immuable. L'owner du proxy peut remplacer l'implémentation et donc, en théorie, drainer les escrows en cours. Voir [10 — Audit sécurité, P0-4](10-security-audit.md#p0-4--vitclaimlink-est-devenu-upgradeable) pour les mitigations exigées avant mainnet (multisig + timelock).

### Déploiement

```bash
cd packages/vit-safe-modules
cp .env.example .env            # remplir PRIVATE_KEY (compte financé en ETH testnet)
npx hardhat run scripts/deployClaimLink.js --network sepolia
```

Le compte `PRIVATE_KEY` paie le gas **et** devient owner du proxy via `initialize(deployer.address)` : c'est la seule clé capable d'autoriser un upgrade, à conserver. Reporter ensuite l'adresse du proxy dans `claimLinkAddress` (`environment.ts` + `environment.development.ts`) et dans le tableau ci-dessus.

Upgrade ultérieur : `CLAIMLINK_PROXY=0x… npx hardhat run scripts/upgradeClaimLink.js --network sepolia`.

### Tests

- `test/VitClaimLink.js` : 4 specs v2 (claim avec `metaHash` conforme, revert sur mismatch, `cancelExpired` après expiry, revert `NotExpired` avant). 4/4 passants.
- `test/Vit.ClaimLink.js` : **suite v1 obsolète** (12 specs écrits pour `create` à 5 args) — échoue sur la nouvelle ABI, à réécrire ou supprimer.

### Wiring frontend (`packages/vit-pay-app`)

- `wallet.service.ts` : `createClaimLink` (approve + create en 1 UserOp sponsorisé), `claimClaimLink`, `cancelClaimLink`, `readClaimLink`.
- `claimlink/claimlink.service.ts` : génère `id`+`secret` aléatoires (32 bytes chacun), construit l'URL **avant** la tx (une URL invalide ne doit pas laisser des fonds bloqués en escrow), stocke la metadata locale en `vit-claimlinks:<address>`.
- `claimlink/claim-contact.ts` : encode/décode le payload contact + calcule le `metaHash`.
- `claimlink/pending-claims.ts` : file `vit-pending-claims` — un lien ouvert sans wallet est mis en attente, puis rejoué après création du wallet.
- Pages : `/links` (liste + create + cancel), `/claim?id=&s=&c=` (destinataire, vérifie le hash localement avant tx), `/request` (demande de paiement inversée, génère un lien `/buy?to=&amount=`).

### Limite UX connue

Si l'utilisateur perd la liste localStorage (cache wipe), il perd la traçabilité de ses links — mais peut toujours `cancel(id)` s'il a noté l'ID, et le contrat reste source de vérité via `getLink(id)`.
