# 07 — Découpler Candide

L'idée directrice : le **smart account reste neutre** (Safe + EntryPoint canoniques), seul le **transport off-chain** est Candide-spécifique. La découpler = changer les pièces remplaçables tout en gardant les contrats.

## Niveau 1 — Switch provider (effort : S, 1 commit)

- Remplacer `bundlerUrl` et `paymasterUrl` dans `environment.ts` par Pimlico (`api.pimlico.io`), Stackup (`api.stackup.sh`) ou Alchemy (`alchemy.com/.../v3`). Tous parlent le même JSON-RPC ERC-4337.
- Le `CandidePaymaster` côté `abstractionkit` doit être remplacé par le client paymaster du nouveau fournisseur (interface différente). C'est ~30 lignes dans `executeSponsoredUserOp`.
- **Conséquence** : on troque un vendor pour un autre. Suffisant pour résilience opérationnelle mais pas pour souveraineté.

## Niveau 2 — Abstraire le `PaymasterProvider` (effort : M, déjà amorcé)

- Commit `3666efc` dans `vit-core` ajoute déjà `PaymasterProvider` interface avec stubs Pimlico + Stackup. La récupérer côté `vit-pay-app` :
  ```ts
  interface PaymasterProvider {
    sponsor(userOp, bundlerUrl, policyId?): Promise<SponsoredUserOp>;
  }
  ```
- Branchement de 2-3 implémentations en parallèle + heuristique de fallback côté `WalletService` (try primary, fallback secondary si 5xx ou timeout > 5s).
- **Conséquence** : si Candide tombe, l'UI bascule auto sur Pimlico/Stackup sans intervention.

## Niveau 3 — Self-host bundler (effort : L, infra)

- Tourner un bundler open-source : Etherspot **Skandha** (TypeScript), Stackup **go-bundler** (Go), Pimlico **alto** (TypeScript). Docker + un RPC node (Infura / Alchemy / Erigon self-hosted).
- Pour le paymaster : déployer son propre `Paymaster` contract (template Safe officiel), funder son entryPoint deposit, signer les sponsorings avec sa propre clé.
- **Conséquence** : zéro dépendance vendor, mais coût opérationnel (uptime, monitoring, refill paymaster).

## Niveau 4 — Bypass ERC-4337 (effort : S, mais perd UX)

- Appel direct `Safe.execTransaction(to, value, data, op, ..., signatures)` depuis n'importe quel EOA. Signatures = passkey via le Safe Passkey Module v0.2.1 (mêmes contrats canoniques).
- **Sacrifice** : l'utilisateur doit avoir un EOA avec ETH pour payer le gas → on perd la sponsorisation et la « zéro-friction » de l'AA. Mais les fonds sont accessibles même si toute l'infra ERC-4337 (bundlers + paymasters) du monde est down.
- **Utilité** : **fallback dernier recours**, à intégrer comme « mode rescue » dans le wallet (bouton « Sortir mes fonds » qui produit une `execTransaction` brute à signer ailleurs).

## Reco MVP 0.4 → 0.5

Implémenter le **niveau 2** comme baseline (un seul switch côté UI), documenter le **niveau 4** comme rescue path dans la FAQ utilisateur. Le **niveau 3** n'a de sens qu'à l'échelle (>10k users) ou pour conformité régulatoire stricte.
