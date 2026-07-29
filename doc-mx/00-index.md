# Documentation vit-evm — MVP 0.1

État au **2026-07-28** (V1.1 : codes guardians SocialRecoveryModule). Issu du split de `SYNTHESE-MVP-0.1.md`.

## Table des matières

| Nº | Document | Contenu |
|---|---|---|
| 01 | [Overview](01-overview.md) | Couverture spec F1-F6, résumé exécutif |
| 02 | [Architecture](02-architecture.md) | Stack, isolation `abstractionkit`, codes guardians V1.1, garde-fous UX, tests, dette |
| 03 | [Contracts](03-contracts.md) | Contrats déployés (Sepolia / Optimism), toolchain, détail `VitClaimLink` v2 + procédure de déploiement |
| 04 | [UX](04-ux.md) | Guard wallet, ThemeService + presets, mode dev, IBAN holo-card, wizard `/iban` |
| 04bis | [UX Wireframes](04-ux-wireframes.md) | Produit minimal P0–P8 + landing `<nom>@vit.swiss` / vault / restore |
| 05 | [Intégration Mt Pelerin](05-integrations-mtpelerin.md) | Flow buy/sell, debug URLs, limites |
| 06 | [Debug log](06-debug-log.md) | Bugs résolus : WebAuthn AA24 (fix 3 & 4), claim link `NotPending()`, piège OZ 5.5 / hoisting npm, `.env` Hardhat |
| 07 | [Découpler Candide](07-paymaster-decoupling.md) | 4 niveaux (switch provider → self-host → bypass ERC-4337) |
| 08 | [Dead code](08-dead-code.md) | Audit code orphelin + plan de nettoyage |
| 09 | [Changelog](09-changelog.md) | Itérations 0.1 → 0.4 puis V1 / V1.1, par dates |
| 10 | [Audit sécurité](10-security-audit.md) | Findings P0/P1/P2 + roadmap |
| 11 | [Audit FINMA](11-finma-audit.md) | Statut juridique LBA / LSFin / DLT Act / nLPD + reco |

## Sources liées

- Spec MVP : `packages/VIT-MVP-0.1.tmp.md`
- Journal d'implémentation : `packages/VIT-MVP-0.1-JOURNAL.md`
- Guide assistants Claude : `CLAUDE.md` (racine)
