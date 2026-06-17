# CLAUDE.md — vit-evm

Guide pour assistants Claude travaillant sur ce monorepo.

## Vue d'ensemble

**vit-evm** (« ViT Isn't TWINT ») : wallet numérique style TWINT pour paiements **xCHF** sur Ethereum L2, basé sur **ERC-4337** (account abstraction) + **Safe Account v0.3** + passkeys WebAuthn (P-256). Auteur : C3PO. Licence LGPL-3.0.

Réseau dev : Sepolia (chainId `11155111`). Cible prod : Optimism.

## Structure du monorepo

npm workspaces, racine à `C:\Users\Maxence\Desktop\kari\vit-evm`.

| Package | Rôle | Entrypoints |
|---|---|---|
| `packages/vit-core` | SDK ERC-4337 + SafePasskey + DeFi (Aave, Uniswap) | `dist/index.js`, exports subpath `kng2-web3/preflight`, `kng2-web3/paymaster`, … |
| `packages/vit-pay-app` | Front Angular 18 (wallet, paiement, recovery) | `src/main.ts`, `app.module.ts` |
| `packages/vit-safe-modules` | Contrats Solidity ERC-7579 (Recovery, WebAuthn, PaymentGuard) | Hardhat, `contracts/`, scripts deploy |

Le package vit-core est publié sous le nom **`kng2-web3`** (legacy). Dans `vit-pay-app/package.json` la dépendance est `"kng2-web3": "*"` → résolue via workspace local. **Ne pas importer le barrel `from 'kng2-web3'`** : il tire `@safe-global/protocol-kit` qui casse en browser (require `buffer`). Utiliser les subpath exports ciblés.

Docs racine : `README.md`, `ERC4337.md`, `DIGITALID.md`, `SYNTHESE-MVP-0.1.md`. Journal d'implémentation : `packages/VIT-MVP-0.1-JOURNAL.md`.

## Conventions

- **Commits** : conventional commits français + scope, ex. `feat(wallet): ...`, `chore(deps): ...`, `docs(core): ...`
- **TS strict** activé partout (`strict: true`, `noImplicitOverride: true`)
- **Encodage frontend** : Angular 18 builder `@angular-devkit/build-angular:application` (esbuild). Le `serve` autorise tous les hosts (`allowedHosts: ["all"]` dans `angular.json`) pour tunnels publics.
- **CommonJS whitelistés** dans `angular.json/allowedCommonJsDependencies` : `@shoelace-style/shoelace`, `jsqr`, `qrcode`, `buffer`. Ajouter à cette liste avant d'importer un nouveau CJS package.
- **Polices** : Inter via Google Fonts (cf. `index.html`).

## Flux MVP 0.1 (état au 2026-06-11)

Implémenté (F1/F3/F5/F6 ✅, F2/F4 partiels) — voir le **journal** pour le détail des fixes WebAuthn et des itérations 0.2/0.3.

Points clés :
- **Override des 5 addresses WebAuthn** canoniques Safe Passkey Module v0.2.1 dans `wallet.service.ts` (fix journal §17).
- **`userOp.ts`** ajoute `userVerification: 'required'` à `credentials.get` (fix §17 bis du 2026-06-11) — sinon AA24 sur Windows Hello PIN.
- **Limite journalière** côté client (`maxDailyZchfAmount = 1000n` ZCHF en dev), trackée dans `StoredWallet.dailySpending`, reset minuit local. **Garde-fou UX, pas une protection on-chain.**
- **Preflight anti-scam** wired dans `sendZchfPayment` (allow/warn/block).

Wallet fresh : `localStorage.removeItem('vit-wallet')` dans devtools.

## Audit (snapshot 2026-06-11)

### 🔴 P0 — bloquant / risque grave

1. **Private key hardcodée** — `packages/vit-pay-app/scripts/guardian-trigger-recovery.mjs:11` : `GUARDIAN_PK = '0xac0974be…'` (compte Hardhat #0, publiquement connu mais en repo). Fix : déplacer en `.env.local` + `dotenv`, ne jamais commit de PK.
2. **localStorage non chiffré pour credentials passkey** — `wallet-storage.service.ts` stocke `credentialId` + coordonnées pubkey en clair. Exposé à toute XSS. Fix : chiffrer le blob ou minimum migrer credentialId vers sessionStorage + revoke au logout.

### 🟠 P1 — sérieux

3. **Limite journalière** purement client-side (cf. `wallet.service.ts:244+`). Modifiable via devtools. Fix : enforcer via paymaster policy ou backend.
4. **Recovery sans UI cancel + cache localStorage** — si recovery malicieuse lancée, user bloqué jusqu'à `executeAfter`. Fix : exposer `cancelRecovery()` dans UI + vérifier `executeAfter <= block.timestamp` avant `finalize`.
5. **Pas de risk screening backend** — `core.safe.preflight.ts` est local-only, allowlist hardcodée. Vulnérable à un router malicieux non détecté localement. Fix : ajouter endpoint backend (Goplus/Blockaid) en complément.
6. **Pas de CI/CD** — aucun `.github/workflows/`. `npm run build` + tests non automatisés. Fix : workflow GitHub Actions au minimum lint+build+test sur PR.
7. **Recovery guardian** doit payer gas (`executeRecovery` non sponsorisé). Si guardian sans ETH, recovery bloquée. Fix : sponsoriser ces calls via paymaster guardian-specific.

### 🟡 P2 — qualité / maintenabilité

8. **`wallet.service.ts` = 677 LoC** — mélange storage + UserOp + preflight + DeFi. Découper en `RecoveryService`, `DailySpendingService`.
9. **DER signature parsing** — `lib/passkeys.ts:147+` suppose lengths < 256 bytes. Pour P-256 OK mais fragile. Préférer crypto.subtle ou ethers.
10. **Duplication `buildErc20Approve`** entre `core.safe.4337.ts` et `core.safe.preflight.ts`. Extraire en helper commun.
11. **Tests coverage faible** — 27 specs vs ~8k fichiers (0.3%). Couvrent utils + storage. Pas de test UserOp, preflight, recovery.
12. **Budget Angular augmentés** — `angular.json` initial 2/3 MB, anyComponentStyle 8/12 kB. À surveiller pour ne pas masquer un dérapage de bundle.
13. **Dépendance unique à Candide** (RPC + bundler + paymaster). Si Candide down → wallet inutilisable. Fix : multi-provider fallback.
14. **TODO non critique** — `core.safe.paymaster.ts:212` : Stackup token paymaster non implémenté (stub).

### ✅ OK

- TS strict partout
- Pas de seed phrase / mnemonic / secrets RPC en repo (vérifié `environment.*.ts`)
- Architecture Safe + ERC-4337 + Passkey solide

## Pour développer sur ce repo

- Démarrer le front : `cd packages/vit-pay-app && npm start`
- Build : `npm run build` (peut warner sur budgets si refonte styles)
- Tester sur phone : `cloudflared tunnel --url http://localhost:4200` → URL HTTPS valide pour WebAuthn (l'IP LAN ne marche pas — WebAuthn refuse les domaines non-FQDN)
- Logs UserOp : la page `page-wallet` affiche le bloc `Debug UserOperation` (collapsible) avec JSON complet + bouton "Copier"
- Reset wallet pour test : devtools → `localStorage.removeItem('vit-wallet')` puis reload

## Pour assistants Claude

- L'arborescence des composants Angular suit la convention `selector="vit-*"` (cf. `angular.json/prefix`).
- Quand on ajoute un nouveau package CJS, le déclarer dans `allowedCommonJsDependencies` sinon warning au build.
- Les modifications de palette UI passent par les vars CSS `--vit-color-*` dans `src/styles.scss`. Les composants utilisent ces vars + classes utilitaires `.vit-card`, `.vit-chip`.
- Pour tout changement touchant à la sécurité wallet (passkeys, recovery, paymaster, limit) : référencer le journal `packages/VIT-MVP-0.1-JOURNAL.md` et y ajouter une entrée.
