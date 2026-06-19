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

Le bundler remonte un revert brut `0x7dc6505a` (les 4 octets `7d c6 50 5a` que l'UTF-8 essaie de rendre en `}\xc6PZ`). Computation des selectors des 6 errors de `VitClaimLink.sol` via `keccak256(toUtf8Bytes('Name()')).slice(0,10)` :

| Selector | Error |
|---|---|
| `0x23369fa6` | `AlreadyExists()` |
| **`0x7dc6505a`** | **`NotPending()`** ← match |
| `0xb2c3aa6b` | `NotSender()` |
| `0x203d82d8` | `Expired()` |
| `0xf86c49bc` | `WrongSecret()` |
| `0x1f2a2005` | `ZeroAmount()` |

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
