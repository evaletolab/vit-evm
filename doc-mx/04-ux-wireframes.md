# 04bis — UX Wireframes · produit minimal

Cible : parcours **utilisateur** ultra-minimal.  
Sources actuelles : `packages/vit-pay-app` — ce doc décrit le **produit retenu**, pas un inventaire exhaustif du code.

## État d'implémentation (2026-07-28)

| Écran / flow | État |
|---|---|
| P0 shell nav (accueil / carnet / envoyer / activité / profil) | ✅ livré |
| P1 envoyer · P2 liens créés · P4 carnet pending · P5 contacts bilatéraux | ✅ livré |
| P6 reverse claim (`/request`) · P7 activité · P8 profil émetteur | ✅ livré |
| Landing `<nom>@3vit.ch` + vault 3 codes + restore | ✅ livré (V1.1), **E2E Sepolia à valider** |
| Contact joint au lien + `metaHash` on-chain | ✅ livré, **suppose le contrat v2 déployé** |
| Google Contacts / People API (Safari iOS) | ⏳ spécifié, non implémenté |
| Signature du payload contact par l'owner Safe | ⏳ V2 |
| Notification owner pendant délai de grâce recovery | ⏳ V2 |
| Registre de noms on-chain | ⏳ V2 |

⚠️ Prérequis : `VitClaimLink` v2 (UUPS) doit être **redéployé** et son adresse reportée dans `environment.ts` — sinon tous les flux de liens échouent. Voir [03 — Contracts](03-contracts.md).

---

## Notes clés

- Produit = déverrouiller · envoyer · recevoir · carnet · activité (noms, pas d’adresses hex).
- **Style** : UX allégée — moins de bordures, cartes légères, hiérarchie par espacement/typographie.
- Envoi à quelqu’un **sans wallet** = claim link + liste des envois.
- **Reverse claim** = demande d’argent (`/request`).
- Passkey sync ≠ restauration auto du wallet ViT.
- Carnet : **Chrome Android = Contact Picker** ; Google Contacts = spec seulement.
- **Création** : nom `<nom>@3vit.ch` (landing Argent) → contact (pseudo requis) → Face ID → `/<nom>/vault` (3 codes guardians, défaut 1 coffre + 2 QR) → armement on-chain.
- **Restauration** : `/<nom>/restore` — soft (1 code + passkey) ou hard (2 codes).
- Activité : txs + claims ; libellé = nom carnet.
- Le reste (IBAN, guardians humains avancés, multi-device, mode dev…) → bas de page.

### Passkey · nouveau téléphone (réponse courte)

- Le navigateur peut **synchroniser** la passkey (Google Password Manager / iCloud Keychain) selon le compte et l’OS.
- Chez ViT, l’adresse Safe est dérivée des **coordonnées pubkey** passkey + overrides Safe ; ces métadonnées sont en **stockage local** (pas dans la passkey cloud).
- `credentials.get()` prouve la possession, **ne renvoie pas** la pubkey (contrairement à `create`).
- Donc : nouveau téléphone + passkey syncée **ne reconstruit pas** tout seul le wallet. Il faut sync/export du blob wallet, ou flow « reconnecter » qui ré-extrait la clé, ou recovery guardians.
- Créer un nouveau compte sur le nouveau device = **nouveau** Safe (nouvelle passkey).

### Contacts web

| Plateforme | Solution simple | Critique |
|---|---|---|
| **Chrome Android** | **Contact Picker API** (`navigator.contacts.select`) | One-shot, gesture user, prod-ready. Nom/tél/e-mail seulement. |
| **Safari iOS** | Contact Picker = **flag expérimental** seulement → **pas utilisable en prod** | Apple ne l’active pas par défaut. |
| **Safari iOS (retenu)** | Bouton **« Se connecter à Google Contacts »** (People API OAuth, 100 % client) | Même UX que desktop. Beaucoup d’iPhone ont un compte Google ; sinon saisie manuelle / coller depuis Contacts. |
| **iCloud Contacts** | CardDAV iCloud | Possible en théorie, mais Apple ID + app-specific password / OAuth opaque, XML CardDAV, UX fragile en PWA pure → **trop lourd** pour le MVP. |
| **WhatsApp** | — | Pas d’API web. |

Règle produit : Chrome phone → Contact Picker en premier ; iOS → Google Contacts (+ manuel). Pas de dépendance iCloud pour le MVP.

### Claim link avec contact émetteur — analyse sécurité

**État code** : déjà amorcé. `buildShareUrl(id, secret, fromName)` ajoute `from=<pseudo>` ; `page-claim` affiche « de Olivier · 0x12…34 » et propose « Ajouter Olivier au carnet » (nom lié à l’**adresse Safe on-chain** du sender, pas au texte de l’URL).

**Est-ce safe ?** Oui, avec ces règles :

| Aspect | Analyse |
|---|---|
| Fonds | Le lien contient déjà le **secret bearer** (`s=`) : qui a le lien peut réclamer. Ajouter un pseudo ne change pas la sécurité des fonds. Le lien transite déjà par un canal de confiance (03-contracts). |
| Fuite serveur | Avec `hashRoute` (`/#/claim?…`), **tout** (secret + contact) reste dans le fragment → jamais envoyé au serveur/CDN, absent des logs et des fetchs de preview messenger. À **conserver obligatoirement**. |
| PII | **Contact complet par défaut** (décision produit) : le payload `c=` porte nom + tél/e-mail du profil, dans le **fragment** uniquement. Le toggle « Joindre mon contact » permet d’envoyer sans. |
| Spoofing | `from` n’est **pas authentifié** : n’importe qui peut forger `from=Maman`. Mitigations V1 : le contact enregistré est lié à l’adresse **on-chain** du sender (déjà le cas) ; afficher l’adresse courte à côté du nom ; contact créé en statut « à confirmer ». Signature du payload par l’owner Safe = V2. |
| On-chain | Le contact ne va **jamais** on-chain en clair — `VitClaimLink` v2 stocke seulement hash/montant/expiry + **`metaHash`** (intégrité du payload). |

**Fonction cible** : `buildShareUrl(id, secret, contact?: { name; tel?; email? })` → param `c=` base64url dans le fragment, **contact complet** du profil par défaut ; toggle « Joindre mon contact » (défaut ON si profil renseigné) + bouton « Choisir un contact » (Picker local / Google) si profil vide ; réglage global dans le profil.

### Sauvegarde des codes — écran `/<nom>/vault` (V1.1, livré)

Les **3 codes** sont affichés un par carte ; chaque code a **sa** destination (`Coffre` ou `QR papier`). Défaut produit : **1 coffre + 2 QR**. L’activation on-chain exige **au moins 2 destinations distinctes** confirmées.

```
┌─────────────────────────────┐
│  Coffre de secours          │
│  alice@3vit.ch              │
│                             │
│  alice@3vit.ch · code-1     │
│  GEPP-2EYW-GV2P-CC9B        │
│  [ Coffre ] [ QR papier ]   │  ← destination par code
│  [ Enregistrer dans coffre ]│  prompt natif du gestionnaire
│                             │
│  … code-2, code-3 (QR)      │  image QR + copier + « imprimé »
│                             │
│  Destinations distinctes    │
│  confirmées : 2 / 2 minimum │
│                             │
│  [ Activer les codes on-chain ]
└─────────────────────────────┘
```

**Enregistrement « coffre »** (Apple Passwords / Google Password Manager / 1Password) : formulaire credential standard — `username = <nom>@3vit.ch · code-<i>`, `password = payload base64url` (version KDF + adresse Safe + code, plus `credentialId`/pubkey pour le code 1 → soft restore), attributs `autocomplete="username"` / `"new-password"` + soumission, complété par `navigator.credentials.store(PasswordCredential)` sur Chrome.

**Restore** : `/<nom>/restore` — champ `autocomplete="current-password"` pour l’autofill (soft restore), sinon saisie de **2 codes** (hard restore).

Limites : la confirmation du prompt reste à l’utilisateur (garantie plateforme, aucune écriture silencieuse) ; ViT ne lit jamais le coffre. Mettre 2 codes au même endroit reste possible mais retire le bénéfice du seuil 2/3 — l’écran l’empêche par défaut via le compteur de destinations distinctes.

### Profil émetteur à la création (P8)

Le pseudo existe déjà (`displayName`, requis ≥ 2 chars). Extension :

- Champs : **pseudo** (requis) + **tél / e-mail** (optionnels), avec l’explication « ces informations seront jointes quand vous envoyez de l’argent ».
- Préremplissage « C’est moi » : **Contact Picker** (Chrome Android, sélection de sa propre fiche) ou **Google Contacts** (People API, profil `people/me`) ; saisie manuelle sinon. **Microsoft Graph = plus tard.**
- Stockage : local uniquement (`StoredWallet.displayName` + nouveau bloc profil) — pas de serveur ViT, pas d’on-chain.
- Réutilisé par : claim link (P1/P3), reverse claim (P6), brouillons mail/SMS.

### Horcrux.sol — score sécurité (stockage de restore codes)

> **Archive de décision** — piste écartée en V1.1 : aucun casier on-chain, les codes ne sont jamais publiés (même chiffrés). Conservé pour la traçabilité.

Contrat : `packages/vit-safe-modules/contracts/Horcrux.sol`  
Client legacy : `packages/vit-core/src/core.horcrux.ts`  
Stub Safe : `VitSafeRecoveryValidator.sol` (placeholder)  
Recovery **réellement branchée** aujourd’hui : `SocialRecoveryModule` (guardians) dans vit-pay-app.

#### Score global : **2 / 10** — ne pas réutiliser tel quel pour des codes de restore

| Critère | Note | Pourquoi |
|---|---|---|
| Confidentialité on-chain | **1/10** | `mapping (…) public onetime` : toute valeur est lisible si on connaît (ou brute-force) la clé `secret`. |
| « Chiffrement » du share | **2/10** | Client = XOR (`xor_shuffle`) avec 8 bytes dérivés — pas une primitive AEAD ; réversible dès que `uid/nonce` (ou dérivés) fuient. |
| One-time / burn | **2/10** | `recovery()` incomplet (pas de `return`, `delete` commenté). Client appelle `redeem()` **absent** du Solidity → chemin cassé. |
| Binding Safe / identité | **1/10** | Aucun lien `safe` / owner / module. Slot orphelin. |
| Résistance griefing | **2/10** | `create` : premier arrivé gagne le slot → frontrun mempool vole/bloque la destination. |
| AA / Safe ready | **1/10** | `fallback` + `extcodesize(caller())==0` refuse les contrats ; incompatible relayer / Safe / 4337. |
| Complétude produit | **1/10** | Struct `Vault` inutilisée, event jamais émis, FIXME upgrade OZ non fait. |

**Verdict** : Horcrux actuel = **coffre public indexé par hash**, pas un coffre secret. Adapter l’**idée** (N-of-M, nom Horcrux), pas le contrat.

#### Adaptation Safe (idée à conserver, design à changer)

Objectif restore ViT : **même adresse Safe**, rotation d’owner (nouvelle passkey), pas une seed on-chain.

```
Création
  ├─ génère 3 Horcrux (ex. SSS 2-of-3 OU 3 one-time codes)
  ├─ ON-CHAIN : seulement commitments
  │     horcruxes[safe][codeHash] = { used: false }
  │     ou merkleRoot sur le Safe / module
  └─ OFF-CHAIN : phrases base1024 / papier (jamais le preimage en clair on-chain)

Restore (nouveau phone)
  ├─ user saisit ≥ seuil de codes
  ├─ module vérifie hash(code) + !used → mark used
  └─ ajoute newPasskeyOwner / retire ancien (via Safe exec / 7579 validator)
       → même Safe address
```

À **ne pas** remettre : share XOR dans un `uint256` public, clé de mapping = secret dérivé faible, recover sans burn, absence de lien `safe`.

Relation avec le code actuel :

- `Horcrux.sol` + `core.horcrux.ts` → dead / legacy (cf. [08 — Dead code](08-dead-code.md)).
- `VitSafeRecoveryValidator` → stub mort.
- Guardians SocialRecovery → vivant, complémentaire (humain) ; Horcrux = autonome (codes), même famille « rotation d’owner ».

### Idée réelle : restore code **chiffré AES** (user/pass) + casier / 1Password

> **Archive de décision** — non retenu en V1.1 : pas de couche user/pass ni de casier on-chain. Le coffre du device (Apple Passwords / Google / 1Password) stocke directement le payload du code ; le QR papier joue le rôle de second lieu.

Ce que tu décris n’est **pas** « stocker le code en clair dans Horcrux.sol », mais :

```
username + password
  → identity / auth (POW·PBKDF2 + keccak)     [core.identity.ts]
  → clé pour AES-GCM                          [core.AES.ts]
  → chiffre restoreMaterial (share / codes)
  → publie le ciphertext :
       • casier on-chain (Horcrux = vault de blob), et/ou
       • export vers coffre type 1Password
  → nouveau device : resaisie user/pass → déchiffre → restore Safe
```

**Score de l’idée (design)** : **6–7 / 10** — bonne pour un backup optionnel.  
**Score du code legacy qui devait la servir** : **~2 / 10** (XOR à la place d’AES, identity non déterministe).

| Point | Critique |
|---|---|
| AES-GCM WebCrypto | Présent et testé (`core.AES.ts`) — bonne primitive. Horcrux client utilise **XOR** (`core.XOR`) à la place → écart idée / code. |
| Dérivation user/pass | `auth()` / `identity()` + POW : intention OK. **Bug** : `requiresWork` tire un **nonce aléatoire** → `identity()` **non déterministe** (le test le prétend déterministe mais ne vérifie pas l’égalité). Sans **sauver salt/nonce/IV**, impossible de redéchiffrer plus tard. |
| `createSecretKey` | `sha256(raw).slice(0,16)` = AES-128 ; IV passé en `salt` — si IV fixe ou dérivé du mdp → **casse AES-GCM**. IV doit être aléatoire et **stocké avec** le ciphertext. |
| Casier on-chain | Ne doit contenir que `iv ‖ salt ‖ ciphertext` (+ lien Safe). Clé de lookup = hash public (ex. `auth().pub`), **pas** le secret de déchiffrement. |
| 1Password | Excellent **lieu B** : y coller le blob ou les phrases. Si tout est déjà dans 1Password, le chiffrement user/pass est optionnel (1Password = root of trust). |
| Si « EAS » = Ethereum Attestation Service | Utile comme **timestamp / transport** d’un blob déjà chiffré (attestation data = ciphertext). Ne remplace pas AES. Jamais de restore code en clair dans une attestation. |
| Produit Safe + passkey | User/pass = **backup de recovery**, pas le login quotidien (Face ID reste P0). Plaintext déchiffré = matériel de **rotation d’owner** → **même adresse Safe**. |

Schéma cible :

```
Création Safe + passkey
  restoreMaterial = SSS/codes liés au Safe
  optionnel: blob = AES-GCM(KDF(user,pass,salt), iv, material)
  publish(blob → Horcrux[safe] ou fichier / 1Password)

Restore
  load blob → decrypt(user,pass) → material
  → module rotate owner → même Safe
```

---

### Codes de récupération à la création (phrases / entropie)

> **Décision V1.1 (implémentée)** — ni base 1024 ni BIP39. Format retenu : **base32 Crockford, 16 caractères** (`XXXX-XXXX-XXXX-XXXX`) = **75 bits de secret + 5 bits de checksum**, dérivés en clé EOA par **scrypt N=2^16** (profil v1, repli v2 à 2^15) avec sel lié à l’adresse Safe et à l’index. Les 3 codes sont des **guardians** `SocialRecoveryModule` (seuil 2/3), pas une seed. Code : `wallet/recovery-codes.ts`. L’analyse ci-dessous est conservée comme **archive de décision**.

#### Critique base 1024 + wordlist « standard »

- **Déjà dans le repo** : `packages/vit-core/src/tools.ts` encode des bytes → mots en radix `2^10` (base 1024) sur la wordlist ethers/BIP39 (`en` / `fr`…).
- **Ce n’est pas du BIP39** : BIP39 = chunks de **11 bits** (2048 mots) + **checksum**. Base 1024 = **10 bits/mot**, souvent **sans checksum** → une faute de frappe peut produire un secret « valide » mais faux.
- Utiliser la wordlist BIP39 en ne prenant que les indices 0–1023 = **moitié du dico**, **non interop** avec les wallets BIP39 classiques (MetaMask, etc.). OK si on assume « format ViT only ».
- **Préférer BIP39 standard (12 mots)** si le but est « secret human-readable » : écosystème, checksum, libs auditées. Base 1024 custom = plus court à iso-entropie? Non : 128 bits ≈ **13 mots** base1024 vs **12 mots** BIP39 — gain UX négligeable, perte d’interop + checksum.

#### Entropie : « 3 codes » ≠ 3 mots

| Contenu d’un code | Bits approx. | Verdict |
|---|---|---|
| 3 mots base1024 | 30 bits | **Inutilisable** (bruteforceable) |
| 1 code = ~128 bits (13 mots base1024 ou 12 BIP39) | 128 bits | OK pour secret long terme |
| 3 codes = 3× one-time (hash on-chain, usage unique) | souvent 128 bits **chacun** | OK si ce sont des **tickets** de recovery module, pas une seed |
| 3 shares Shamir (ex. 2-of-3) d’un secret 128 bits | 128 bits au secret | OK ; chaque share ≈ taille du secret (+ overhead) |

Donc : soit **3 phrases longues** (seed / shares), soit **3 codes one-shot** assez entropiques — jamais 3 petits mots.

#### Restaurer sur un nouveau téléphone → **même adresse Safe ?**

| Design de recovery | Adresse de destination (Safe) |
|---|---|
| Codes / guardians **rotatent l’owner** du Safe existant (nouvelle passkey devient owner) | **Même adresse** — c’est le contrat Safe qui reçoit les paiements |
| Codes = seed qui **re-dérive la même** clé/owner utilisée à la création, puis on ré-attache une passkey | **Même adresse** si le compte Safe avait déjà été déployé avec cet owner set |
| « Restaurer » = **Créer mon compte** à nouveau (nouvelle passkey) sans lier l’ancien Safe | **Autre adresse** |
| Passkey cloud sync seule, sans blob / sans rotation on-chain | **Ne restaure pas** le wallet (voir note passkey) |

**Réponse produit** : un vrai « Restaurer » ViT doit toujours aboutir au **même Safe** (même adresse publique de réception). Sinon ce n’est pas une restauration, c’est un nouveau compte. Les 3 codes doivent donc soit (A) prouver le droit de **changer l’owner** du Safe déjà connu, soit (B) reconstruire un secret qui **identifie** ce Safe — jamais créer un Safe neuf.

**Choix V1.1** : option (A). Le payload sauvegardé (coffre / QR) embarque l’**adresse Safe** et le nom local, donc le restore ne demande que **2 codes** — pas de saisie d’adresse. Le nom `<nom>@3vit.ch` reste un libellé local : sans registre on-chain (V2), il ne suffit pas à retrouver le Safe.

---


## Use cases retenus (shell minimal)

| ID | Use case | Statut code |
|---|---|---|
| **P0** | Déverrouiller à l’ouverture | ✅ unlock overlay |
| **P1** | Envoyer à un contact / e-mail / tél (claim si pas d’addr) | ✅ envoi + pending carnet |
| **P2** | Voir mes claim links · statut · annuler · récupérer | ✅ `/links` |
| **P3** | Recevoir / réclamer un claim link | ✅ `/claim` |
| **P4** | Carnet : liste + connecter Google / téléphone | ✅ CRUD + pending · Google toujours gated `googleClientId` |
| **P5** | Au claim : contacts bilatéraux (sender ↔ claimer) | ✅ |
| **P6** | Reverse claim (demander de l’argent) | ✅ `/request` |
| **P7** | Activité unifiée (on-chain + claims) · noms · ajouter au carnet | ✅ `/txs` |
| **P8** | Nom `<nom>@3vit.ch` + profil émetteur à la création · joint aux envois | ✅ landing + pseudo/tél/e-mail + import contact |

**Shell minimal**

```
┌─────────────────────────────┐
│      <écran actif>          │
├─────┬─────┬─────┬─────┬─────┤
│Accueil│Carnet│ Envoyer │Activité│…│
│  /  │carnet│  FAB   │  hist │   │
└─────┴─────┴─────┴─────┴─────┘
  Accueil = solde + raccourcis Envoyer / Recevoir / Envois
  Envois  = mes claim links (P2) — entrée visible, pas enfouie
```

---

## P0 — Déverrouiller

```
┌─────────────────────────────┐
│           ViT               │
│  Déverrouillez avec Face ID │
│  / Touch ID / empreinte     │
│                             │
│      [ Déverrouiller ]      │
└─────────────────────────────┘
```

---

## P1 — Envoyer (facile, même sans wallet côté destinataire)

```
┌─────────────────────────────┐
│ ←  Envoyer                  │
│                             │
│ À                           │
│ [ nom, e-mail, tél, 0x… ]   │
│ [👥 Carnet] [📱 Téléphone]  │
│                             │
│ Montant (xCHF)              │
│ [ 25.00                   ] │
│                             │
│ ● Si pas d’adresse Safe →   │
│   claim link + brouillon    │
│   mail/SMS                  │
│                             │
│ [✓] Joindre mon contact     │  ← profil P8 complet (nom+tél/e-mail)
│     Olivier · +41 79 …      │
│     [ Choisir un contact ]  │  ← si profil vide (Picker / Google)
│                             │
│ [ Envoyer ]                 │
└─────────────────────────────┘
```

« Joindre mon contact » : défaut ON si profil renseigné ; le lien porte le **contact complet** du profil (payload `c=` dans le fragment URL, jamais on-chain). Si le profil est vide, bouton **Choisir un contact** (Contact Picker local / Google) pour renseigner sa fiche avant l’envoi.

**Effet carnet** : crée / met à jour une entrée `pending`  
`{ name|email|tel, status: pending, claimId, amount }` — **pas encore d’adresse EVM**.

```
┌─────────────────────────────┐
│ ✓ Envoyé                    │
│ 25 xCHF → Bob (en attente)  │
│ [ Copier lien ] [ Partager ]│
│ [ Voir mes envois ]         │
└─────────────────────────────┘
```

---

## P2 — Mes envois (claim links) · statut · annuler

Entrée Accueil « Envois » / Carnet onglet Envois — **surface principale**.

```
┌─────────────────────────────┐
│ ←  Mes envois            ↻  │
│                             │
│ ┌─ Bob · 25 xCHF ──────────┐ │
│ │ ● En attente            │ │
│ │ via e-mail · il y a 2 h │ │
│ │ [ Partager ] [ Annuler ]│ │
│ └─────────────────────────┘ │
│ ┌─ Léa · 10 xCHF ─────────┐ │
│ │ ✓ Réclamé               │ │
│ │ → contact créé          │ │
│ └─────────────────────────┘ │
│ ┌─ Marc · 5 xCHF ─────────┐ │
│ │ ✕ Annulé · fonds OK     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

Annuler = `cancelClaimLink` → fonds revenus sur le Safe.

---

## P3 — Recevoir (réclamer)

```
┌─────────────────────────────┐
│  Argent reçu                │
│  25 xCHF                    │
│  de Delphine · 0x12…34      │  ← nom décodé du lien + addr on-chain
│                             │
│  [ Récupérer l’argent ]     │
│  [ + Ajouter Delphine au    │
│      carnet (à confirmer) ] │
│                             │
│  (sans wallet → créer       │
│   compte puis retour)       │
└─────────────────────────────┘
```

Le nom vient du lien (non authentifié) ; le contact enregistré est lié à l’adresse Safe **on-chain** du sender et marqué « à confirmer ».

**Après claim réussi (P5)** :

- Côté **receveur** : contact « Delphine » + adresse Safe de l’émetteur.
- Côté **émetteur** : entrée pending → contact « Bob » + adresse Safe du claimer (nécessite event/indexation ou sync locale au refresh statut).

---

## P4 — Carnet d’adresses

```
┌─────────────────────────────┐
│  Carnet                  +  │
│                             │
│ [ Se connecter Google ]     │  OAuth People API (client)
│ [ Importer du téléphone ]   │  Contact Picker (Android)
│                             │
│ ● Pending                   │
│   Bob · 25 xCHF en attente  │  (lié claim P1)
│                             │
│ ✓ Contacts                  │
│   Delphine                  │  (adresse masquée)
│   Léa                       │
│                             │
│ ? Inconnus (depuis activité)│
│   Quelqu’un · [ Ajouter ]   │
└─────────────────────────────┘
```

Pas de serveur ViT : contacts en localStorage (chiffré idéalement), import = noms/hints seulement ; l’addr EVM arrive via claim / reverse / saisie.

---

## P5 — Contacts bilatéraux (règle produit)

```
Envoi claim          Claim réussi
─────────────        ──────────────
Alice → Bob          Bob claim
carnet Alice:        carnet Bob:  + Alice + addrAlice
  Bob pending        carnet Alice: Bob pending → + addrBob
```

Sans backend : côté Alice, résolution addrBob = lecture on-chain du claim (`claimedBy` / event) au refresh de « Mes envois ».

---

## P6 — Reverse claim (demander de l’argent)

Sens : **Alice n’a pas / peu de fonds** (ou ne connaît pas l’addr de Bob). Elle envoie une **demande**. Bob a le solde.

```
┌─ Alice ─────────────────────┐
│ ←  Demander                 │
│ À  [ Bob · e-mail / tél ]   │
│ Montant [ 40.00 ] xCHF      │
│ Message (opt.)              │
│ [ Envoyer la demande ]      │
└─────────────────────────────┘
        │ lien reverse
        ▼
┌─ Bob ───────────────────────┐
│  Delphine demande 40 xCHF   │
│  [ Accepter ] [ Refuser ]   │
└─────────────────────────────┘
```

Si **Accepter** : Bob signe le paiement (direct ou via contrat request) → fonds vers Safe Alice → contacts des deux côtés.  
Si **Refuser** : statut refusé, rien on-chain (ou cancel request).

> Contrat / schéma exact à spécifier (miroir de `VitClaimLink` ou nouveau module « payment request »). UX ci-dessus = intention produit.

---

## P7 — Activité (historique unifié)

Aujourd’hui : lookback Transfer court ; pas de claims ; contrepartie en hex / titres génériques.

**Cible**

```
┌─────────────────────────────┐
│  Activité                   │
│ [Tout] [Envoyés] [Reçus]    │
│ [Claims]                    │
│                             │
│ ↗  À Léa           −12,00   │  nom carnet
│    Aujourd’hui · 14:32      │  pas de 0x…
│                             │
│ ⛓  Claim → Bob     −25,00   │
│    En attente · Annuler     │
│                             │
│ ↙  De Delphine     +50,00   │
│                             │
│ ↗  À 0xAb…Cd ?     −3,00    │  inconnu
│    [ + Ajouter au carnet ]  │
└─────────────────────────────┘
```

Règles :

- Jamais d’adresse hex en titre (option « détails » / long-press si besoin).
- Si contrepartie connue dans le carnet → **nom**.
- Sinon → placeholder court + CTA **Ajouter au carnet** (préremplit l’addr en arrière-plan).
- Inclure claim pending / claimed / cancelled comme lignes d’activité.

---

## P8 — Nom + profil émetteur à la création (landing `/wallet`)

```
┌─────────────────────────────┐
│           [ V ]             │
│  Choisissez votre nom       │
│  Identifiant privé sur cet  │
│  appareil                   │
│                             │
│      alice@3vit.ch          │  ← input aligné à droite
│  ─────────────────────────  │     + suffixe gris, style Argent
│                             │
│  (dès que le nom est valide)│
│  Pseudo affiché             │
│  [ Olivier               ]  │  requis (≥ 2 car.)
│  Tél (optionnel)            │
│  [ +41 79 …              ]  │
│  E-mail (optionnel)         │
│  [ olivier@…             ]  │
│  [ 📱 Importer mon contact ]│  Contact Picker (Chrome Android)
│                             │
│  [ Créer mon compte ]       │  désactivé tant que pseudo vide
│  Déjà un compte ?           │  <a> vers /<nom>/restore
│  Récupérer avec mes codes   │
└─────────────────────────────┘
```

- Le nom est un **choix local**, pas une réservation on-chain : il sert de libellé et de segment de route (`/<nom>/vault`, `/<nom>/restore`). Registre on-chain = V2.
- Champs de contact affichés **après** un nom valide. Pseudo requis ; tél/e-mail optionnels, stockés en local seulement.
- « Importer mon contact » : **Contact Picker en V1** (Chrome Android) ; manuel sinon. **Google `people/me` = spécifié mais non implémenté V1** ; Microsoft plus tard.
- Suite du parcours : Face ID (passkey) → `/<nom>/vault` (3 codes) → armement on-chain.
- Modifiable ensuite dans le profil (avec le toggle global « joindre mon nom aux envois »).

---

## Accueil minimal (synthèse)

```
┌─────────────────────────────┐
│ Bonjour, Delphine           │
│                             │
│ 128,50 xCHF                 │
│                             │
│ [ Envoyer ] [ Demander ]    │  P1 / P6
│ [ Recevoir ] [ Envois ]     │  QR / P2
│                             │
│ Récents                     │  P7 (3–5 lignes)
│  À Léa −12 · Claim Bob −25  │
├─────┬─────┬─────┬─────┬─────┤
│Accueil│Carnet│ FAB │Activité│…│
└─────┴─────┴─────┴─────┴─────┘
```

---

## Hors scope produit (existant ou partiel · pas le shell)

À ne pas mettre en avant tant que P0–P7 ne sont pas solides :

- Page IBAN / Mt Pelerin (`/iban`) — on/off-ramp
- Recovery guardians UI (`/recovery`) + recover nouvel appareil (nécessaire **sécurité**, pas shell quotidien)
- Multi-device / ajouter owner (`/devices`)
- Scanner « Payer en magasin » comme écran d’entrée `/buy` (le défaut produit = formulaire Envoyer)
- Thème / presets couleurs / mode dev / faucet MockZCHF / debug UserOp
- Holo-card Safe `/wallet` post-création (détail technique)
- Import Google Contacts **sans** `googleClientId` configuré
- Limite journalière client-side (garde-fou, pas feature UX)
- Historique Transfer « brut » actuel (lookback court / ressenti JSON-like) — à remplacer par P7

---

## Voir aussi

- [04 — UX](04-ux.md) — notes techniques iter 0.4
- Code claim : `claimlink/`, `pages/page-links/`, `pages/page-claim/`, `pages/page-buy/`
- Code carnet : `contacts/contacts.service.ts`
- Passkey / Safe : `wallet/wallet.service.ts` (`createAccountAddress` + stockage local)
