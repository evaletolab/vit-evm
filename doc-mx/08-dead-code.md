# 08 — Dead code (snapshot 2026-06-17, statuts mis à jour 2026-07-26)

Audit du code déclaré mais non consommé en production. Ne couvre pas les tests : les symboles « test-only » sont des candidats à isoler hors du barrel public (`index.ts`) si non destinés à être API.

**Mise à jour V1** : la décision « pas de Horcrux on-chain » tranche plusieurs points ouverts ci-dessous. `core.horcrux`, `core.SSS` et leurs ré-exports dans `index.ts` portent désormais une annotation `@deprecated` (suppression réelle à programmer, une fois les consommateurs externes de `kng2-web3` confirmés). `Horcrux.sol` porte le même marquage.

## vit-core

**Fichiers entiers à supprimer ou à isoler hors du barrel** (aucun import depuis vit-pay-app, et exportés via `src/index.ts`) :

- `packages/vit-core/src/defi.aave.ts` — `aaveDeposit`, `aaveDepositedAmount`, `aaveInterest`, `aaveLendingPools`, `aaveLendingProposals`, `encodeAaveSupply`, `encodeAaveWithdraw`. Aucune référence externe.
- `packages/vit-core/src/defi.rocketpool.ts` — `rocketPoolStake`, `rocketPoolStakedAmount`, `rocketPoolInterest`. Aucune référence externe.
- `packages/vit-core/src/defi.uniswap.ts` — `swap`, `encodeSwapExactTokensForTokens`. Duplication avec `core.safe.4337.ts:buildSwapToZchf` qui est la version réellement utilisée → consolider ou supprimer.
- `packages/vit-core/src/core.horcrux.ts` — `publish`, `restore`. Contrat associé (`Horcrux.sol`) non déployé. **Marqué `@deprecated`**. Recovery V1.1 = `vit-pay-app/wallet/recovery-codes.ts` + SocialRecoveryModule.
**Symboles test-only** (utilisés uniquement par `packages/vit-core/test/*.spec.ts`, mais exportés publiquement via `index.ts`) :

- `core.SSS.ts` : `createShamirSecretFromSeed`, `combineShamirSecret` — **marqué `@deprecated` en V1** (le partage de secret Shamir n'est plus dans le plan produit)
- `core.derivation.ts` : `derivationFromSeed`, `createFromKey`, `isValidPrivateKey`
- `core.entropy.ts` : `retrieveEntropy`, `createMnemonic`, `isValidMnemonic`, `randomDigits`
- `tools.ts` : `numberToKecc256`, `nonStdMnemonicToBytes`, `bytesToNonStdMenomnic`

**Décision à prendre** : si ces APIs sont destinées aux consommateurs externes du package `kng2-web3` (digital identity / horcrux), garder l'export et le documenter ; sinon, retirer du barrel et passer en `internal`.

**Dépendance npm non importée** :
- `secrets.js-34r7h` dans `packages/vit-core/package.json`. Aucun import dans le code source.

## vit-pay-app

**Code applicatif** : toutes les routes (`/`, `/account`, `/buy`, `/request`, `/sent`, `/txs`, `/wallet`, `/contacts`, `/links`, `/iban`, `/devices`, `/recovery`, `/claim`) sont atteignables.

**Orphelin identifié en V1** : `src/app/pages/vit-welcome/**`, hérité d'un ancien projet, ne compile plus (imports morts, composants non déclarés) et cassait le build des specs. Le dossier est désormais exclu (`tsconfig.spec.json` + `angular.json`) — pansement, pas correctif. `src/app/app.service.ts` n'a plus qu'un seul consommateur, `vit-welcome/kng-desktop.component.ts` : les deux tombent ensemble. **À supprimer.**

**Dépendances npm non importées** :
- `store` (^2.0.12) dans `dependencies`. Aucun `from 'store'` dans `src/`.
- `@types/qrcode` (^1.5.6) dans `devDependencies`. `qrcode` (runtime) embarque déjà ses types depuis v1.5 — types redondants.

## vit-safe-modules

**Contrats à retirer** :
- `contracts/Horcrux.sol` — non déployé par `scripts/deploy.js`, aucun test, aucune référence repo. **Marqué deprecated en V1** (décision : pas de Horcrux on-chain).
- `contracts/Lock.sol` — template par défaut de Hardhat, testé seulement par `test/Lock.js` (boilerplate), non intégré au système ViT.

**Tests à réécrire ou supprimer** (19 échecs permanents sur `npx hardhat test`) :
- `test/Vit.ClaimLink.js` — 12 specs écrits pour l'ABI v1 (`create` à 5 args). Remplacés par `test/VitClaimLink.js` côté v2.
- `test/Vit.Escrow.js` — attend des messages d'erreur OZ v4 (`'Ownable: caller is not the owner'`) alors que OZ 5 renvoie des custom errors ; un cas a aussi un setup de balance incorrect.
- `test/Vit.SafeModule.Withdrawal.js` — fixture qui déploie `null`.

Tant qu'ils échouent, aucune vraie régression n'est visible dans la sortie de test.

**Mocks légitimes** (à conserver) : `MockERC20.sol` (utilisé par `test/Vit.Escrow.js` + `scripts/deployMockZchf.js`), `MockSafe.sol` (utilisé par `test/Vit.SafeModule.Withdrawal.js`).

## Plan de nettoyage suggéré

| Priorité | Action | Gain |
|---|---|---|
| P1 | Supprimer `Horcrux.sol`, `Lock.sol` + `test/Lock.js` | Réduit surface contrats |
| P1 | `backup-kit.ts` (BIP39 owner) | **Supprimé en V1.1** — remplacé par `recovery-codes.ts` |
| P1 | Réparer ou supprimer les 3 suites de tests contrats legacy | Rend la sortie `hardhat test` exploitable |
| P1 | Supprimer `pages/vit-welcome/**` + `app.service.ts`, puis retirer les exclusions de test | Enlève le pansement Karma |
| P1 | Retirer `defi.aave.ts`, `defi.rocketpool.ts`, `defi.uniswap.ts` du barrel `index.ts` (ou supprimer) | Réduit bundle frontend, élimine duplication Uniswap |
| P1 | Supprimer `core.horcrux.ts` (alignement avec suppression du contrat) | Cohérence |
| P2 | Statuer sur SSS / derivation / entropy / horcrux test-only → API publique ou interne | Clarifie le contrat de `kng2-web3` |
| P3 | Retirer `store`, `@types/qrcode`, `secrets.js-34r7h` des `package.json` | `npm i` plus rapide, lockfile plus propre |
