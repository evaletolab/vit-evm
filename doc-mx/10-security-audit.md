# 10 — Audit sécurité

Snapshot 2026-06-19. Réagrège l'audit du `CLAUDE.md` (2026-06-11) + nouvelles trouvailles iter 0.4. **Mise à jour : les 2 P0 sont corrigés.**

## 🔴 P0 — bloquant / risque grave

### P0-3 · Contract `VitPayment` — surface admin upgradeable + pausable

**Déclaration** :

```solidity
contract VitPayment is
    UUPSUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
```

**Analyse des héritages** :

| Mixin | Pouvoir conféré | Risque |
|---|---|---|
| `UUPSUpgradeable` | L'owner peut remplacer l'implémentation à tout moment via `_authorizeUpgrade`. | Owner compromis → upgrade vers un contrat malicieux → **drainage total de tous les fonds en custody**. |
| `OwnableUpgradeable` | Owner unique (initialement le déployeur). | Si EOA → SPOF complet. Pas de timelock par défaut. |
| `AccessControlUpgradeable` | Rôles RBAC (`DEFAULT_ADMIN_ROLE` + rôles métiers). | Si `DEFAULT_ADMIN_ROLE` n'est pas multisig, équivalent à Ownable. Cumul de rôles à auditer. |
| `PausableUpgradeable` | `pause()` bloque toute interaction utilisateur. | Censure-by-design — vit-evm peut geler n'importe quel paiement. |
| `ReentrancyGuardUpgradeable` | Protection technique standard. | ✅ OK (sain). |

**Pourquoi P0** : cette architecture est l'**opposé** du contrat trustless `VitClaimLink` (immuable, neutre, sans owner, cf. [03 — Contracts](03-contracts.md)). Une seule clé compromise (multisig mal configuré, fuite de seed, employé hostile) permet le pillage de tous les utilisateurs. C'est le mode de défaillance #1 des protocoles Solidity en 2023-2025 (Ronin, Multichain, Euler avec key compromise, etc.).

**Mitigations obligatoires avant tout déploiement mainnet** :

| # | Mitigation | Effort |
|---|---|---|
| 1 | Owner = **Safe multisig** à minimum 3-of-5 (idéalement 4-of-7 avec membres externes) | S |
| 2 | **Timelock** OpenZeppelin (24-48h min) sur `_authorizeUpgrade` + transferOwnership + grantRole(DEFAULT_ADMIN_ROLE) | M |
| 3 | `_authorizeUpgrade(address)` restreint à un rôle dédié `UPGRADER_ROLE` ≠ `DEFAULT_ADMIN_ROLE` | S |
| 4 | `PAUSER_ROLE` séparé du multisig admin, attribué à un EOA hot opérationnel pour réagir vite — mais révocable par le multisig | S |
| 5 | Pause **par fonction** (`whenNotPaused` ciblé) plutôt que pause globale ; éviter `_pause()` qui gèle tout | M |
| 6 | `_disableInitializers()` appelé dans le **constructeur de l'implémentation** (évite la prise de contrôle de l'implementation contract elle-même — attaque classique) | S |
| 7 | **Storage gaps** (`uint256[50] private __gap`) à la fin de chaque contrat héritable pour permettre l'ajout de variables sans collision en upgrade | S |
| 8 | Tests **end-to-end d'upgrade** : déployer V1, écrire du state, upgrade V2, vérifier que tout le state est préservé (utiliser `@openzeppelin/upgrades-core` + `validateUpgrade`) | M |
| 9 | **Plan de renoncement** : prévoir `renounceOwnership()` + `renounceRole(DEFAULT_ADMIN_ROLE, ...)` une fois le protocole stabilisé pour rendre le contrat immuable à terme | S |
| 10 | Audit externe par cabinet réputé (ChainSecurity / OpenZeppelin / Trail of Bits) **avant** déploiement de fonds réels | L |

**Checklist de revue de code** :

- [ ] `_authorizeUpgrade(address newImpl)` n'est pas `onlyOwner` mais `onlyRole(UPGRADER_ROLE)` + via timelock
- [ ] Le constructeur de l'implémentation appelle `_disableInitializers()`
- [ ] L'`initialize()` est `initializer` et non `reinitializer` (sauf si V2+ ajoute du state via `reinitializer(2)`)
- [ ] Tous les héritables ont un `__gap[]` à la fin
- [ ] Aucune fonction ne combine `onlyRole(DEFAULT_ADMIN_ROLE)` + transfert direct de fonds (split obligatoire)
- [ ] `_grantRole` initial dans `initialize()` accorde `DEFAULT_ADMIN_ROLE` au multisig, pas au déployeur
- [ ] Évènements `Upgraded(implementation)` + `Paused(account)` + `Unpaused(account)` indexés pour monitoring

**Impact FINMA** : voir [11 — Audit FINMA §1 « Lignes rouges »](11-finma-audit.md#lignes-rouges-à-ne-pas-franchir). Un contrat upgradeable + pausable qui touche les fonds utilisateurs **peut être qualifié de custody effective** (vit-evm a le pouvoir technique de geler ou détourner les fonds, même s'il ne l'utilise pas) → bascule potentielle sous **LBA / licence FINMA**. Mitigations 1+2+9 (multisig + timelock + plan de renoncement) sont des **pré-requis réglementaires**, pas seulement techniques.

## ✅ P0 corrigés

### P0-1 · Private key hardcodée — **CORRIGÉ**

- **Fichier** : `packages/vit-pay-app/scripts/guardian-trigger-recovery.mjs`
- **État** : la PK est lue via `process.env.GUARDIAN_PK` (chargée par `node --env-file=.env`). Le script `exit(1)` avec message clair si la var est absente.
- **Gitignore** racine : `.env`, `.env.local`, `.env.*.local` listés.
- **`.env.example`** présent dans `packages/vit-pay-app/` pour documenter la var requise.
- **Reste à faire** (non bloquant) : `git filter-repo` pour purger l'historique git de toute trace de PK ancienne, à programmer sur une fenêtre de maintenance.

### P0-2 · localStorage non chiffré — **CORRIGÉ**

- **Fichier** : `app/wallet/wallet-storage.service.ts`
- **Avant** : `credentialId` + coordonnées pubkey stockés en clair dans `localStorage['vit-wallet']`. Toute XSS pouvait lire le blob et invoquer WebAuthn.
- **Fix appliqué** :
  - **Clé AES-GCM 256 non-extractable** générée à la 1ère ouverture, stockée dans **IndexedDB** (`vit-keystore` → store `keys`, id `wallet`). Non-extractable = la clé brute ne peut pas être exfiltrée (l'attaquant peut appeler `decrypt()` mais ne peut pas dumper la clé pour un usage offline ou cross-origin).
  - **Blob chiffré** stocké dans `localStorage['vit-wallet-v2']` au format `{ v: 2, iv: hex, ct: hex }` — IV 12 bytes random à chaque save.
  - **Migration auto** : au boot, si `vit-wallet-v2` absent mais `vit-wallet` (legacy plaintext) présent → décrypte legacy, re-encrypte en v2, supprime legacy.
  - **Fallback dégradé** : si `crypto.subtle` ou IndexedDB indisponibles (mode privé restrictif, vieux browser), bascule sur localStorage plaintext pour ne pas bricker l'app.
- **API préservée** : `load()` / `save()` / `clear()` restent synchrones (cache en mémoire). L'init async (génération clé + déchiffrement initial) tourne via `APP_INITIALIZER` dans `app.module.ts` — bloque le bootstrap Angular jusqu'à ce que le cache mémoire soit prêt, donc le guard wallet + les call-sites sync de `WalletService` ne voient aucun changement.
- **Risque résiduel (en-page XSS)** : un XSS exécuté dans l'origine peut quand même appeler `service.load()` et lire le plaintext en mémoire, ou appeler `decrypt()` via IDB. Le seul fix complet est **CSP stricte** (`script-src 'self'` + suppression de tout inline) — à durcir en P1 dans `index.html`.

## 🟠 P1 — sérieux

### P1-1 · Limite journalière purement client-side

- **Fichier** : `app/wallet/wallet.service.ts:244+` (`sendZchfPayment`, `getDailySpending`).
- **Symptôme** : `maxDailyZchfAmount` et le tracker `dailySpending` sont en `StoredWallet` localStorage. `localStorage.removeItem('vit-wallet')` ou édition du JSON contourne entièrement la limite.
- **Risque** : un user (ou un malware sur son device) peut vider le wallet d'un coup sans garde-fou.
- **Fix** : enforcer via `VitSafePaymentGuard` (déjà déployé) au niveau du Safe, OU paymaster policy backend qui rejette les UserOps au-delà du quotidien (signature partenaire requise).

### P1-2 · Recovery sans UI cancel — **CORRIGÉ**

- **Fix appliqué (2026-06-19)** :
  - `WalletService.cancelRecoveryOnChain()` ajouté — appelle `SocialRecoveryModule.createCancelRecoveryMetaTransaction()` (abstractionkit) en UserOp sponsorisé. Signé par le Safe avec la passkey actuelle → seul l'owner légitime peut tuer une recovery hostile.
  - Bouton **« Annuler cette recovery »** ajouté sur la card Recovery (`page-wallet.component.html`), visible quand une `recoveryRequest` est active, avec confirmation modale + warn block.
  - Getter `canFinalizeRecovery` : `block.timestamp >= executeAfter` côté front. Le bouton « Finaliser » est désormais désactivé pendant le grace period, label devient « Grace period en cours ».
- **Risque résiduel** : la cancel UserOp doit elle-même passer le bundler pendant le grace period (sponsorisée). Si la cancel est rate-limitée par le paymaster, le user a un fallback `cancelPendingRecovery()` local (déjà existant), mais ce dernier ne touche que le cache.

### P1-3 · Pas de risk screening backend

- **Fichier** : `core.safe.preflight.ts` (allowlist locale).
- **Symptôme** : la préflight anti-scam (iter 0.2) check une allowlist hardcodée côté client. Aucune base externe consultée.
- **Risque** : un router malicieux non listé localement (nouveau scam) passe le check.
- **Fix** : ajouter un endpoint backend qui appelle Goplus / Blockaid / Chainalysis Address Screening en complément de l'allowlist.

### P1-4 · Pas de CI/CD — **CORRIGÉ**

- **Fix appliqué (2026-06-19)** : `.github/workflows/ci.yml` créé.
  - Trigger : `pull_request` + push sur `main` / `max-ux-2026` + `workflow_dispatch`.
  - Étapes : checkout · setup-node 24 (cache npm) · `npm ci` · build vit-core (if-present) · build vit-pay-app · `npm test` workspaces · `npm audit --audit-level=high --omit=dev` (continue-on-error pour ne pas bloquer si des vulns prod sans patch).
  - Coexiste avec le workflow existant `deploy-pages.yml` (groupe concurrency séparé).

### P1-5 · Recovery guardian doit payer gas

- **Fichier** : `wallet.service.ts` (paymaster policy).
- **Symptôme** : `executeRecovery` n'est pas sponsorisé. Si le guardian n'a pas d'ETH, la recovery est bloquée.
- **Risque** : la recovery échoue côté guardian alors que c'est le moment le plus stressant pour le user (perte de passkey).
- **Fix** : sponsoriser ces calls via une policy paymaster spécifique aux guardians (allowlist des operations recovery).

## 🟡 P2 — qualité / maintenabilité

### P2-1 · `wallet.service.ts` = 677 LoC

Mélange storage + UserOp + preflight + DeFi. Découper en `RecoveryService`, `DailySpendingService`, `PaymasterService`.

### P2-2 · DER signature parsing fragile

`lib/passkeys.ts:147+` suppose lengths < 256 bytes. Pour P-256 OK aujourd'hui mais fragile face à un authenticator non standard. Préférer `crypto.subtle.verify` ou ethers.

### P2-3 · Duplication `buildErc20Approve`

Entre `core.safe.4337.ts` et `core.safe.preflight.ts`. Extraire en helper commun pour éviter divergence.

### P2-4 · Test coverage faible

27 specs vs ~8k fichiers (0.3 %). Couvrent utils + storage. Pas de test UserOp, preflight, recovery, claim link côté frontend.

### P2-5 · Budgets Angular augmentés

`angular.json` initial 2/3 MB, anyComponentStyle 8/12 kB. À surveiller pour ne pas masquer un dérapage de bundle silencieux.

### P2-6 · Dépendance unique à Candide

Bundler + paymaster côté un seul vendor. Si Candide down → wallet inutilisable. Plan de découplage : [07 — Découpler Candide](07-paymaster-decoupling.md).

### P2-7 · TODO Stackup paymaster

`core.safe.paymaster.ts:212` — stub non implémenté.

### P2-8 · IBAN stocké en clair (iter 0.4)

`localStorage['vit-iban']` stocké en clair. **Acceptable** car un IBAN n'est pas un secret (numéro de compte public), mais à noter pour cohérence avec P0-2 si on migre vers un blob chiffré.

### P2-9 · Theme settings exposent surface CSS

`localStorage['vit-settings']` (iter 0.4) accepte n'importe quel hex utilisateur. Vérifier que `setProperty` ne peut pas être détourné pour injecter du CSS via une couleur malicieuse — actuellement OK car la valeur est utilisée brute dans `style.setProperty` qui sanitize, mais à recheck si on accepte un jour des chaînes complexes (gradients libres, urls).

## ✅ P1 corrigés (suite)

### CSP — `index.html` (2026-06-19)

- Méta-tag `Content-Security-Policy` ajouté dans `packages/vit-pay-app/src/index.html`.
- Directives :
  - `default-src 'self'`
  - `script-src 'self' https://accounts.google.com` (GSI client uniquement, **pas de `unsafe-eval` ni `unsafe-inline`**)
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` (Angular injecte des styles inline en runtime)
  - `font-src 'self' data: https://fonts.gstatic.com`
  - `img-src 'self' data: blob:`
  - `connect-src 'self' https: wss:` (large, à resserrer quand on aura la liste des RPC/bundlers fixes)
  - `frame-src 'self' https://accounts.google.com`
  - `object-src 'none'` · `base-uri 'self'` · `form-action 'self'`
- **Limite de la méta-tag** : `frame-ancestors`, `report-uri`, `sandbox` ne fonctionnent **que via headers HTTP**. À ajouter côté serveur Pages / Cloudflare quand on aura un edge config.
- **Effet** : un XSS injecté ne peut plus `eval()` / `new Function()` / charger un script externe non-listé. Réduit drastiquement la surface d'attaque qui restait après le fix P0-2 (chiffrement IDB).

## ✅ OK (vérifié, à maintenir)

- **TS strict** activé partout (`strict: true`, `noImplicitOverride: true`).
- **Pas de seed phrase / mnemonic / secrets RPC en repo** (vérifié `environment.*.ts`).
- **Architecture Safe + ERC-4337 + Passkey** solide, contrats canoniques v0.2.1 (cf. [02 — Architecture](02-architecture.md) et fix WebAuthn dans [06 — Debug log](06-debug-log.md)).
- **Préflight anti-scam** câblé sur les paiements (iter 0.2).
- **Validation runtime localStorage** (`WalletStorageService.isStoredWallet`) — interdit `privateKey`, `mnemonic`, `seed`, `shares`.
- **Subvention obligatoire** : pas de fallback ETH (erreur explicite).
- **Validation mod-97 IBAN** côté front avant save (iter 0.4) — empêche de stocker un IBAN bidon.
- **Preflight on-chain claim link cancel** (iter 0.4) — évite UserOp envoyé vers un revert.

## Roadmap sécurité suggérée

| Priorité | Action | État | Effort |
|---|---|---|---|
| ~~P0~~ | ~~Purger PK hardcodée + add `.env`~~ | ✅ fait (2026-06-11) | S |
| ~~P0~~ | ~~Chiffrer blob `localStorage['vit-wallet']`~~ | ✅ fait (2026-06-19, IDB + AES-GCM non-extractable) | M |
| ~~P1~~ | ~~CSP stricte dans `index.html`~~ | ✅ fait (2026-06-19) | S |
| P1 | `git filter-repo` pour purger l'historique de PK | ouvert · action manuelle requise | S |
| P1 | Activer `VitSafePaymentGuard` on-chain pour la limite journalière | ouvert · contrat déployé, wiring frontend à faire | M |
| ~~P1~~ | ~~Bouton « Annuler la recovery » dans l'UI~~ | ✅ fait (2026-06-19, `cancelRecoveryOnChain()` + UI) | S |
| ~~P1~~ | ~~CI GitHub Actions (build + test + audit npm)~~ | ✅ fait (2026-06-19, `.github/workflows/ci.yml`) | S |
| P1 | Sponsoriser `executeRecovery` côté paymaster | ouvert · policy Candide à ajuster | M |
| P1 | Risk screening backend (Goplus/Blockaid) — P1-3 | ouvert · nécessite un backend | M |
| P2 | Couverture de tests UserOp / preflight / recovery / claim link | ouvert | L |
| P2 | Découplage `PaymasterProvider` niveau 2 (cf. [07](07-paymaster-decoupling.md)) | ouvert | M |
