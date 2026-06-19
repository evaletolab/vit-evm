# 08 — Dead code (snapshot 2026-06-17)

Audit du code déclaré mais non consommé en production. Ne couvre pas les tests : les symboles « test-only » sont des candidats à isoler hors du barrel public (`index.ts`) si non destinés à être API.

## vit-core

**Fichiers entiers à supprimer ou à isoler hors du barrel** (aucun import depuis vit-pay-app, et exportés via `src/index.ts`) :

- `packages/vit-core/src/defi.aave.ts` — `aaveDeposit`, `aaveDepositedAmount`, `aaveInterest`, `aaveLendingPools`, `aaveLendingProposals`, `encodeAaveSupply`, `encodeAaveWithdraw`. Aucune référence externe.
- `packages/vit-core/src/defi.rocketpool.ts` — `rocketPoolStake`, `rocketPoolStakedAmount`, `rocketPoolInterest`. Aucune référence externe.
- `packages/vit-core/src/defi.uniswap.ts` — `swap`, `encodeSwapExactTokensForTokens`. Duplication avec `core.safe.4337.ts:buildSwapToZchf` qui est la version réellement utilisée → consolider ou supprimer.
- `packages/vit-core/src/core.horcrux.ts` — `publish`, `restore`. Contrat associé (`Horcrux.sol`) lui-même non déployé (voir §vit-safe-modules).

**Symboles test-only** (utilisés uniquement par `packages/vit-core/test/*.spec.ts`, mais exportés publiquement via `index.ts`) :

- `core.SSS.ts` : `createShamirSecretFromSeed`, `combineShamirSecret`
- `core.derivation.ts` : `derivationFromSeed`, `createFromKey`, `isValidPrivateKey`
- `core.entropy.ts` : `retrieveEntropy`, `createMnemonic`, `isValidMnemonic`, `randomDigits`
- `tools.ts` : `numberToKecc256`, `nonStdMnemonicToBytes`, `bytesToNonStdMenomnic`

**Décision à prendre** : si ces APIs sont destinées aux consommateurs externes du package `kng2-web3` (digital identity / horcrux), garder l'export et le documenter ; sinon, retirer du barrel et passer en `internal`.

**Dépendance npm non importée** :
- `secrets.js-34r7h` dans `packages/vit-core/package.json`. Aucun import dans le code source.

## vit-pay-app

**Code applicatif** : aucun fichier orphelin, aucun composant Angular non utilisé, toutes les routes (`/`, `/account`, `/buy`, `/sent`, `/txs`, `/wallet`, `/iban`, `/links`, `/claim`) sont atteignables.

**Dépendances npm non importées** :
- `store` (^2.0.12) dans `dependencies`. Aucun `from 'store'` dans `src/`.
- `@types/qrcode` (^1.5.6) dans `devDependencies`. `qrcode` (runtime) embarque déjà ses types depuis v1.5 — types redondants.

## vit-safe-modules

**Contrats à retirer** :
- `contracts/Horcrux.sol` — non déployé par `scripts/deploy.js`, aucun test (`test/` ne le mentionne pas), aucune référence repo.
- `contracts/Lock.sol` — template par défaut de Hardhat, testé seulement par `test/Lock.js` (boilerplate), non intégré au système ViT.

**Mocks légitimes** (à conserver) : `MockERC20.sol` (utilisé par `test/Vit.Escrow.js` + `scripts/deployMockZchf.js`), `MockSafe.sol` (utilisé par `test/Vit.SafeModule.Withdrawal.js`).

## Plan de nettoyage suggéré

| Priorité | Action | Gain |
|---|---|---|
| P1 | Supprimer `Horcrux.sol`, `Lock.sol` + `test/Lock.js` | Réduit surface contrats |
| P1 | Retirer `defi.aave.ts`, `defi.rocketpool.ts`, `defi.uniswap.ts` du barrel `index.ts` (ou supprimer) | Réduit bundle frontend, élimine duplication Uniswap |
| P1 | Supprimer `core.horcrux.ts` (alignement avec suppression du contrat) | Cohérence |
| P2 | Statuer sur SSS / derivation / entropy / horcrux test-only → API publique ou interne | Clarifie le contrat de `kng2-web3` |
| P3 | Retirer `store`, `@types/qrcode`, `secrets.js-34r7h` des `package.json` | `npm i` plus rapide, lockfile plus propre |
