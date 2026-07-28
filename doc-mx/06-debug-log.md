# 06 — Debug log

Bugs résolus avec la méthode skill `debug` (5-Whys + hypothèses rankées + commit-then-instrument).

## WebAuthn / AA24 — Fix 3 (journal §17)

**Symptôme** : UserOp rejeté avec `AA24 signature error` côté EntryPoint.

**Cause racine** : abstractionkit pointe par défaut sur sa copie non-canonique du `SafeWebAuthnSharedSigner` (`0xfD90FAd3…`), différente des adresses Safe officielles v0.2.1.

**Fix** : override des 5 adresses webauthn vers `SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_*` (canoniques v0.2.1, addresses Safe officielles), dans `wallet.service.ts`.

## WebAuthn / AA24 — Fix 4 (journal §20)

**Symptôme** : AA24 réapparaît sur Windows Hello (PIN sans biométrie), après le Fix 3.

**Diagnostic** : `navigator.credentials.get()` appelé sans `userVerification: 'required'` → flags `UV=0` dans `authenticatorData` → le SharedSigner canonique v0.2.1 exige `AUTH_FLAG_MASK = 0x05` (UP | UV) → revert silencieux on-chain → AA24.

**Debug pattern** : flags WebAuthn = byte 32 de `authenticatorData` ; UV bit = `0x04`.

**Fix** : ajout `userVerification: 'required'` à `credentials.get` dans `lib/userOp.ts` + assert de détection précoce.

**UserOp mint inclus** : `0xfd9caba170749b8327538bd96eaf410664b38643669a65062475add11c0c8770` sur Sepolia.

## Claim link cancel — `NotPending()` {#claim-link-notpending}

**Symptôme** : `eth_estimateUserOperationGas rpc call failed → b'}\xc6PZ'`

**Diagnostic** — décodage du selector :

Le bundler remonte un revert brut `0x7dc6505a` (les 4 octets `7d c6 50 5a` que l'UTF-8 essaie de rendre en `}\xc6PZ`). Computation des selectors des errors de `VitClaimLink.sol` via `keccak256(toUtf8Bytes('Name()')).slice(0,10)` (table complétée en V1 avec les 2 errors v2) :

| Selector | Error |
|---|---|
| `0x23369fa6` | `AlreadyExists()` |
| **`0x7dc6505a`** | **`NotPending()`** ← match |
| `0xb2c3aa6b` | `NotSender()` |
| `0x203d82d8` | `Expired()` |
| `0xd0404f85` | `NotExpired()` (v2) |
| `0xf86c49bc` | `WrongSecret()` |
| `0x1f2a2005` | `ZeroAmount()` |
| `0x5ad37c19` | `MetaMismatch()` (v2) |

`VitClaimLink.cancel()` revert `NotPending()` quand `links[id].status != Pending`. Vu l'enum `{ Pending, Claimed, Cancelled }`, ça veut dire que le lien était **déjà claimed ou cancelled on-chain**, mais le cache `localStorage['vit-claimlinks:<owner>']` le voyait encore `pending` → bouton « Annuler » actif → UserOp envoyé → revert au gas estimation → message bundler cryptique.

**Cause racine** : pas de sync entre l'état localStorage et l'état on-chain — un destinataire a pu claimer le lien sans que l'app du sender en soit informée.

**Fix en 2 endroits** :

1. `ClaimLinkService.cancel(id)` — preflight on-chain :
   - `wallet.readClaimLink(addr, id)` AVANT le UserOp.
   - status === 1 (Claimed) → `updateStatus(owner, id, 'claimed')` + throw « Ce lien a déjà été réclamé par le destinataire ».
   - status === 2 (Cancelled) → `updateStatus(owner, id, 'cancelled')` + throw « Ce lien est déjà annulé ».
   - status === 0 (Pending) → cancel UserOp normal.
   - Économise un appel bundler + UX explicite + resync cache.

2. `ClaimLinkService.refreshStatuses(owner)` — sync globale :
   - Lit en parallèle (`Promise.all`) tous les liens marqués `pending` localement.
   - Met à jour le cache pour chacun selon son status on-chain.
   - Tolère les erreurs réseau (try/catch silencieux) — un glitch RPC ne corrompt pas le cache.
   - Retourne la liste rafraîchie.

**Câblage UI** (`page-links`) :
- `ngOnInit` : `list()` immédiat → render cache, puis `refreshStatuses()` en background → re-render quand l'on-chain répond (UX instant, sans bloquer).
- `cancelLink` catch : `this.links = this.cl.list(this.owner)` pour refléter la status updatée par le preflight.
- Bouton **↻ refresh** ajouté dans la topbar de la liste pour resync manuel à la demande.
- V1 : le refresh **n'annule plus automatiquement** les liens expirés au chargement de la page — ça déclenchait une demande de passkey non sollicitée. L'annulation reste une action explicite.

## Compilation contrats — `HH404 ReentrancyGuardUpgradeable.sol not found` (V1)

**Symptôme** : après un `npm install` dans `packages/vit-safe-modules`, plus rien ne compile :

```
Error HH404: File @openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol,
imported from contracts/VitClaimLink.sol, not found.
```

**Cause racine — deux effets combinés** :

1. `vit-safe-modules` est un workspace npm de la racine, mais possède aussi son propre `package-lock.json`. Avec `"@openzeppelin/contracts-upgradeable": "^5.0.2"`, npm a jugé le 5.6.1 de la racine satisfaisant et a **vidé la copie locale** en 5.0.2 qui shadowait jusque-là.
2. **OZ 5.5 a supprimé `ReentrancyGuardUpgradeable`** : le `ReentrancyGuard` standard utilise un slot ERC-7201 fixe, est annoté `@custom:stateless` et devient donc proxy-safe. Dernière version qui embarque encore le variant upgradeable : **5.4.0**.

**Fausse piste** : migrer vers le `ReentrancyGuard` standard. `@openzeppelin/hardhat-upgrades` 3.9.1 (upgrades-core 1.46.0) ne connaît pas l'annotation `@custom:stateless` — aucune occurrence de « stateless » dans son code — et rejette le déploiement : *« Contract ReentrancyGuard has a constructor / Define an initializer instead »*.

**Fix** : pin **exact** `"5.4.0"` sur `@openzeppelin/contracts` et `@openzeppelin/contracts-upgradeable` dans `packages/vit-safe-modules/package.json`. Un pin exact ne peut pas être dédupliqué vers le 5.6.1 de la racine, ce qui force l'installation locale et rend le build reproductible.

**À retenir** : dans ce monorepo, une plage `^` sur une dépendance de contrats est un piège — le prochain `npm install` à la racine peut changer la version effective sans toucher au package.

## Déploiement — pas de `.env` chargé par Hardhat (V1)

`hardhat.config.js` lisait `process.env.PRIVATE_KEY` sans jamais charger de fichier. Contrairement aux scripts Node du repo (qui utilisent `node --env-file=.env`), Hardhat n'a pas d'équivalent natif. Ajout de `require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })` en tête de config — chemin absolu pour que ça marche aussi quand hardhat est lancé depuis la racine du monorepo.
