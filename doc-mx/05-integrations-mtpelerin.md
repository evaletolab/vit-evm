# 05 — Intégration Mt Pelerin

## Route & UI

- **Route `/iban`** (guard wallet), tuile « IBAN · Mt Pelerin » sur Profil.
- **`PageIbanComponent`** :
  - Toggle Acheter / Vendre (`mode: 'buy' | 'sell'`).
  - Champ Montant optionnel (`bsa` = buy-source-amount en CHF, `bda` = buy-destination-amount en xCHF selon le mode).
  - Affichage de l'adresse du Safe avec bouton « Copier » (clipboard API, fallback `window.prompt`).
  - CTA principal qui ouvre le widget Mt Pelerin **dans un nouvel onglet** (`window.open(url, '_blank', 'noopener,noreferrer')`).

## URL construite

```
https://buy.mtpelerin.com/?
  lang=fr
  &tab=buy
  &tabs=buy,sell
  &type=direct-link
  &bsc=CHF
  &bdc=XCHF
  &crys=XCHF
  &net=optimism_mainnet
  &nets=optimism_mainnet,mainnet
  &addr=<safeAccountAddress>
  &bsa=<amount>   (ou &bda=<amount> en mode sell)
```

Même schéma pour `https://sell.mtpelerin.com/`. Les deux redirigent en 301 vers `widget.mtpelerin.com`.

**Pré-injection** de l'adresse via `WalletService.getState() ?? loadWallet()`.

## Pourquoi pas d'iframe (debug)

Première implémentation : iframe plein-écran avec URL `bypassSecurityTrustResourceUrl`. Bundle OK, mais le widget retourne **« Accès refusé / contactez l'administrateur du site »**.

**Cause racine** : Mt Pelerin rejette l'embed quand le `referrer` n'est pas dans leur allowlist partenaire et qu'il n'y a pas de token `_ctkn` signé. Le mode « public widget » ne fonctionne qu'en navigation directe (nouvel onglet).

**Fix** : suppression de l'iframe et `DomSanitizer`, remplacement par un bouton CTA → `window.open(url, '_blank')`. Marche immédiatement sans inscription partenaire ; UX dégradée (perte du contexte in-app) acceptable pour une v1.

**Upgrade path** : s'inscrire au programme partenaire Mt Pelerin pour récupérer `code` + secret HMAC, re-câbler l'iframe avec `_ctkn` signé et domaine `vit.app` (ou équivalent) allowlisté.

## Debug : URL d'inscription Mt Pelerin

Tentatives successives pour le bouton « Lancer la KYC » :

| Tentative | URL | Résultat |
|---|---|---|
| 1 | `https://buy.mtpelerin.com/?...` (widget Buy) | UX confuse : user atterrit sur formulaire d'achat sans contexte « inscription » |
| 2 | `https://www.mtpelerin.com/fr/sign-up` | Page marketing (FAQ + description produit), pas le formulaire |
| 3 | `https://app.mtpelerin.com/sign-up` | SPA Bridge Wallet, route inconnue → redirige sur l'écran Buy CHF→BTC |
| ✅ final | `https://buy.mtpelerin.com/?...` (widget Buy) + texte explicite | Aligné avec le flow réel Mt Pelerin : inscription = via widget, KYC déclenché au paiement |

Conclusion : **pas de route d'inscription publique standalone chez Mt Pelerin pour les non-partenaires**. Le flow canonique est buy-widget → register → KYC → payment. Pour une vraie API d'inscription découplée → programme partenaire (contrat B2B + signature HMAC côté backend).

## Limites connues

- Mt Pelerin n'opère que sur mainnets ; en dev sur **Sepolia**, le widget acceptera l'adresse mais aucune crypto ne sera livrée sur Sepolia. `net=optimism_mainnet` codé en dur ; à brancher sur le `chainId` runtime quand on déploiera sur Optimism mainnet.
- IBAN stocké en clair dans `localStorage['vit-iban']` (pas de chiffrement). Acceptable car l'IBAN n'est pas un secret (numéro de compte public), mais à noter dans l'audit P2.
- Pas de récupération auto de l'IBAN depuis Mt Pelerin : le user doit le copier-coller manuellement depuis leur portail. À automatiser via leur API partenaire (cf. ci-dessus).

## Où l'IBAN est stocké

1. **Chez Mt Pelerin** (source de vérité) — base régulée FINMA, associée au compte KYC. Récupérable dans `app.mtpelerin.com` → section Bank/IBAN.
2. **Dans vit-evm** (copie locale) — `localStorage['vit-iban']` du navigateur de chaque device, saisi manuellement via le wizard `/iban`. Pas synchronisé entre devices, pas on-chain. Sert à l'affichage sur la holo-card uniquement.

## Voir aussi

- [04 — UX](04-ux.md#wizard-iban--4-étapes) — wizard détaillé
- [04 — UX](04-ux.md#iban-affiché-sur-la-carte-holo-card) — affichage sur la carte
