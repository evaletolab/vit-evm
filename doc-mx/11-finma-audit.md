# 11 — Audit réglementaire FINMA

Snapshot 2026-06-19. **Cet audit n'est pas un avis juridique** — il s'appuie sur les publications publiques de la FINMA (Guidance 02/2019 « Travel Rule », Position Paper DLT, Circulaires) et le droit suisse en vigueur (LBA, LSFin, DLT Act, nLPD). Une revue par un cabinet suisse (Lenz & Staehelin, Niederer Kraft Frey, Bär & Karrer, MME) reste indispensable avant tout déploiement commercial.

## Cadre réglementaire potentiellement applicable

| Source | Champ | Pertinence vit-evm |
|---|---|---|
| **LBA / GwG** (Loi sur le Blanchiment d'Argent) | Intermédiaires financiers | Conditionnelle |
| **LSFin / FinSA** (Services financiers) | Conseil/exécution d'ordres | Non |
| **LEFin / FinIA** (Établissements financiers) | Banques, gestionnaires de fortune | Non |
| **DLT Act** (entrée août 2021, modif. CO/LBA/LIMF) | Titres DLT, plateformes DLT | Partielle |
| **FINMA Guidance 02/2019** (Travel Rule) | VASP, transferts crypto | Indirecte (via Mt Pelerin) |
| **nLPD** (1 sept 2023) | Données personnelles | Directe |
| **MiCA** (UE, 2024) | Crypto-actifs UE | Si users UE ciblés |

## 1. Statut vit-evm sous la LBA (anti-blanchiment)

**Question fondamentale** : vit-evm est-il un **intermédiaire financier** au sens de l'art. 2 al. 3 LBA ?

### Analyse

- **Pas de custody** : la passkey est générée et stockée dans le Secure Enclave / TPM du device user. Vit-evm n'a jamais accès aux clés privées. Aucune capacité technique de signer une transaction au nom de l'user.
- **Pas de transfert au nom d'autrui** : chaque UserOp est signé localement par la passkey du user. Le paymaster sponsorise le gas mais ne touche pas aux fonds xCHF.
- **Pas de change** : Mt Pelerin (broker régulé FINMA, n° SO 14939) gère la conversion CHF ↔ xCHF.

**Conclusion provisoire** : vit-evm dans sa forme actuelle **n'est pas un intermédiaire financier au sens de la LBA**. Position cohérente avec la FINMA Guidance « non-custodial wallet providers » (cf. Position Paper DLT 2018 + FAQ DLT 2020).

### Lignes rouges à ne pas franchir

Si l'une des conditions ci-dessous devient vraie, vit-evm deviendrait soumis à autorisation OAR/SRO ou licence FINMA :

| Action | Conséquence | Statut actuel |
|---|---|---|
| Stocker des clés privées côté serveur (backup, MPC server-side) | → Custody → licence | ✅ Évité (passkey device-only) |
| Tenir un solde xCHF mutualisé (pooled wallet, omnibus) | → Dépôt → licence bancaire | ✅ Évité (1 Safe par user) |
| Exécuter des swaps via routeur opéré par nous | → Activité de négoce → LSFin/LBA | ✅ Évité (uniquement transfert) |
| Sponsoriser le gas en conditionnant à une vérification d'identité | → Service financier → LSFin | ⚠️ À surveiller (paymaster Candide) |
| Offrir un service de yield, lending, staking xCHF | → Dépôt rémunéré → licence bancaire | ✅ Non implémenté |
| Recovery centralisée (vit-evm garde un share du secret) | → Custody partielle → licence | ✅ Évité (recovery = guardians choisis par user) |

## 2. xCHF / Frankencoin — statut FINMA

**xCHF (Frankencoin / ZCHF)** : stablecoin décentralisé, over-collatéralisé par des positions cryptos, émis par le protocole Frankencoin (Liechtenstein/Suisse).

### Classification probable

Selon le **Guide pratique FINMA pour les ICOs (2018)** et sa mise à jour 2019 sur les **stablecoins** :

- **Token de paiement** : si pas de claim contre un émetteur (pure crypto, gouvernance décentralisée). Frankencoin se rapproche de ce modèle.
- **Token d'investissement** : si rendement / dividende attaché → CISA / LIMF.
- **Token de dépôt** : si remboursement garanti par un émetteur identifié → licence bancaire requise.

**xCHF** est généralement classé **token de paiement** (pas de claim direct, sur-collatéralisation algorithmique). À confirmer avec la FINMA via une « no-action letter » avant intégration commerciale en CH.

### Impact pour vit-evm

- Recevoir / envoyer xCHF entre wallets self-custody = pas de licence requise pour vit-evm.
- Si on intègre un **swap** (xCHF ↔ autre crypto) opéré par nous, on tomberait sous **LSFin** (services financiers). Aujourd'hui, swap via Uniswap-like fait par l'user dans son propre wallet → OK.

## 3. Mt Pelerin — responsabilité partagée

- **Mt Pelerin SA** est régulée FINMA (membre OAR-G n° 1011, depuis 2018) et opère sous l'art. 2 al. 3 LBA.
- **KYC** : Mt Pelerin identifie l'user, vérifie l'origine des fonds CHF, signale les opérations suspectes au MROS.
- **Travel Rule** (FINMA Guidance 02/2019) : Mt Pelerin doit collecter et transmettre les infos sender/recipient pour les transferts crypto > 1'000 CHF. Pour les achats xCHF vers le Safe vit-evm, Mt Pelerin identifie le bénéficiaire comme **l'utilisateur lui-même** (pas une 3rd party).
- **Vit-evm** n'a aucune obligation Travel Rule tant qu'on ne route pas des fonds d'un user vers un autre via un service nous. ⚠️ Les **claim links** sont à surveiller : si on les présente comme un « service de transfert peer-to-peer », on pourrait basculer sous LBA. La position actuelle (contrat ERC-20 immuable, vit-evm ne touche pas aux fonds, ne facture rien) est défendable comme infrastructure neutre.

## 4. Protection des données — nLPD

Loi suisse révisée sur la protection des données, entrée en vigueur **1 sept 2023**. S'applique à tout traitement de données personnelles d'utilisateurs en Suisse.

### Données collectées par vit-evm

| Donnée | Stockage | Catégorie nLPD |
|---|---|---|
| Adresse Safe (publique on-chain) | localStorage chiffré (P0-2 fix) | Personnelle (pseudonyme) |
| credentialId WebAuthn | localStorage chiffré | Personnelle |
| Liens de paiement (`vit-claimlinks:*`) | localStorage chiffré | Personnelle |
| IBAN saisi manuellement | `localStorage['vit-iban']` (clair) | **Personnelle** (numéro de compte) |
| Préférences thème / mode dev | `localStorage['vit-settings']` | Non-sensible |

**Toutes ces données restent sur le device user, jamais transmises à un serveur vit-evm** (aucun backend déployé à ce jour). Conséquence : **pas de transfert transfrontalier**, pas d'obligation `RoT` (Registre des activités de Traitement) tant que la SPA reste statique et que nous n'enregistrons aucune télémétrie.

### Points à vérifier

| Exigence nLPD | Statut vit-evm |
|---|---|
| Base légale (art. 31) | ✅ Exécution du contrat (l'user crée son wallet) |
| Minimisation (art. 6 al. 3) | ✅ Seule l'IBAN est saisie manuellement, optionnelle |
| Sécurité (art. 8) | ✅ Chiffrement IDB + AES-GCM (cf. [10 — Audit sécurité](10-security-audit.md#p0-2-localstorage-non-chiffré--corrigé)) |
| Transparence (art. 19) | ⚠️ Aucune politique de confidentialité publiée |
| Droit d'accès / effacement (art. 25-32) | ✅ `localStorage.clear()` accessible à l'user |
| RoT (art. 12) | ✅ Pas requis (pas de traitement automatisé à risque) |
| AIPD (art. 22) | ⚠️ À évaluer si on ajoute des fonctionnalités impactantes |
| DPO | ⚠️ Pas requis tant que pas d'employés et pas de profilage |

**Action requise** : publier une **politique de confidentialité** (page `/privacy` ou dans Profil) qui détaille les données traitées et l'absence de backend.

## 5. DLT Act (2021)

La modification du droit suisse (CO, LBA, LIMF) entrée en vigueur en août 2021 introduit :

- **Titres DLT** (art. 973d CO) — non applicable, xCHF n'est pas un titre.
- **Plateforme de négociation DLT** (art. 73a LIMF) — non applicable, vit-evm n'opère pas de venue.
- **Faillite des actifs cryptos** (art. 242a LP) — clarifie que les fonds restituables au client en cas de faillite d'un dépositaire sont ségrégués. Sans pertinence pour self-custody.

## 6. Recommandations FINMA-ready (avant lancement commercial)

| Priorité | Action | Pourquoi | Effort |
|---|---|---|---|
| 🔴 | Solliciter une **no-action letter** FINMA confirmant le statut « non-VASP » de vit-evm | Sécurité juridique avant marketing CH | M (3-6 mois) |
| 🔴 | Faire valider la classification de xCHF par la FINMA | Confirme « payment token » et exclut CISA/LSFin | M |
| 🟠 | Publier une **politique de confidentialité** (nLPD art. 19) | Obligation nLPD + confiance user | S |
| 🟠 | Publier des **CGU** qui qualifient explicitement vit-evm de **logiciel self-custody** (pas de service financier) | Établit le statut juridique en cas de contestation | S |
| 🟠 | Ajouter un **disclaimer** sur la page Carte : « vit-evm ne détient ni vos fonds ni vos clés » | Évite la qualification de service de dépôt | S |
| 🟡 | Documenter l'absence de backend / télémétrie dans `doc-mx/` et dans la confidentiality policy | Preuve de l'architecture non-custodial | S |
| 🟡 | Tracer les **claim links** dans la doc comme « infrastructure ERC-20 neutre » et non « service de transfert » | Évite la qualification d'intermédiaire financier | S |
| 🟡 | Audit du contrat `VitClaimLink` par un cabinet sécurité (CertiK, Quantstamp, ChainSecurity) | Pré-requis pour un public CH | L |
| 🟢 | Affiliation OAR/SRO en stand-by au cas où l'évolution produit vire vers la custody | Plan B juridique | M |

## 7. Spécifique aux fonctionnalités à risque

### Recovery sociale (F5/F6)

- **Statut** : le user choisit lui-même ses guardians. Les guardians sont des EOAs externes, vit-evm ne distribue ni clés ni shares.
- **Risque réglementaire** : **aucun**, tant que vit-evm n'agit pas comme guardian (jamais).
- **Garde-fou** : ne **jamais** proposer une option « vit-evm comme guardian de secours » — ce serait une custody partielle.

### `VitPayment` upgradeable + pausable

- **Statut** : contrat `UUPSUpgradeable + OwnableUpgradeable + AccessControlUpgradeable + PausableUpgradeable` touchant les paiements utilisateurs. Voir analyse technique : [10 — Audit sécurité §P0-3](10-security-audit.md#p0-3--contract-vitpayment--surface-admin-upgradeable--pausable).
- **Risque réglementaire** : le pouvoir technique d'**upgrade** et de **pause** = contrôle de fait sur les fonds → la FINMA peut requalifier vit-evm comme exerçant une **custody effective**, même sans intention de l'utiliser. Cf. Position Paper FINMA DLT §III.3 : « le critère décisif est la capacité de disposer des actifs, pas l'intention ».
- **Conséquences potentielles** : assujettissement LBA → affiliation OAR/SRO ou licence FINMA, obligations KYC sur les payeurs, Travel Rule, MROS. **Refactor non-anodin du business model**.
- **Mitigations recommandées** (cumulables avec celles de §10 P0-3) :
  - Owner = multisig **public** avec membres externes (réduit la qualification d'« unique entité contrôlante »).
  - Timelock 24-48h sur tout upgrade — donne aux users le temps de retirer leurs fonds avant un changement de logique.
  - **Plan de renoncement publié** : engagement contractuel (CGU) à `renounceOwnership()` à T+12 mois post-mainnet → bascule définitive vers immutable → sortie certaine du périmètre custody.
  - Communication transparente dans la doc et les CGU : « vit-evm peut techniquement pause/upgrade jusqu'à T+12 mois pour fixer des bugs critiques ; aucune disposition ne permet à vit-evm de saisir, geler durablement ou détourner des fonds utilisateurs ». À faire valider par un cabinet suisse.
- **Position défendable possible** : si le seul `pause()` autorisé est conditionné à une **circuit-breaker condition objective** (TVL drop > X%, oracle failure) vérifiable on-chain, on peut argumenter que ce n'est pas un pouvoir discrétionnaire mais une mitigation technique. Plus solide juridiquement qu'un pause libre.
- **À éviter absolument** : `pause()` libre + multisig à 1 EOA = configuration qui maximise la qualification VASP et expose à action FINMA même en l'absence d'incident.

### Claim links (envoi par URL)

- **Statut** : contrat ERC-20 immuable. Vit-evm publie un front qui aide à formuler la transaction. L'user signe, le contrat séquestre, n'importe qui avec le secret réclame.
- **Risque** : si présenté comme « payment service », FINMA pourrait y voir une **plateforme de transferts**. Position défendable car (a) pas de fee, (b) pas de routing par nous, (c) contrat immuable.
- **Garde-fou** : éviter dans le marketing tout terme suggérant « service de virement », « transfer service », « payment processor ». Préférer « lien hash-locked », « escrow on-chain », « tooling ».

### Intégration IBAN Mt Pelerin

- **Statut** : Mt Pelerin assume toute la responsabilité réglementaire (KYC, AML, Travel Rule). Vit-evm fournit juste un lien profond et un champ de saisie de l'IBAN.
- **Risque** : aucun pour vit-evm tant qu'on ne perçoit pas de commission sur ces flux et qu'on ne brand pas « powered by vit » au-dessus de leur produit.

## 8. Synthèse statut juridique

| Critère | Statut vit-evm aujourd'hui |
|---|---|
| Intermédiaire financier LBA | ❌ Non (auto-évaluation) |
| Banque (LB) | ❌ Non |
| Service financier (LSFin) | ❌ Non |
| Plateforme DLT (LIMF) | ❌ Non |
| Responsable de traitement nLPD | ✅ Oui (sans backend, traitement local) |
| Soumis à MiCA (UE) | ⚠️ Si users UE ciblés (à décider) |

**Position juridique cohérente** : vit-evm est un **logiciel client de wallet self-custody** distribué gratuitement, sans backend, sans frais. La régulation suisse n'impose à ce jour aucune licence pour ce type de produit. La conformité **nLPD** est respectée si une politique de confidentialité est publiée.

## Voir aussi

- [10 — Audit sécurité](10-security-audit.md) — surface technique
- [05 — Intégration Mt Pelerin](05-integrations-mtpelerin.md) — délégation de la conformité financière
- [03 — Contracts](03-contracts.md) — détail `VitClaimLink` (preuve d'immutabilité)
