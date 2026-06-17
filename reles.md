# Features vit-evm — détail de fonctionnement

Décrit chaque feature du MVP : flow utilisateur, flow technique sous le capot, contrats appelés, garde-fous.

---

## F1 — Créer un wallet avec passkey

**Objectif** : générer un Safe Account dont le seul owner est une passkey biométrique (Touch ID / Face ID / Windows Hello), sans seed phrase.

- **Déclenchement** : bouton « Créer mon wallet » sur `page-wallet` (state `view === 'no-wallet'`)
- **Flow utilisateur** :
  - Click → prompt WebAuthn → biométrie → adresse Safe affichée → état persisté en `localStorage` (`vit-wallet`)
- **Flow technique** :
  - `WalletService.createWalletWithPasskey()` appelle `createPasskey()` dans `lib/passkeys.ts`
  - `navigator.credentials.create({ publicKey: { pubKeyCredParams: [{ alg: -7 }], authenticatorAttachment: 'platform', userVerification: 'required' } })` génère un credential P-256 lié au device
  - `crypto.subtle.exportKey('jwk')` extrait `(x, y)` coordonnées de la clé publique P-256
  - `SafeAccount.initializeNewAccount([pubkeyCoordinates], INIT_CODE_WEBAUTHN_OVERRIDES)` calcule l'adresse Safe **déterministe via CREATE2** — l'adresse dépend de la pubkey + des contrats canoniques webauthn v0.2.1 (sharedSigner `0x94a4F6af…`, contractVerifier Daimo `0xc2b78104…`)
  - Pas de déploiement à ce stade : le Safe n'est créé on-chain qu'au premier UserOp (init code lazy)
  - `WalletStorageService.save()` persiste `StoredWallet { accountAddress, chainId, credentialId, webauthnPublicKey, owners, recoveryEnabled }`
- **Garanties** :
  - Aucun secret stocké (validation runtime `isStoredWallet` exclut `privateKey`/`mnemonic`/`seed`)
  - L'adresse est stable si le passkey est intact — même device, même résultat
  - WebAuthn indisponible → erreur explicite via try/catch dans `createWalletWithPasskey`
- **Coût** : 0 (aucune tx, juste calcul off-chain)

---

## F2 — Recevoir des ZCHF de test (faucet MockZCHF)

**Objectif** : alimenter le wallet en ZCHF de test pour pouvoir tester F3, sans dépendre d'un faucet externe ni d'un EOA déjà fundé.

- **Déclenchement** : bouton « Recevoir » de la card F2, montant configurable (`100` ZCHF par défaut)
- **Flow utilisateur** :
  - Click → biométrie → tx UserOp incluse → solde ZCHF affiché
- **Flow technique** :
  - `WalletService.mintTestZchf(amount)` construit `buildMockErc20Mint(zchfTokenAddress, safe, amount)` = MetaTransaction `mint(safe, amount)` sur le contrat MockERC20
  - Le batch est envoyé via `executeSponsoredUserOp([mintTx])` (même pipeline que toute UserOp sponsorisée)
  - **Premier appel = init du Safe** : abstractionkit prepend automatiquement `createDeployWebAuthnVerifierMetaTransaction` + `swapOwner(sharedSigner → signerProxy)` dans le factoryData (déploie un proxy CREATE2 dédié au passkey via `SafeWebAuthnSignerFactory` canonique `0x1d31F259…`)
  - Bundler Candide simule, paymaster sponsorise, passkey signe le UserOp, EntryPoint exécute → Safe déployé + mint en une seule tx
  - `getZchfBalance()` call `balanceOf(safe)` via JSON-RPC pour rafraîchir l'UI
- **Garanties** :
  - Disponible **uniquement** si `zchfTokenAddress` pointe sur un MockERC20 avec `mint()` ouvert (pas le ZCHF mainnet qui n'a pas de mint public)
  - Pas d'ETH requis (paymaster sponsorise)
- **Limite** : pas un vrai faucet du token officiel — c'est juste un MockERC20 baptisé « ZCHF » avec mint public. Sur OP mainnet, F2 disparaît au profit d'un swap.

---

## F3 — Envoyer un paiement sponsorisé

**Objectif** : transférer N ZCHF à une adresse arbitraire, sans qu'aucun ETH ne soit requis sur le Safe.

- **Déclenchement** : card « Envoyer ZCHF », champs destinataire + montant
- **Flow utilisateur** :
  - Saisie → click « Envoyer (sponsorisé) » → préflight anti-scam check → biométrie → tx incluse → solde décrémenté + bandeau limite journalière mis à jour
- **Flow technique** :
  - `WalletService.sendZchfPayment(to, amount)` exécute en séquence :
    1. **Daily limit check** : `checkDailyLimit(amount)` lit `stored.dailySpending`, compare `spentToday + amount` à `maxDailyZchfAmount`. Reset à minuit local timezone navigateur. Throw avant signature si dépassé.
    2. **Préflight anti-scam** : `runPreflight([transferTx])` appelle `core.safe.preflight` (`vit-core/preflight` subpath) qui screen le destinataire (listes noires connues, contrats suspects, signatures de drainers). Verdict OK/WARN/BLOCK. Si BLOCK → throw. Si WARN → tx continue mais affichée avec `⚠️` au-dessus du résultat.
    3. **Build MetaTx** : `buildErc20Transfer(zchfTokenAddress, to, amount)` encode `transfer(to, amount)` selector `0xa9059cbb`
    4. **Pipeline UserOp sponsorisé** : `executeSponsoredUserOp([transferTx])` (cf. F2 — même code path)
    5. **Si succès** : `incrementDailySpending(amount)` ajoute au compteur, persiste dans `StoredWallet`
- **Garde-fous** :
  - Limite journalière côté client (1000 ZCHF/jour dev, configurable). Vidable via localStorage donc UX-only, pas une protection on-chain.
  - Préflight peut bloquer un transfer vers une address listée comme drainer
  - Paymaster refuse (out of budget / policy expired) → erreur explicite « Transaction non sponsorisée » via `mapPaymasterError`, jamais de fallback ETH
- **Coût utilisateur** : 0 ETH. Le paymaster Candide paie le gas (sur testnet via leur endpoint public, sur mainnet via deposit pré-fundé).

---

## F4 — Ajouter un device (nouveau owner)

**Objectif** : ajouter un second owner au Safe pour permettre la signature depuis un autre appareil OU autoriser une EOA externe.

Deux variantes implémentées :

### Option A — passkey locale

- **Cas d'usage** : ajouter une seconde passkey sur le **même device** (utile pour appareils multiples partageant l'OS, rare)
- **Flow technique** :
  - `WalletService.addDeviceWithPasskey()` appelle `createPasskey()` → nouveau credential
  - `SafeAccount.getSignerLowerCaseAddress(newPubkey, WEBAUTHN_CANONICAL_OVERRIDES)` calcule l'adresse du `SafeWebAuthnSigner` proxy CREATE2 qui sera déployé pour cette passkey
  - `account.createAddOwnerWithThresholdMetaTransactions(newPubkey, threshold=1, {...overrides})` génère un batch qui :
    1. Déploie le proxy SignerFactory(newPubkey) si pas encore présent
    2. Call `Safe.addOwnerWithThreshold(proxyAddr, 1)` via execTransaction
  - Envoyé via `executeSponsoredUserOp(batch)`
  - Si succès, `StoredWallet.owners` augmente, persisté

### Option B — par address (livré §18.3)

- **Cas d'usage** : autoriser une EOA externe (autre wallet) ou un Safe externe comme co-owner
- **Flow utilisateur** :
  - L'autre device crée un passkey/wallet de son côté → copie son **owner address**
  - L'user colle l'address → click « Autoriser cette address » → biométrie depuis le device courant → tx incluse
- **Flow technique** :
  - `WalletService.addOwnerByAddress(newAddress)` valide via `ethers.isAddress` (checksum EIP-55 strict)
  - `account.createStandardAddOwnerWithThresholdMetaTransaction(newAddress, threshold=1)` — pas de déploiement de signer proxy, juste l'`addOwnerWithThreshold` direct
  - Envoyé via `executeSponsoredUserOp([addTx])`
- **Garanties** :
  - **Threshold stays at 1** dans les 2 options : tout owner peut signer seul (pas de 2/N M-of-N)
  - L'opération elle-même est signée par un owner existant (la passkey active) — un attaquant ne peut pas ajouter un owner sans contrôler une passkey actuelle
  - Sponsorisé : pas d'ETH requis

**Pas encore livré (iter 0.4)** : flow « cible distante avec QR » — appareil A et B sur réseaux différents, scan QR, signature transmise. Pour l'instant l'option B couvre 90% des cas en mode « copy-paste ».

---

## F5 — Activer recovery (guardians)

**Objectif** : permettre la rotation d'owners en cas de perte de toutes les passkeys, via un quorum de guardians de confiance.

- **Déclenchement** : card « Recovery (guardians) », textarea pour les guardian addresses + threshold
- **Flow utilisateur** :
  - Saisie guardians + threshold → click « Activer / mettre à jour » → biométrie → tx incluse → bandeau « ✅ SocialRecoveryModule activé »
- **Flow technique** :
  - Parse `guardiansInput` : split sur `[\s,;]+`, filter empty, validate via `ethers.isAddress` (rejette les checksums EIP-55 invalides — paste en lowercase pour bypass)
  - `WalletService.enableRecovery(guardians, threshold)` construit le batch :
    1. `module.createEnableModuleMetaTransaction(safe)` — call `Safe.enableModule(socialRecoveryModuleAddress)` selector `0x610b5925`
    2. Pour chaque guardian : `module.createAddGuardianWithThresholdMetaTransaction(guardianAddr, threshold)` — call `SocialRecoveryModule.addGuardianWithThreshold(addr, threshold)` selector `0xbe0e54d7`
  - Envoyé via `executeSponsoredUserOp(batch)`
  - Le module utilisé est `config.socialRecoveryModuleAddress` (default abstractionkit = After3Days `0x38275826…`, surchargeable vers After3Minutes / After7Days / After14Days)
  - Si succès, `StoredWallet.recoveryEnabled = true`, refresh state
- **Garanties** :
  - Validation côté wallet : `threshold ∈ [1, guardians.length]`, guardians ≠ vide, addresses valides
  - Le module est on-chain immutable — pas de risque d'altération unilatérale par Candide
  - Le batch est atomique : si `addGuardian` revert, `enableModule` revert aussi
- **Choix du module et conséquence sur F6** :
  - **After3Days** (default) : grace period 3 jours, prod-safe mais bloque les tests E2E
  - **After3Minutes** : utile pour tests E2E, **dangereux en prod** (3 minutes = fenêtre courte pour détecter une recovery malicieuse)
  - **After7Days / After14Days** : prod-conservateur

---

## F6 — Restaurer un wallet (recovery)

**Objectif** : remplacer la passkey perdue par une nouvelle, sans que l'ancienne ne soit jamais utilisée.

- **Flow utilisateur** :
  - User perd son device → ouvre l'app sur un nouveau device → crée un nouveau passkey
  - Contacte ses guardians → ils déclenchent la recovery
  - Attend la grace period (3 min / 3 / 7 / 14 jours selon le module)
  - Click « Finaliser la recovery » dans l'UI → biométrie depuis le nouveau passkey → tx incluse → ancienne passkey désactivée, nouvelle active
- **Flow technique en 3 étapes** :

### Étape 1 — Initiation par guardians (off-app)

- Le **guardian** broadcast `SocialRecoveryModule.executeRecovery(safe, [newOwnerAddress], newThreshold)` selector `0xb1f85f69` depuis son propre wallet (besoin d'ETH pour le gas guardian)
- Si threshold guardians > 1 : chaque guardian doit signer via `confirmRecovery(...)` selector différent, puis le dernier déclenche `executeRecovery`
- `WalletService.startRecovery(safe, newOwners, threshold)` génère cette MetaTransaction côté UI mais ne la broadcast pas — c'est au guardian de le faire (le user perdu n'a plus d'accès)
- À cette étape, le module enregistre la demande et démarre le timer `executeAfter = block.timestamp + gracePeriod`

### Étape 2 — Affichage de la demande dans l'UI

- `WalletService.getRecoveryRequest()` call `module.getRecoveryRequest(safe)` + `module.threshold(safe)` via JSON-RPC
- Retourne `{ newOwners, newThreshold, executeAfter, approvalsRequired, approvalsReceived }`
- Persisté dans `StoredWallet.recoveryRequestCache` pour affichage instant au reload sans round-trip RPC (iter 0.2 §18.4)
- UI affiche la card « Demande de recovery en cours » avec compteur d'approbations et bloc `executeAfter`

### Étape 3 — Finalisation par le nouveau passkey

- Après `block.timestamp >= executeAfter`, le bouton « Finaliser la recovery » devient effectif
- `WalletService.finalizeRecovery()` construit `module.createFinalizeRecoveryMetaTransaction(safe)` selector `0x..` et l'envoie via `executeSponsoredUserOp([finalizeTx])`
- Le module appelle `Safe.swapOwner(...)` en chaîne pour remplacer tous les anciens owners par les nouveaux
- Si succès, la nouvelle passkey est le seul owner ; l'ancienne (perdue) ne peut plus signer

- **Garanties** :
  - **Pas de seed phrase à conserver** — la recovery est uniquement par rotation on-chain
  - **Grace period non-bypassable** : même si tous les guardians signent, on doit attendre `gracePeriod` pour finaliser. Si une recovery est malicieuse, l'utilisateur peut la cancel via `module.cancelRecovery()` (TODO UI dans iter 0.4)
  - **Atomicité** : `finalizeRecovery` est un appel unique, soit le swap entier réussit, soit revert
- **Limites actuelles** :
  - L'étape 1 nécessite que le guardian ait de l'ETH (pas de paymaster pour les calls externes au Safe)
  - Pas encore d'UI pour cancel un recovery suspect (dette §11)
  - F6 testé partiellement E2E : startRecovery + getRecoveryRequest validés, finalizeRecovery non encore inclus en session (grace period 3 jours bloque)

---

## Pipeline transverse : `executeSponsoredUserOp`

Toutes les features sauf F1 et F6 étape 1 passent par ce pipeline. Il est l'**unique chemin** entre les MetaTransactions construites et le bundler.

- **Entrée** : `MetaTransaction[]` (les MetaTx à exécuter en batch)
- **Étapes** :
  1. `SafeAccount.initializeNewAccount([passkey.pubkey], INIT_CODE_WEBAUTHN_OVERRIDES)` instance du compte (recalcule l'adresse CREATE2 — confirme cohérence)
  2. `account.createUserOperation(txs, nodeRpcUrl, bundlerUrl, { ...WEBAUTHN_CANONICAL_OVERRIDES, expectedSigners: [pubkey], gas multipliers 120% })` → bundler simule, retourne userOp avec gas estimé
     - Si premier UserOp (nonce=0), abstractionkit prepend automatiquement `createDeployWebAuthnVerifier` + `swapOwner` dans factoryData (init Safe en une seule op)
  3. `CandidePaymaster.createSponsorPaymasterUserOperation(account, userOp, bundlerUrl, policyId)` → paymaster Candide signe la sponsorisation (paymasterData devient `0x02 | validUntil | validAfter | signature`)
  4. `signAndSendUserOp(account, userOp, passkey, chainId, bundlerUrl, WEBAUTHN_CANONICAL_OVERRIDES)` :
     - Calcule `safeInitOpHash = SafeAccount.getUserOperationEip712Hash(userOp, chainId)`
     - `navigator.credentials.get({ challenge: hash, userVerification: 'required' })` → assertion biométrique
     - **Assert Fix 4** : `authenticatorData[32] & 0x05 === 0x05` (UP|UV required) — throw clair si UV manquant avant d'envoyer au bundler
     - `extractSignature` decode r/s DER, `extractClientDataFields` extrait les fields non-standard du clientDataJSON
     - `SafeAccount.formatSignaturesToUseroperationSignature([{ signer: pubkey, signature: webauthnSig }], { isInit: nonce==0, ...overrides })` produit la signature ABI-encoded webauthn
     - `smartAccount.sendUserOperation(userOp, bundlerUrl)` → bundler envoie au EntryPoint
  5. `response.included()` poll le bundler jusqu'à inclusion → `receipt` avec tx hash
- **Sortie** : `{ userOpHash, success, transactionHash, error?, preflight?, debug? }`
- **Garde-fous** :
  - Try/catch à chaque étape (estimation gas, sponsoring, signing, sending) avec messages d'erreur distincts
  - `mapPaymasterError` décode les erreurs Candide en messages utilisateur (« budget épuisé », « policy expired », etc.)
  - Debug dump (`UserOperationDebug { userOpJson, userOpEip712Hash, paymasterUrl, bundlerUrl }`) attaché au résultat pour diagnostic post-mortem via la card debug UI

---

## Surface d'attaque & threat model

- **Côté utilisateur** :
  - Vol du device + bypass biométrie → l'attaquant peut signer (passkey accessible). Mitigation : recovery via guardians, daily limit
  - Phishing site avec un faux `vit-pay-app` → preflight anti-scam check les destinataires, mais ne protège pas contre un faux site qui change l'origin RP. Mitigation prod : `rpId` strict dans WebAuthn (pas fait en dev sur `localhost:4200`)
- **Côté infra** :
  - Candide compromise → impossible de soumettre des userOps mais fonds intacts (cf. `SYNTHESE-MVP-0.1.md` § « Couper la dépendance Candide »)
  - Safe Passkey Module v0.2.1 bug → recovery via le module Safe officiel (immutable, auditée par Trail of Bits)
- **Côté contrat** :
  - `SocialRecoveryModule` malicieux → mitigation : on n'utilise que les modules canoniques Candide audités, déployés et immutables sur Sepolia/OP/mainnet
  - Faux ZCHF (preflight bypass) → le user peut envoyer à un faux contrat « ZCHF » s'il modifie `zchfTokenAddress` config. En prod, address pinned par build.

---

**Tous les flows passent par `WalletService`** — c'est le seul point d'entrée. Les components Angular n'appellent jamais `abstractionkit` directement (vérifié grep). Cette isolation rend la migration de provider (cf. Niveau 2 de la dé-Candide-isation) triviale.
