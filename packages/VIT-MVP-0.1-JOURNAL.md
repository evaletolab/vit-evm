# VIT MVP 0.1 — Journal d'implémentation

> Compagnon de `VIT-MVP-0.1.md`. Documente l'ordre d'exécution, les choix d'architecture,
> les écarts par rapport au spec, et la dette technique connue.

---

## 0. Audit de l'existant (avant exécution)

L'appli `vit-pay-app/` n'est pas vide. Au moment d'attaquer le MVP 0.1, ces primitives
sont déjà présentes :

| Fichier | Rôle | État |
|---|---|---|
| `src/lib/passkeys.ts` | `createPasskey`, `toLocalStorageFormat`, `extractSignature`, `extractClientDataFields` | ✅ Réutilisable tel quel |
| `src/lib/userOp.ts` | `signAndSendUserOp` (Candide + WebAuthn P-256) | ✅ Réutilisable, mais le chainId est lu depuis l'env |
| `src/lib/storage.ts` | `setItem`/`getItem` génériques + sérialisation bigint | ✅ Conservé, mais on ajoute une couche typée par-dessus |
| `src/lib/index.ts` | reliquat (`identity`, `auth`, `randomDigits`) | ⚠️ Imports cassés (`BigNumber` ethers v5, `AbiCoder` non importé, `./tools` manquant). Pas utilisé par le MVP — ignoré et **non touché**. |
| `src/app/vit-passkey/*` | composant "create passkey + dériver adresse Safe" | ⚠️ Appelle `SafeAccount.createAccountAddress` directement → ne respecte pas l'isolation `WalletService`. Conservé pour ne pas casser ce qui existe, mais **le MVP passe par `page-wallet`**. |
| `src/app/vit-mint/*` | flow UserOp + paymaster + sign+send pour mint NFT | ✅ Référence excellente pour comprendre le pattern `abstractionkit` réel. Le code de `WalletService` s'en inspire directement. |
| `src/environments/environment*.ts` | config Angular | ⚠️ Champs présents mais bundlerUrl/paymasterUrl vides → MVP doit fournir des valeurs OP Sepolia. |

**Décision** : ne pas refactorer `vit-passkey`/`vit-mint`. Ils restent en place comme
"démos historiques". Tout le code du MVP vit dans `app/wallet/` (services) et
`app/pages/page-wallet/` (UI). Une fois `WalletService` validé, ces composants
historiques pourront être migrés ou supprimés (cf. itération 0.4).

---

## 1. Stack confirmée

Conforme au spec :

- Angular 18 (existant)
- `abstractionkit@^0.3.8` (déjà installé)
- `ethers@^6.16.0` (déjà installé) — attention v6, pas v5
- `SafeAccountV0_3_0` → EntryPoint v0.7
- `CandidePaymaster` pour la subvention
- `SocialRecoveryModule` (présent dans abstractionkit, classe complète vérifiée
  dans `node_modules/abstractionkit/dist/index.d.mts` lignes 715-748)
- WebAuthn P-256 via `navigator.credentials.create/get`
- Cible : OP Sepolia (`chainId 11155420`)

---

## 2. Ordre d'exécution choisi

L'ordre est dicté par les dépendances de compilation :

1. **wallet-config.ts** — aucun import interne, seul l'env
2. **wallet.types.ts** — aucun import interne (types purs)
3. **wallet-storage.service.ts** — dépend de `types` + `storage` lib
4. **wallet.service.ts** — dépend de tout ce qui précède + lib passkeys/userOp
5. **page-wallet.component** — dépend uniquement de `WalletService`
6. **routing + module** — branchement final
7. **environments** — mis à jour en fin de chaîne (pas de couplage de compilation, juste des valeurs)
8. **tests unitaires** — sur la couche utils pure
9. **type-check** — `ng build` (ou `tsc --noEmit` si build trop long)

Ce gradient va du moins-couplé au plus-couplé. Si un type-check casse en milieu de
chaîne, on isole la cause sans devoir tout rejouer.

---

## 3. Décisions d'architecture

### 3.1 Pourquoi un `WalletService` Angular `@Injectable({providedIn: 'root'})` ?

Le spec dit : « les composants Angular ne doivent appeler que cette API ». Le
provider `root` garantit une seule instance, partagée entre `page-wallet` et tout
futur composant (historique des transactions, écran de réception, etc.).

C'est aussi le seul endroit où `abstractionkit` est importé côté `app/` — règle
vérifiable au lint via une recherche grep sur `from 'abstractionkit'`.

### 3.2 Pourquoi conserver `lib/userOp.ts` et `lib/passkeys.ts` ?

Ces fichiers sont des primitives WebAuthn/UserOp, pas des « appels métier ». Les
réimporter dans `WalletService` revient juste à composer. Réécrire ces fichiers
serait du gaspillage et augmenterait la surface de bugs.

### 3.3 Stockage : un seul blob JSON sous la clé `vit-wallet`

Le spec liste un `StoredWallet` plat. Plutôt que de disperser
`accountAddress`, `credentialId`, `webauthnPublicKey`… sur 6 clés `localStorage`,
on sérialise un seul objet sous une clé. Avantages :

- atomicité du load/save (pas de mismatch partiel)
- migration future plus simple (versionner le blob)
- audit visuel facile dans les devtools

### 3.4 Sérialisation bigint

`lib/storage.ts` sérialise déjà les bigint en hex `0x…`. On garde ce contrat.
Le service `WalletStorageService` ajoute une fonction de revival qui re-parse les
coordonnées `x` et `y` du passkey en `bigint`.

### 3.5 ZCHF transfer → MetaTransaction

`transfer(address,uint256)` est encodé via `ethers.Interface`, pas via
`abstractionkit.createCallData` + `getFunctionSelector`. Raison : `ethers.Interface`
gère les types ABI proprement et c'est ce qui est utilisé partout ailleurs dans le
projet. `createCallData` est plus bas niveau et n'apporte rien ici.

### 3.6 Pas de seed phrase, pas de mnemonic, pas de Horcrux

Le spec est explicite. Le MVP n'a aucune dépendance à `core.SSS`,
`core.entropy`, `identity.*`. La recovery se fait par rotation d'owners via
`SocialRecoveryModule`, point.

### 3.7 Network par défaut : OP Sepolia

`environment.development.ts` est passé sur OP Sepolia. `environment.ts` reste
configuré pour mainnet (placeholders Optimism prod). C'est cohérent avec
« 0.1a OP Sepolia / 0.2 Optimism mainnet ».

---

## 4. Écarts par rapport au spec (assumés)

| Spec | Réalité | Raison |
|---|---|---|
| `wallet-config.ts` | Implémenté comme façade typée sur `environment.ts`, pas comme fichier de config standalone | Angular utilise déjà `environments/` — dupliquer serait source de drift. La façade type strictement les champs. |
| `VITE_*` env vars | Pas de Vite ici (Angular CLI 18) — config via `environment.development.ts` | Le projet est Angular, pas Vite. Le spec a été rédigé en supposant Vite. |
| `vit-pay-app/src/app/wallet/` | Implémenté tel quel | OK |
| `vit-pay-app/src/app/pages/page-wallet/` | Implémenté tel quel | OK |
| ZCHF testnet | Non vérifié par RPC ici (pas d'`cast` dispo dans la session) — config pointe sur l'adresse mainnet officielle comme placeholder. **À valider avant test.** | Le doc lui-même fait du fallback `MockZCHF` une décision à prendre au moment du test, pas à la construction. |

---

## 5. À faire après ce MVP (hors scope immédiat)

- **Faucet MockZCHF** : ajouter un bouton "mint ZCHF de test" si on déploie un mock ERC-20.
- **Preflight anti-scam** : `core.safe.preflight` existe déjà dans `vit-core` — l'intégrer
  dans `WalletService.sendZchfPayment` avant `signAndSendUserOp` (cf. itération 0.2).
- **Persistance recoveryRequestId** côté client pour `finalizeRecovery` (actuellement
  on relit l'état on-chain via `getRecoveryRequest` — suffisant mais lent).
- **Test E2E manuel** : voir section 7.

---

## 6. Sécurité

- Aucun secret persisté côté client (vérifié par grep sur le contenu de `StoredWallet`).
- La signature passkey est demandée à l'utilisateur **pour chaque** UserOperation.
- Le paymaster sponsorise → l'utilisateur n'a jamais à provisionner d'ETH.
- WebAuthn `authenticatorAttachment: 'platform'` + `userVerification: 'required'` →
  exige biométrie/PIN local, pas de clé hardware externe.
- ⚠️ **RP ID** : les passkeys créés sur `localhost:4200` ne fonctionneront pas
  tels quels sur le domaine de production. À gérer lors du déploiement.

---

## 7. Test E2E manuel (mode dev)

Pré-requis : un bundler + paymaster Candide OP Sepolia (URLs à mettre dans
`environment.development.ts`).

```
cd packages/vit-pay-app
npm install
npm start
```

Puis dans le navigateur (Chrome/Safari récent, sous HTTPS ou `localhost`) :

1. Ouvrir `http://localhost:4200/wallet`
2. Cliquer **Créer mon wallet** → biométrie demandée → adresse Safe affichée
3. **(option)** Minter du MockZCHF vers cette adresse via un script séparé
4. Saisir destinataire + montant, cliquer **Envoyer** → biométrie → hash affiché
5. **Ajouter device** → ouvrir un second navigateur/profil, créer un nouveau passkey,
   coller l'adresse owner dans le flow d'ajout
6. **Activer recovery** → ajouter un EOA de test comme guardian
7. **Restaurer** → simuler perte → utiliser le guardian pour rotation d'owner

---

## 8. Avancement (mis à jour en cours de route)

- [x] Audit existant + journal initial
- [x] `wallet-config.ts`
- [x] `wallet.types.ts`
- [x] `wallet-storage.service.ts`
- [x] `wallet.service.ts`
- [x] `wallet.utils.ts` (bonus — utilitaires purs pour faciliter les tests unitaires)
- [x] `page-wallet/` (.ts + .html + .scss)
- [x] Routing + module (+ `FormsModule` ajouté pour `[(ngModel)]`)
- [x] Environments OP Sepolia (dev) + Optimism mainnet (prod)
- [x] Tests unitaires (`wallet.utils.spec.ts` + `wallet-storage.service.spec.ts`)
- [x] Type-check : `ng build --configuration=development` → bundle 3.48 MB, 4.3 s, 0 erreur
- [x] Finalisation journal

## 9. Inventaire final des fichiers

Nouveaux fichiers :

```
packages/VIT-MVP-0.1-JOURNAL.md                         ← ce document
packages/vit-pay-app/src/app/wallet/
  wallet-config.ts
  wallet.types.ts
  wallet-storage.service.ts
  wallet-storage.service.spec.ts
  wallet.service.ts
  wallet.utils.ts
  wallet.utils.spec.ts
packages/vit-pay-app/src/app/pages/page-wallet/
  page-wallet.component.ts
  page-wallet.component.html
  page-wallet.component.scss
```

Fichiers modifiés :

```
packages/vit-pay-app/src/app/app.module.ts            (+ FormsModule, + PageWalletComponent)
packages/vit-pay-app/src/app/app-routing.module.ts    (+ route /wallet)
packages/vit-pay-app/src/environments/environment.ts            (Optimism mainnet)
packages/vit-pay-app/src/environments/environment.development.ts (OP Sepolia + nouveaux champs)
```

Fichiers volontairement **non touchés** (cf. §0) :

```
packages/vit-pay-app/src/app/vit-mint/*       (démo NFT, fonctionne déjà)
packages/vit-pay-app/src/app/vit-passkey/*    (démo passkey, fonctionne déjà)
packages/vit-pay-app/src/lib/index.ts         (cassé, jamais importé)
packages/vit-pay-app/src/lib/passkeys.ts      (réutilisé tel quel)
packages/vit-pay-app/src/lib/userOp.ts        (réutilisé tel quel)
packages/vit-pay-app/src/lib/storage.ts       (réutilisé indirectement)
```

## 10. Correspondance avec la spec MVP 0.1

| Spec | Implémentation | Statut |
|---|---|---|
| F1 — Créer wallet via passkey | `WalletService.createWalletWithPasskey()` + bouton UI | ✅ |
| F2 — Recevoir ZCHF de test | `WalletService.getZchfBalance()` + affichage UI ; **pas** de bouton mint (cf. §11) | ⚠️ partiel |
| F3 — Paiement sponsorisé | `WalletService.sendZchfPayment(to, amount)` + flow Candide complet | ✅ |
| F4 — Ajouter un device | `WalletService.addDeviceWithPasskey()` ; UI assume « ajout depuis appareil actuel » (cf. §11) | ⚠️ MVP-acceptable |
| F5 — Activer recovery | `WalletService.enableRecovery(guardians, threshold)` via `SocialRecoveryModule` | ✅ |
| F6 — Restaurer wallet | `WalletService.startRecovery()` (renvoie la MetaTransaction guardian) + `getRecoveryRequest()` + `finalizeRecovery()` | ✅ |
| API publique `WalletService` | `createWalletWithPasskey`, `loadWallet`, `sendZchfPayment`, `addDeviceWithPasskey`, `enableRecovery`, `startRecovery`, `finalizeRecovery` + `getZchfBalance` (bonus) + `getRecoveryRequest` (bonus) | ✅ |
| `StoredWallet` schema strict | `wallet.types.ts` + validation runtime dans `WalletStorageService.isStoredWallet` | ✅ |
| Aucun secret stocké | Vérifié : `StoredWallet` ne contient ni `privateKey`, ni `mnemonic`, ni `seed`, ni `share` | ✅ |
| Subvention obligatoire | `WalletService.executeSponsoredUserOp` exige `paymasterUrl` ; erreur explicite "Transaction non sponsorisée" si échec, jamais de fallback ETH | ✅ |
| Couplage Candide via `WalletService` | `abstractionkit` n'est importé que dans `wallet.service.ts` (vérifiable par grep `from 'abstractionkit'` dans `src/app/**`) | ✅ |

Note : `vit-mint.component.ts` importe encore `abstractionkit` directement. C'est de
la dette historique, pas le MVP. Vérification du couplage : faire le grep en
**excluant** `vit-mint/` et `vit-passkey/`. Au sein du MVP (`wallet/` + `pages/page-wallet/`),
la règle est respectée.

## 11. Dette technique restante et iterations 0.2+

| Item | Iteration | Effort |
|---|---|---|
| Faucet MockZCHF (F2 complet) | 0.2 | S (1 bouton + 1 script Hardhat de déploiement) |
| Préflight anti-scam dans `sendZchfPayment` | 0.2 | M (réutiliser `vit-core/core.safe.preflight`) |
| Page "debug UserOperation" (afficher userOp brut) | 0.2 | S |
| F4 — flow "ajout depuis appareil cible" | 0.2 | M (partage QR + signature distante) |
| Persistance `recoveryRequestId` côté client | 0.3 | S |
| Limites journalières / guards | 0.3 | M |
| Migration `relay-kit` (Safe officiel) | 0.4 | L |
| Suppression `vit-mint`/`vit-passkey` historiques | 0.4 | S |
| Test e2e Cypress / Playwright | 0.4 | L |

## 12. Vérifications effectuées

- `npx ng build --configuration=development` : ✅ 0 erreur
- Imports `from 'abstractionkit'` dans le code MVP : seulement `wallet.service.ts` ✅
- Aucun `console.log` laissé en production dans le code MVP (sauf celui pré-existant dans `lib/userOp.ts`)
- Tous les chemins (`createWallet`, `send`, `addDevice`, `enableRecovery`, `finalizeRecovery`) gèrent les erreurs sans laisser le bouton bloqué (`try/finally { busy = false }`)
- `StoredWallet` interdit (vérifié à la lecture) : `privateKey`, `mnemonic`, `seed`, `shares`

## 13. Comment tester maintenant

1. **Remplir les URLs Candide** dans `packages/vit-pay-app/src/environments/environment.development.ts` :
   - `bundlerUrl` : ton endpoint Candide bundler OP Sepolia
   - `paymasterUrl` : ton endpoint Candide paymaster OP Sepolia
   - `sponsorshipPolicyId` : optionnel (private policy)
2. **Vérifier ZCHF** : `cast code 0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553 --rpc-url https://sepolia.optimism.io`
   - Si réponse ≠ `0x` → garder cette adresse.
   - Sinon → déployer un MockZCHF, mettre l'adresse dans `zchfTokenAddress`.
3. **Lancer l'app** :
   ```bash
   cd packages/vit-pay-app
   npm install
   npm start
   ```
4. **Aller sur** `http://localhost:4200/wallet`
5. Suivre les 3 scénarios (Création+paiement, Add device, Recovery) décrits dans
   la section 7 plus haut et dans `VIT-MVP-0.1.md` § "Plan de Tests".

## 14. Risques (rappel du spec, état d'avancement)

| Risque (spec) | Couvert par cette implémentation ? |
|---|---|
| Disponibilité ZCHF testnet | Non vérifié par RPC (pas d'`cast` dans la session) → fallback documenté §13 |
| Paymaster : policy active + budget | Erreurs mappées dans `mapPaymasterError` (UI sans crash) ; pas de fallback ETH (intentionnel, conforme spec) |
| WebAuthn RP ID `localhost` ≠ prod | Documenté §6 ; pas de mitigation au build (problème de déploiement) |
| Grace period courte en dev | `SocialRecoveryModule` par défaut = After3Days ; surchargeable via `socialRecoveryModuleAddress` dans l'env |
| Couplage Candide | Évité dans le MVP via `WalletService` — `abstractionkit` confiné à un seul fichier (cf. §10) |

---

**Statut final : MVP 0.1 implémenté, type-check OK, prêt pour test E2E manuel
dès que les endpoints Candide et l'adresse ZCHF testnet sont validés.**

---

## 15. Addendum — Faucet MockZCHF (alimentation des soldes utilisateurs)

Sur OP Sepolia il n'y a pas de ZCHF testnet officiel. Pour permettre aux utilisateurs
d'avoir un solde, on déploie un `MockERC20` (existant dans `vit-safe-modules/contracts/`)
en tant que ZCHF, et on l'expose des deux côtés :

- **Admin / déploiement initial** : scripts Hardhat (`vit-safe-modules/scripts/`)
- **Auto-faucet utilisateur** : bouton "Recevoir" dans `page-wallet` qui appelle
  `mint(safe, amount)` via UserOp sponsorisée

### 15.1 Procédure de déploiement (admin)

Pré-requis : un EOA avec quelques `ETH` OP Sepolia (faucet officiel
https://www.alchemy.com/faucets/optimism-sepolia ou autre).

```bash
cd packages/vit-safe-modules

# 1. Compiler
npx hardhat compile

# 2. Déployer MockZCHF (1M ZCHF préminté vers le deployer)
OP_SEPOLIA_RPC_URL=https://sepolia.optimism.io \
PRIVATE_KEY=0x<your-deployer-key> \
  npx hardhat run scripts/deployMockZchf.js --network opSepolia

# Sortie attendue :
# MockZCHF address: 0x<TOKEN_ADDRESS>

# 3. Coller l'adresse dans
#    packages/vit-pay-app/src/environments/environment.development.ts
#    → zchfTokenAddress: '0x<TOKEN_ADDRESS>'

# 4. (Optionnel) Distribuer manuellement à un user
OP_SEPOLIA_RPC_URL=... PRIVATE_KEY=... \
  ZCHF_ADDRESS=0x<TOKEN_ADDRESS> \
  RECIPIENT=0x<safe-address> \
  AMOUNT=100 \
  npx hardhat run scripts/mintZchf.js --network opSepolia
```

### 15.2 Auto-faucet via UI (utilisateur)

Une fois l'adresse `MockZCHF` configurée et le wallet créé, l'utilisateur peut cliquer
**"Recevoir"** dans la section "Recevoir des ZCHF de test" :

1. `WalletService.mintTestZchf(amount)` construit une `MetaTransaction` qui appelle
   `mint(this.accountAddress, amount)` sur le token.
2. La UserOperation est sponsorisée par le paymaster Candide.
3. L'utilisateur signe avec passkey.
4. Le bundler l'inclut. Le solde monte.

**Coût pour l'utilisateur** : 0. Le paymaster paie le gaz, le mint est ouvert.

### 15.3 Pourquoi ouvert ?

`MockERC20.mint(address, uint256)` est `public` sans `onlyOwner`. C'est intentionnel
pour un faucet testnet (n'importe qui peut mint pour soi-même ou pour autrui).
**À ne JAMAIS déployer en mainnet** — le contrat n'a pas de garde.

En production, le ZCHF officiel (`0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553`) prend
la place du MockZCHF ; l'auto-faucet devient un swap (USDC → ZCHF via Uniswap, à
implémenter en itération 0.2 cf. `vit-core/defi.uniswap`).

### 15.4 Fichiers ajoutés / modifiés pour le faucet

```
packages/vit-safe-modules/hardhat.config.js            (+ network opSepolia via env)
packages/vit-safe-modules/scripts/deployMockZchf.js    (nouveau)
packages/vit-safe-modules/scripts/mintZchf.js          (nouveau)
packages/vit-pay-app/src/app/wallet/wallet.service.ts  (+ mintTestZchf, + buildMockErc20Mint)
packages/vit-pay-app/src/app/pages/page-wallet/page-wallet.component.ts  (+ mintTestZchf flow)
packages/vit-pay-app/src/app/pages/page-wallet/page-wallet.component.html (+ bloc "Recevoir des ZCHF de test")
```

Build vérifié : `ng build --configuration=development` → 3.49 MB, 2.6 s, 0 erreur.



---

## 16. Blocker — AA24 sur première UserOperation (sponsorisée, init)

**Date** : 2026-06-08
**Statut** : Bloquant. Investigation poussée, root cause isolée à du code on-chain
tiers (abstractionkit's `SafeWebAuthnSharedSigner` ou interaction avec le bundler
Candide). MVP wallet pause en attendant une décision : (a) issue upstream, (b)
refactor pour pattern `SafeWebAuthnSignerFactory`, ou (c) autre bundler.

### 16.1 Symptôme

À chaque clic « Recevoir » (premier `mintTestZchf` → init du Safe + mint), le
bundler Candide rejette le UserOp pendant `eth_sendUserOperation` :

```
bundler eth_sendUserOperation rpc call failed → Invalid UserOp signature or paymaster signature
cause.code: INVALID_SIGNATURE / errno: -32507
cause.data: undefined
```

Une simulation directe via `EntryPoint.handleOps` (script de debug, supprimé
après cleanup) retourne :

```
FailedOp(opIndex=0, reason="AA24 signature error")
```

→ La validation de la signature **UserOp** échoue (pas le paymaster). Candide
masque cette distinction côté API.

### 16.2 Reproduit sur

| Chain | RPC bundler | Résultat |
|---|---|---|
| OP Sepolia (11155420) | Candide private + sponsorshipPolicyId | AA24 |
| OP Sepolia | Candide private (policyId=undefined) | AA24 |
| OP Sepolia | Candide public endpoint | AA24 |
| Sepolia (11155111) | Candide public endpoint | AA24 |

→ Pas chain-spécifique, pas policy-spécifique, pas bundler-config-spécifique.

### 16.3 Évidence : la signature WebAuthn est VALIDE localement

Un script `verify-webauthn-local.mjs` (supprimé après cleanup) a reproduit la
vérification on-chain en local avec `crypto.subtle.verify` + P-256 :

1. Hash userOp (off-chain) : `SafeAccount.getUserOperationEip712Hash(userOp, chainId)` →
   `0x7e2a41af...`
2. Hash userOp (on-chain) : `Safe4337Module.getOperationHash(userOp)` →
   `0x7e2a41af...` (**MATCH**)
3. Reconstruction `clientDataJSON` = `{"type":"webauthn.get","challenge":"<base64url(hash)>","origin":"http://localhost:4200","crossOrigin":false}`
4. `messagePreHash = authenticatorData || SHA-256(clientDataJSON)`
5. `crypto.subtle.verify({ECDSA, SHA-256}, pubkey, [r,s], messagePreHash)` → **✅ VALID**

Donc :
- La signature est mathématiquement correcte
- Elle est faite contre le bon hash
- La pubkey utilisée pour vérifier (extraite du `factoryData`) correspond à celle
  de signing (extraite du `localStorage`)
- La structure du payload est correcte (429 bytes : 12 header + 65 static slot +
  32 length + 320 webauthn ABI-encoded data)

L'on-chain pourtant rejette.

### 16.4 Hypothèses testées et écartées

| Hypothèse | Test | Résultat |
|---|---|---|
| sponsorshipPolicyId invalide | passé `undefined` | AA24 persiste |
| URL bundler/paymaster | switch public ↔ private API key | AA24 persiste |
| Hash off-chain ≠ on-chain | call `Safe4337Module.getOperationHash` | MATCH parfait |
| Encoding signature corrompu | dump byte-par-byte + reproduction locale | structure correcte |
| `SafeWebAuthnSharedSigner` canonique Safe (`0x94a4F6af...`) au lieu d'abstractionkit-default (`0xfD90FAd3...`) | override `webAuthnSharedSigner` + recréation wallet | `EXECUTION_REVERTED b''` (autre erreur, pas mieux) |
| Verifier P-256 canonique FCL au lieu d'abstractionkit (`0x445a0683...`) | override `eip7212WebAuthnContractVerifier...` | AA24 persiste |
| EIP-7212 precompile sur OP Sepolia (`0x0100`) | override `eip7212WebAuthnPrecompileVerifier...` | AA24 persiste |
| Dummy signer pair pour gas estimation aligné avec le shared signer | override `dummySignerSignaturePairs[].signer` | `EXECUTION_REVERTED` |
| Mauvaise chain | switch OP Sepolia → Sepolia | AA24 identique |

### 16.5 Hypothèses restantes (non testées)

1. **Bug dans le `SafeWebAuthnSharedSigner` déployé par abstractionkit**
   (`0xfD90FAd33ee8b58f32c00aceEad1358e4AFC23f9`, présent sur OP Sepolia ET Sepolia
   avec le **même** code, mais différent du déploiement canonique Safe). Sa logique
   d'`isValidSignature` semble incompatible avec le format de signature produit
   par `formatSignaturesToUseroperationSignature` d'abstractionkit elle-même.
   À vérifier : decompiler le bytecode ou demander aux mainteneurs.

2. **Setup en delegatecall ne populate pas le storage du Safe** pendant la
   simulation Candide. `configure(x, y, verifiers)` est appelé en DELEGATECALL
   via MultiSend pendant le déploiement du Safe ; les valeurs sont stockées
   au slot `SIGNER_SLOT` (= `0x553c9d7e...` pour le contrat abstractionkit) de
   l'**adresse du Safe**. Si la simulation bundler évalue `validateUserOp` sans
   commit du storage post-deploy, `isValidSignature` lit (0, 0, 0) et rejette.
   À vérifier : check via `eth_call` avec state override que `configure` populate
   bien le storage attendu.

3. **Format de signature différent attendu par le contrat abstractionkit**.
   La structure produite localement matche ce que `createWebAuthnSignature` +
   `formatSignaturesToUseroperationSignature` génèrent. Mais peut-être que
   `SafeWebAuthnSharedSigner` à cette adresse attend une variante (ex: hash
   personal-sign-wrapped au lieu de raw hash, ou tag de version).

### 16.6 Pistes pour débloquer

- **A. Discord Candide / GitHub issue abstractionkit** — joindre le payload userOp
  + la preuve de vérification locale. Probable que les mainteneurs identifient
  immédiatement.
- **B. Refactor vers `SafeWebAuthnSignerFactory`** (pattern "per-passkey deployed
  proxy" au lieu de "shared singleton"). Plus standard, mieux documenté côté Safe.
  Implique :
  - Déployer un proxy `SafeWebAuthnSigner` par passkey via la factory canonique
    Safe (`0x1d31F259eE307358a26dFb23EB365939E8641195`)
  - Setup du Safe avec ce proxy comme owner (au lieu de WebAuthnSharedSigner)
  - Reformatter les signatures en mode `isInit: false` dès la première op (pas
    de section "init" dans la signature)
- **C. Tester un autre bundler** (Pimlico, Stackup, Alchemy) — si AA24 disparaît,
  c'est Candide-spécifique.

### 16.7 État du code après cleanup

Reverti à un état commitable, sans béquilles debug :
- `lib/userOp.ts` : code minimal sans logs `[DBG]`
- `wallet.service.ts` : `formatErrorChain` conservé (utile pour décoder les
  erreurs de bundler chainées), `buildDebugDump` + `debug` field retirés
- `page-wallet.component.{ts,html}` : boutons download/copy debug retirés
- `wallet.types.ts` : `debug?` retiré de `UserOperationResult`
- `packages/vit-pay-app/scripts/` : 8 scripts d'investigation supprimés
- `environment.development.ts` : reste sur Sepolia + endpoint public Candide +
  MockZCHF `0x0a024786a7f6308409Dc74107e27f443f3F524B5`. Pour repasser OP Sepolia,
  swap chainId/RPC/bundler/MockZCHF address.
- `hardhat.config.js` : networks `opSepolia` + `sepolia` conservés (utiles)

Type-check `tsc --noEmit` passe ✅.

---

## 17. Fix 3 — Override addresses webauthn canoniques Safe v0.2.1

**Date** : 2026-06-09
**Statut** : Implémenté, type-check OK, validé E2E (premier UserOp init+mint inclus).

### 17.1 Diagnostic

Le Fix 1 (§16.6 piste C — swap bundler vers Pimlico Sepolia) a confirmé que l'AA24
**n'était pas Candide-spécifique** : Pimlico rejette identiquement. Donc le bug
est on-chain, pas dans la simulation du bundler.

En lisant le source `node_modules/abstractionkit/dist/index.mjs` :

- Lignes 4156-4182 (`createBaseUserOperationAndFactoryAddressAndFactoryData`) :
  abstractionkit **prepend déjà automatiquement** au premier UserOp deux
  MetaTransactions : `createDeployWebAuthnVerifierMetaTransaction(x, y)` (déploie
  un proxy CREATE2 dédié au passkey via `SafeWebAuthnSignerFactory`) puis un
  `swapOwner` qui remplace le `SafeWebAuthnSharedSigner` par ce proxy comme
  owner du Safe. Donc le pattern « SignerFactory » est en place, pas besoin de
  refactor lourd.

- Lignes 3404-3406 (`SafeAccount.DEFAULT_WEB_AUTHN_*`) : par défaut abstractionkit
  pointe sur **sa propre copie** du SharedSigner (`0xfD90FAd3…`), pas sur le
  canonique Safe (`0x94a4F6af…`). Cette copie a un `isValidSignature` qui
  rejette les signatures même mathématiquement valides — c'est ça l'AA24.

- Lignes 6619-6629 + 6700-6703 : les contracts canoniques **Safe Passkey Module
  v0.2.1** sont déclarés dans `SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_*`
  et accessibles via import direct.

### 17.2 Solution

Override les 5 addresses webauthn vers les canoniques Safe sur **tous** les
appels abstractionkit du `WalletService`. Constants dans `wallet.service.ts` :

```ts
const WEBAUTHN_CANONICAL_OVERRIDES = {
  webAuthnSharedSigner: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SHARED_SIGNER,
  webAuthnSignerSingleton: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_SINGLETON,
  webAuthnSignerFactory: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_FACTORY,
  webAuthnSignerProxyCreationCode:
    SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_PROXY_CREATION_CODE,
  eip7212WebAuthnContractVerifier:
    SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_DAIMO_VERIFIER,
};
```

Adresses appliquées :

| Override | Canonical Safe v0.2.1 |
|---|---|
| `webAuthnSharedSigner` | `0x94a4F6affBd8975951142c3999aEAB7ecee555c2` |
| `webAuthnSignerSingleton` | `0x4E27b51350e6c2083EE19011120F50DAfEc5CA50` |
| `webAuthnSignerFactory` | `0x1d31F259eE307358a26dFb23EB365939E8641195` |
| `webAuthnSignerProxyCreationCode` | bytecode v0.2.1 |
| `eip7212WebAuthnContractVerifier` | `0xc2b78104907F722DABAc4C69f826a522B2754De4` (Daimo) |

### 17.3 Fichiers modifiés

```
packages/vit-pay-app/src/app/wallet/wallet.service.ts
  + import SafeMultiChainSigAccountV1
  + WEBAUTHN_CANONICAL_OVERRIDES + INIT_CODE_WEBAUTHN_OVERRIDES
  − WebauthnDummySignerSignaturePair (plus utilisé)
  ~ createAccountAddress, initializeNewAccount (x2), getSignerLowerCaseAddress
    (x2), createUserOperation, createAddOwnerWithThresholdMetaTransactions
    reçoivent désormais les overrides
  ~ createUserOperation : remplacement de
    `dummySignerSignaturePairs: [WebauthnDummySignerSignaturePair]` par
    `expectedSigners: [pubkey]` (laisse abstractionkit recalculer le dummy
    aligné avec les overrides canoniques)

packages/vit-pay-app/src/lib/userOp.ts
  + export interface WebauthnSignatureOverrides
  + nouveau paramètre optionnel `webauthnOverrides` propagé à
    formatSignaturesToUseroperationSignature
```

### 17.4 Pourquoi `expectedSigners` plutôt que `dummySignerSignaturePairs`

Le dummy hardcodé `WebauthnDummySignerSignaturePair` (lignes 3381-3385 de
`abstractionkit/dist/index.mjs`) contient `signer: '0xfD90FAd3…'` (la copie
abstractionkit du SharedSigner). Quand on override le SharedSigner, il faut
aussi que le dummy pointe sur le canonique pour l'estimation de gas. La
voie propre est de passer `expectedSigners: [pubkey]` : abstractionkit appelle
alors `createDummySignerSignaturePairForExpectedSigners` qui résout le dummy
en respectant les overrides (cf. lignes 4210-4222).

### 17.5 Impact sur les wallets existants

L'override modifie le `createAccountAddress` (CREATE2 inclut les addresses
webauthn dans son init). Donc **toute nouvelle adresse Safe est différente de
l'ancienne**. Les utilisateurs ayant un `vit-wallet` en `localStorage` doivent
le vider avant de réessayer :

```js
localStorage.removeItem('vit-wallet')
```

Aucun fonds réel n'est sur ces wallets (testnet only), pas de migration nécessaire.

### 17.6 Vérifications

- `ng build --configuration=development` : ✅ 3.41 MB, 0 erreur, 2.8 s
- Grep `from 'abstractionkit'` dans `src/app/` : couplage toujours confiné à
  `wallet.service.ts` (règle §10 respectée). `lib/userOp.ts` importe aussi mais
  c'est intentionnel (primitive WebAuthn → UserOp).
- E2E : « Créer mon wallet » + « Recevoir » → UserOp incluse avec succès.

### 17.7 Suite

Le blocker AA24 est levé. La dette restante §11 reprend (préflight anti-scam,
page debug UserOperation, F4 flow ajout device cible, etc.).

---

## 18. Itération 0.2 — préflight, debug UserOp, F4 par address, cache recovery

**Date** : 2026-06-09
**Statut** : Implémenté, build OK (4.16 MB, 0 erreur). À tester E2E côté browser.

Quatre sous-items du §11 traités d'un coup. Tous restent sous le contrat
`WalletService` (couplage abstractionkit toujours confiné au service).

### 18.1 Page debug UserOperation (§11 ligne 3)

Réintroduction d'un champ `debug?` retiré en §16.7 (cleanup) pour le replacer
proprement, sans béquilles transitoires.

- `wallet.types.ts` : nouvelle interface `UserOperationDebug` (champs
  `userOpJson`, `userOpEip712Hash`, `paymasterUrl`, `bundlerUrl`). Champ
  `debug?` ajouté à `UserOperationResult`.
- `wallet.service.ts` : helper local `stringifyUserOp` (replacer JSON
  bigint→hex). Closure `buildDebug(userOp?)` dans `executeSponsoredUserOp`
  appelée à chaque return (succès + 3 paths d'erreur : estimation gas,
  paymaster, send/include).
- `page-wallet.component.{ts,html}` : `<details>` collapsible sur chacune des
  4 sections (faucet/payment/addDevice/recovery) avec bouton `Copier JSON`.
  Helpers `copyDebug` (Clipboard API + fallback `window.prompt` pour les
  contextes non-HTTPS) et `formatDebug` sur le component.

### 18.2 Préflight anti-scam (§11 ligne 2)

Wire `preflightRiskCheck` de `vit-core/core.safe.preflight.ts` dans
`sendZchfPayment`. Plomberie workspace nécessaire car le wiring d'origine
était cassé.

**Découverte plumberie** :

- `vit-pay-app/package.json` déclarait `"kng2-web3": "file:../karibou-web3"` :
  chemin inexistant (le package se trouve dans `packages/vit-core/` sous le
  nom `kng2-web3`). Remplacé par `"kng2-web3": "*"` (résolution via npm
  workspaces).
- Symlink obsolète `vit-pay-app/node_modules/kng2-web3 → packages/karibou-web3`
  supprimé manuellement. Après `npm install` au root, Node.js remonte au
  `node_modules` root (qui contient le bon symlink vers `vit-core`).
- L'import barrel `from 'kng2-web3'` tirait `@safe-global/protocol-kit`, qui
  référence `import { Buffer } from 'buffer'` (Node built-in incompatible
  avec esbuild en mode browser). Solution : ajouter un subpath export
  `./preflight` dans `vit-core/package.json` pointant directement sur
  `dist/core.safe.preflight.js` (qui ne dépend que d'`ethers`).

**Intégration** :

- `wallet.service.ts` : nouvelle méthode privée `runPreflight(transactions)`.
  Verdict `BLOCK` → throw avec le summary. `WARN` → renvoie un
  `PreflightWarning` (summary + flagCount) propagé dans le `UserOperationResult`.
  `OK` → undefined.
- `sendZchfPayment` appelle `runPreflight` AVANT `executeSponsoredUserOp`,
  conforme au principe « screen BEFORE signing » du module preflight.
- `mintTestZchf` n'est pas screené (transfert vers soi-même).
- UI : `⚠️ {{ preflight.summary }}` (classe `.warn`) au-dessus du résultat
  paiement quand présent.

### 18.3 F4 flow par address (§11 ligne 4)

Variante simple sans QR/signature distante. Le device cible génère sa passkey
localement et partage manuellement (copy/paste) son owner address ; le device
propriétaire signe l'addition.

- `wallet.service.ts` : nouvelle méthode publique `addOwnerByAddress(addr)`.
  Utilise `createStandardAddOwnerWithThresholdMetaTransaction(addr, 1)`
  (signature low-level qui prend une address brute, ne nécessite pas la
  pubkey x/y du device cible). Met à jour `stored.owners` après succès.
- `page-wallet.component.{ts,html}` : section « Ajouter un appareil »
  restructurée en deux options :
  - Option A — passkey locale (le bouton existant, usage rare)
  - Option B — par address (input + bouton, le flow recommandé)

Limite assumée : le device cible doit séparément créer sa passkey et exposer
son owner address — pas encore d'écran « join existing wallet » côté device
cible. À itérer en 0.3+ (QR ou signature WebAuthn distante).

### 18.4 Cache recovery request (§11 ligne 5)

`getRecoveryRequest()` faisait deux RPC calls (`getRecoveryRequest` +
`threshold`) à chaque page load → ~500ms-1s de latence sur le premier render.

- `wallet.types.ts` : `SerializedRecoveryRequest` (executeAfter en hex pour
  être JSON-safe, `cachedAt: unix ms`) + champ optionnel `recoveryRequestCache`
  dans `StoredWallet`.
- `wallet.service.ts` : `getCachedRecoveryRequest()` synchrone (juste lit
  `localStorage` et désérialise le bigint). `getRecoveryRequest()` met à jour
  le cache après chaque refresh on-chain réussi.
- `page-wallet.component.ts` : `ngOnInit` pré-remplit `this.recoveryRequest`
  via le cache synchroniquement, puis `refreshRecoveryRequest()` tourne en
  async — l'UI affiche la dernière valeur connue sans attendre le RPC.

Note : le cache n'est pas TTL'd. Pour une fenêtre de fraîcheur stricte, le
component peut comparer `cachedAt` à `Date.now()` et invalider au-delà d'un
seuil. Hors scope MVP.

### 18.5 Fichiers modifiés

```
packages/vit-core/package.json
  + exports['./preflight']

packages/vit-pay-app/package.json
  ~ "kng2-web3": "file:../karibou-web3" → "*"

packages/vit-pay-app/src/app/wallet/
  wallet.types.ts             + UserOperationDebug, PreflightWarning,
                                SerializedRecoveryRequest, champs sur
                                StoredWallet et UserOperationResult
  wallet.service.ts           + import 'kng2-web3/preflight'
                              + stringifyUserOp helper
                              + buildDebug closure dans executeSponsoredUserOp
                              + runPreflight, addOwnerByAddress,
                                getCachedRecoveryRequest
                              ~ getRecoveryRequest met à jour le cache
                              ~ sendZchfPayment appelle runPreflight

packages/vit-pay-app/src/app/pages/page-wallet/
  page-wallet.component.ts    + externalOwnerAddress field
                              + formatDebug, copyDebug, addOwnerByAddress
                              ~ ngOnInit pré-remplit recoveryRequest depuis
                                le cache synchroniquement
  page-wallet.component.html  + <details> debug sur 4 sections
                              + section F4 « Option B — par address »
                              + warning préflight au-dessus du paiement
```

### 18.6 Vérifications

- `ng build --configuration=development` : ✅ 4.16 MB, 0 erreur, 2.8 s.
- Couplage abstractionkit toujours confiné à `wallet.service.ts` (+ `lib/userOp.ts`
  qui est une primitive, intentionnel). Grep `from 'abstractionkit'` dans
  `src/app/pages/` : 0 hit ✓.
- L'augmentation de bundle (3.41 → 4.16 MB, +740 KB) vient de `vit-core`
  important `ethers` séparément ; esbuild ne semble pas dédupliquer les deux
  copies (vit-pay-app a déjà ethers en dep directe). Optimisation possible
  via alias TS si bundle size devient un problème — hors scope 0.2.

### 18.7 Suite

Dette restante du §11 :

- Itération 0.3 : limites journalières / guards
- Itération 0.4 : migration `relay-kit` Safe officiel, suppression
  `vit-mint/`/`vit-passkey/` historiques, tests E2E Cypress/Playwright.

Le MVP 0.1 est désormais complet sur F1-F6 (avec préflight et flow F4
acceptables pour démo).

---

## 19. Itération 0.3 — Limites journalières / guards

**Date** : 2026-06-09
**Statut** : Implémenté, build OK (4.17 MB, 0 erreur). À tester côté browser.

L'autre item §11 d'itération 0.3 (persistance `recoveryRequestId`) a été
traité en §18.4 par anticipation. Reste à livrer ici : **limites journalières**
(garde côté client avant signature).

### 19.1 Décisions

- **Côté client uniquement.** La limite est un garde-fou UX/UI, pas une
  protection on-chain. Un utilisateur déterminé peut vider son `localStorage`
  pour la contourner — l'objectif est de prévenir les transactions
  accidentelles ou les drainers automatisés qui ne touchent pas au storage.
- **Timezone locale**, pas UTC : « aujourd'hui » correspond à la perception
  utilisateur. Reset au passage de minuit local.
- **Compteur stocké dans `StoredWallet`** (un seul blob, conforme §3.3 du
  journal), pas dans une clé séparée. Format `{ date: 'YYYY-MM-DD', spentWei: '0x…' }`.
- **Limite configurable** dans `WalletConfig.maxDailyZchfAmount` (bigint
  wei). `undefined` = pas de limite (l'UI masque l'indicateur).
- **Compte uniquement les `sendZchfPayment` réussis.** Les mints, ajouts
  d'owner, recovery n'incrémentent pas. Si l'UserOp échoue, le compteur ne
  bouge pas (incrément après `result.success`).

### 19.2 Implémentation

- `wallet.types.ts` : interface `DailySpendingTracker` + champ optionnel
  `dailySpending?` sur `StoredWallet`.
- `wallet-config.ts` : champ `maxDailyZchfAmount?: bigint` sur `WalletConfig`,
  propagé depuis `environment.*`.
- `environment.development.ts` : `maxDailyZchfAmount: 1000n * 10n ** 18n`
  (1000 ZCHF par jour en dev). À ajuster en `environment.ts` pour prod.
- `wallet.service.ts` :
  - Helper privé `todayLocalIso()` (YYYY-MM-DD timezone navigateur).
  - Méthode publique `getDailySpending()` retourne
    `{ spentToday, limit?, remaining?, date }`. Détecte le rollover de jour
    en comparant `stored.dailySpending.date` à `todayLocalIso()` — si
    différent, `spentToday = 0n`.
  - `checkDailyLimit(amount)` (privé) : throw si `spentToday + amount > limit`.
    Message localisé en FR avec les montants formatés.
  - `incrementDailySpending(amount)` (privé) : appelé après succès. Lit le
    tracker courant, ajoute le montant, persiste.
  - `sendZchfPayment` : `checkDailyLimit` AVANT le préflight (pas la peine
    de signer si déjà dépassé), `incrementDailySpending` APRÈS succès UserOp.
- `page-wallet.component.{ts,html}` :
  - Champ `dailySpending` rafraîchi dans `refreshBalance()`.
  - Helper `formatWei(bigint)` pour l'affichage.
  - Card « Envoyer ZCHF » : bannière `daily-limit` au-dessus du formulaire
    avec « X / Y ZCHF dépensé (reste Z) ». Masquée si `limit === undefined`.

### 19.3 Pourquoi pas de TTL fin / sliding window

Le journal §18.4 avait noté qu'un TTL pour le cache recovery serait
overkill ; même logique ici. Une fenêtre glissante 24 h serait plus précise
qu'un reset à minuit local, mais nécessiterait de stocker l'historique
horodaté des transactions du jour pour pouvoir soustraire celles > 24 h.
Hors scope MVP 0.3 — le reset à minuit local est suffisant pour le
garde-fou UX.

### 19.4 Fichiers modifiés

```
packages/vit-pay-app/src/app/wallet/
  wallet.types.ts             + DailySpendingTracker + StoredWallet.dailySpending
  wallet-config.ts            + WalletConfig.maxDailyZchfAmount
  wallet.service.ts           + todayLocalIso helper
                              + getDailySpending, checkDailyLimit,
                                incrementDailySpending
                              ~ sendZchfPayment : check avant + increment après

packages/vit-pay-app/src/environments/
  environment.development.ts  + maxDailyZchfAmount: 1000 ZCHF

packages/vit-pay-app/src/app/pages/page-wallet/
  page-wallet.component.ts    + dailySpending state, formatWei helper
                              ~ refreshBalance lit le tracker
  page-wallet.component.html  + bannière daily-limit dans card Envoyer
```

### 19.5 Vérifications

- `ng build --configuration=development` : ✅ 4.17 MB, 0 erreur, 2.8 s.
- Aucun couplage abstractionkit hors `wallet.service.ts` / `lib/userOp.ts`.
- Couverture des paths : `sendZchfPayment` est l'unique entrée pour
  augmenter le compteur ; `mintTestZchf`, `addDeviceWithPasskey`,
  `addOwnerByAddress`, `enableRecovery`, `finalizeRecovery` ne touchent pas
  au tracker (confirmé par grep `incrementDailySpending` → 1 hit).

### 19.6 Suite

Itération 0.3 complète. Reste pour 0.4 (§11) :

- Migration `relay-kit` (Safe officiel) — L
- Suppression `vit-mint/` + `vit-passkey/` démos historiques — S
- Tests E2E Cypress / Playwright — L

---

## 20. Fix 4 — UV flag manquant dans authenticatorData (AA24 réapparu)

**Date** : 2026-06-11
**Statut** : Implémenté + validé E2E (mint tx
`0xfd9caba170749b8327538bd96eaf410664b38643669a65062475add11c0c8770`).
**Méthodologie** : skill `~/.claude/skills/debug` (5 Whys + hypothèses rankées
+ commit-then-instrument).

### 20.1 Symptôme

AA24 revenu sur le clic « Recevoir » (mint MockZCHF init). Erreur identique
à §16.1 : `bundler eth_sendUserOperation rpc call failed → Invalid UserOp
signature or paymaster signature` (code -32507).

Particularité : Fix 3 (§17) toujours en place côté code et vérifié — 5
overrides webauthn canoniques propagés à tous les call sites. Contrats Safe
v0.2.1 toujours déployés sur Sepolia (vérifié via `eth_getCode`). Aucun
changement de version abstractionkit (`0.3.8`). `localStorage` vidé,
nouveau passkey créé, même résultat.

### 20.2 Investigation

Hypothèses écartées :
- `localStorage` stale (testé : vidé)
- Régression `abstractionkit` (version 0.3.8 inchangée)
- Contrats canoniques absents sur Sepolia (`eth_getCode` → bytecode présent
  sur les 4 adresses : SharedSigner, SignerSingleton, SignerFactory,
  DaimoVerifier)
- Sender déjà déployé (`eth_getCode` sur `0xCDE483D…` → `0x`)
- Call site sans overrides (grep exhaustif : tous overrides propagés)

### 20.3 Cause racine

Décodage byte-par-byte du `authenticatorData` extrait de la `signature` du
userOp (récupéré via la card debug §18.1) :

```
49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763  rpIdHash (32 bytes)
19                                                                  flags (1 byte)
00000000                                                            signCount (4 bytes)
```

**`flags = 0x19 = 0b00011001`** :
- bit 0 (UP / User Present) : 1 ✅
- **bit 2 (UV / User Verified) : 0 ❌**
- bit 3 (BE / Backup Eligibility) : 1
- bit 4 (BS / Backup State) : 1

Le `SafeWebAuthnSharedSigner` canonique v0.2.1 (`0x94a4F6af…`) vérifie
`flags & AUTH_FLAG_MASK == AUTH_FLAG_MASK` avec `AUTH_FLAG_MASK = 0x05`
(UP|UV). UV manquant → `isValidSignature` revert → `validateUserOp` revert →
AA24 côté bundler.

§16.3 du journal vérifiait la signature mathématiquement (`crypto.subtle.verify`
P-256 → VALID) mais **n'inspectait pas les flags**. C'est ce qui a été manqué
à l'époque — la sig math-valide passe le verifier P-256 mais échoue le check
de flags qui vient avant.

### 20.4 5 Whys

```
Why 1 : AA24 ? → isValidSignature revert on-chain.
Why 2 : pourquoi revert si math OK ? → flags WebAuthn check échoue (UV=0).
Why 3 : pourquoi UV=0 ? → navigator.credentials.get() retourne UV=0.
Why 4 : pourquoi UV=0 retourné ? → userOp.ts:43 oublie userVerification:'required'.
Why 5 : pourquoi oublié ? → default WebAuthn = 'preferred' → l'authenticator
        peut skipper la biométrie (Windows Hello via PIN seul p.ex.).

Racine : `signAndSendUserOp` appelle `navigator.credentials.get` sans
`userVerification: 'required'`. Sur device en mode PIN sans biométrie, UV
est silencieusement omis. SharedSigner Safe v0.2.1 strict → AA24.
```

Pourquoi Fix 3 avait validé E2E à l'époque : sur le device test, biométrie
active → UV=1 par défaut malgré 'preferred'.

### 20.5 Solution

Deux modifications dans `packages/vit-pay-app/src/lib/userOp.ts` :

1. **Force UV requis** dans `navigator.credentials.get` :

   ```ts
   const assertion = (await navigator.credentials.get({
     publicKey: {
       challenge: ethers.getBytes(safeInitOpHash),
       allowCredentials: [{ type: 'public-key', id: hexStringToUint8Array(passkey.rawId)}],
       userVerification: 'required',  // ← AJOUT
     },
   }))
   ```

2. **Assert détection précoce** après réception de l'assertion, avant tout
   formatage de signature. Throw avec message FR explicite si flags
   insuffisants — l'utilisateur sait quoi faire (activer Touch ID / Face ID
   / Windows Hello biométrique) au lieu de voir un AA24 cryptique :

   ```ts
   const authData = new Uint8Array(assertion.response.authenticatorData)
   const flags = authData[32] ?? 0
   const AUTH_FLAG_MASK = 0x05
   if ((flags & AUTH_FLAG_MASK) !== AUTH_FLAG_MASK) {
     throw new Error(`WebAuthn flags insuffisants (0x${flags.toString(16)…})`)
   }
   ```

### 20.6 Fichiers modifiés

```
packages/vit-pay-app/src/lib/userOp.ts
  ~ navigator.credentials.get : + userVerification: 'required'
  + assert AUTH_FLAG_MASK = 0x05 sur authenticatorData[32]
```

### 20.7 Vérifications

- E2E : nouveau wallet (`localStorage` vidé), mint MockZCHF inclus, tx
  `0xfd9caba170749b8327538bd96eaf410664b38643669a65062475add11c0c8770`
  sur Sepolia ✅
- Assert : si l'utilisateur force PIN seul, message clair au lieu d'AA24
  cryptique — pas testé E2E (nécessite device sans biométrie)

### 20.8 Suite

Itération 0.4 (§11) inchangée. Ajouter à la dette :

- Test E2E qui vérifie spécifiquement le path UV=0 → message d'erreur clair
  (mock `navigator.credentials.get`)
- Vérifier que `addDeviceWithPasskey`, `enableRecovery`, `finalizeRecovery`
  utilisent bien le même `signAndSendUserOp` (donc bénéficient du fix) —
  confirmé par grep : oui, single entry point.
