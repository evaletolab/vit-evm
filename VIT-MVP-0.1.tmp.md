# VIT MVP 0.1 - Wallet AOC Passkey, Subvention et Recovery

## Objectif

Livrer un prototype frontend dans `vit-pay-app/` permettant de tester un wallet AOC base sur Account Abstraction:

- creation d'un Safe Account avec FaceID / TouchID / passkey;
- paiement ZCHF via UserOperation;
- subvention des frais de transaction via paymaster;
- ajout d'un nouveau device comme owner;
- recovery par guardians.

Le prototype reste volontairement dans `vit-pay-app/` pour aller vite. `vit-core` ne doit pas devenir une dependance d'architecture tant que les flows ne sont pas valides en usage reel.

## Decisions MVP

### Stack

Stack retenue pour le prototype:

- Frontend: `vit-pay-app/` Angular.
- Smart account: Safe Account via Candide `abstractionkit`.
- EntryPoint: v0.7 via `SafeAccountV0_3_0`.
- Signature utilisateur: WebAuthn / passkey P-256.
- Gas: UserOperations sponsorisees via `CandidePaymaster`.
- Recovery: `SocialRecoveryModule`.

Raison: Candide fournit deja les primitives utiles pour un MVP rapide: Safe Account, passkeys, UserOperation, paymaster et recovery. Pour eviter le verrouillage, le frontend doit passer par un `WalletService` local et ne pas appeler `abstractionkit` directement depuis les composants Angular.

### Hors Scope MVP

Ces elements ne sont pas dans le chemin principal:

- `identity.create`;
- `identity.horcrux`;
- `identity.recovery`;
- `core.safe.webauthn`;
- contrats custom `VitSafeWebAuthnValidator` et `VitSafeRecoveryValidator`.

Ces modules appartiennent au modele legacy "seed / secret a restaurer". Le MVP passkey AA n'a pas de seed phrase: la recovery se fait par rotation d'owners sur le Safe.

## Reseau de Test

### Reseau retenu

Reseau recommande pour le MVP: **OP Sepolia**.

Raisons:

- proche de la cible production Optimism;
- compatible avec l'approche OP Stack / passkeys;
- frais faibles;
- bon candidat pour verifier RIP-7212 / P-256;
- coherent avec ZCHF sur Optimism mainnet.

Configuration:

```text
CHAIN_ID=11155420
NETWORK_NAME=op-sepolia
ZCHF_MAINNET_OPTIMISM=0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553
P256_PRECOMPILE=0x0000000000000000000000000000000000000100
```

### ZCHF sur testnet

ZCHF est documente officiellement sur Optimism et Base mainnet a l'adresse:

```text
0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553
```

Pour OP Sepolia, il faut valider l'existence du contrat au moment du test. Les explorers peuvent afficher un selecteur "OP Sepolia", mais cela ne suffit pas a garantir un token testnet utilisable ni un faucet.

Procedure de validation:

```bash
cast code 0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553 --rpc-url $OP_SEPOLIA_RPC
```

Resultat attendu:

- si la reponse est differente de `0x`, utiliser cette adresse comme `ZCHF_TEST_ADDRESS`;
- si la reponse est `0x`, deployer un `MockZCHF` ERC-20 dans l'environnement de test.

Decision MVP:

- **Phase 0.1a**: utiliser OP Sepolia + `MockZCHF` si aucun ZCHF testnet officiel n'est confirme.
- **Phase 0.1b**: remplacer `MockZCHF` par l'adresse ZCHF testnet officielle si elle est disponible.
- **Phase 0.2**: tester sur Optimism mainnet avec petites valeurs.

Interface minimale du mock:

```solidity
interface IERC20TestZCHF {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}
```

Le frontend ne doit pas savoir si le token est officiel ou mock. Il lit uniquement `ZCHF_TOKEN_ADDRESS` depuis la config.

## Subvention des Transactions

### Objectif

L'utilisateur ne doit pas avoir besoin d'ETH pour:

- creer / deployer son Safe;
- envoyer son premier paiement;
- ajouter un device;
- activer la recovery.

Le frontend doit passer par un paymaster avant la signature passkey.

### Variables de configuration

```text
VITE_CHAIN_ID=11155420
VITE_NODE_RPC_URL=<op-sepolia-rpc>
VITE_BUNDLER_URL=<candide-bundler-url>
VITE_PAYMASTER_URL=<candide-paymaster-url>
VITE_SPONSORSHIP_POLICY_ID=<optional-private-policy-id>
VITE_ZCHF_TOKEN_ADDRESS=<zchf-or-mock-zchf-address>
VITE_P256_PRECOMPILE=0x0000000000000000000000000000000000000100
```

### Flow sponsorise

Ordre obligatoire:

```text
1. construire les MetaTransactions
2. creer la UserOperation
3. demander la subvention au paymaster
4. signer la UserOperation sponsorisee avec passkey
5. envoyer la UserOperation au bundler
6. attendre l'inclusion
```

Pseudo-code attendu dans `WalletService`:

```ts
const userOperation = await smartAccount.createUserOperation(
  transactions,
  config.nodeRpcUrl,
  config.bundlerUrl,
  {
    expectedSigners: [webauthPublicKey],
    eip7212WebAuthnPrecompileVerifier: config.p256Precompile,
  },
);

const paymaster = new CandidePaymaster(config.paymasterUrl);
const { userOperation: sponsoredUserOperation } =
  await paymaster.createSponsorPaymasterUserOperation(
    smartAccount,
    userOperation,
    config.bundlerUrl,
    config.sponsorshipPolicyId,
  );

sponsoredUserOperation.signature = await signWithPasskey(sponsoredUserOperation);

const response = await smartAccount.sendUserOperation(
  sponsoredUserOperation,
  config.bundlerUrl,
);
```

Regle: si la subvention echoue, le MVP doit afficher une erreur claire. Il ne doit pas demander a l'utilisateur d'envoyer de l'ETH.

## Architecture Frontend Prototype

Tout peut rester dans `vit-pay-app/`.

Proposition de structure:

```text
vit-pay-app/src/app/wallet/
  wallet.service.ts
  wallet.types.ts
  wallet-storage.service.ts
  wallet-config.ts

vit-pay-app/src/app/pages/page-wallet/
  page-wallet.component.ts
  page-wallet.component.html
```

### WalletService

API publique:

```ts
createWalletWithPasskey(): Promise<WalletState>
loadWallet(): Promise<WalletState | null>
sendZchfPayment(to: string, amount: string): Promise<UserOperationResult>
addDeviceWithPasskey(): Promise<UserOperationResult>
enableRecovery(guardians: string[], threshold: number): Promise<UserOperationResult>
startRecovery(newOwner: PasskeyOwner): Promise<RecoveryRequest>
finalizeRecovery(requestId: string): Promise<UserOperationResult>
```

Les composants Angular ne doivent appeler que cette API.

### WalletStorage

Stockage autorise:

```ts
type StoredWallet = {
  accountAddress: string;
  chainId: number;
  credentialId: string;
  webauthnPublicKey: {
    x: string;
    y: string;
  };
  owners: string[];
  recoveryEnabled: boolean;
  zchfTokenAddress: string;
};
```

Interdit:

- private key;
- seed phrase;
- mnemonic;
- shares Horcrux;
- secret recovery phrase.

## Spec Fonctionnelle

### F1 - Creer un wallet

Etapes:

1. L'utilisateur clique "Creer mon wallet".
2. Le navigateur ouvre WebAuthn.
3. L'utilisateur valide avec FaceID / TouchID.
4. Le frontend extrait la cle publique P-256.
5. `SafeAccountV0_3_0.initializeNewAccount([webauthPublicKey])`.
6. Le frontend affiche l'adresse Safe deterministe.
7. L'etat est stocke localement.

Validation:

- l'adresse Safe est stable apres refresh;
- aucun secret n'est stocke;
- le flow echoue proprement si WebAuthn n'est pas disponible.

### F2 - Recevoir du ZCHF de test

Etapes:

1. Si `ZCHF_TEST_ADDRESS` existe, utiliser le faucet ou une adresse de test financee.
2. Sinon, minter du `MockZCHF` vers le Safe.
3. Afficher le solde ZCHF.

Validation:

- le Safe affiche un solde positif;
- le token address vient de la config;
- le frontend n'a pas de logique specifique "mock".

### F3 - Envoyer un paiement sponsorise

Etapes:

1. L'utilisateur saisit destinataire + montant.
2. Le frontend construit un `transfer(address,uint256)`.
3. Le frontend cree une UserOperation.
4. Le paymaster sponsorise la UserOperation.
5. L'utilisateur signe avec passkey.
6. Le bundler inclut la UserOperation.
7. Le frontend affiche le hash et le nouveau solde.

Validation:

- aucun ETH n'est requis sur le Safe;
- le paiement est visible sur explorer;
- en cas d'echec paymaster, message explicite: "Transaction non sponsorisee".

### F4 - Ajouter un device

Etapes:

1. L'utilisateur ouvre "Ajouter un device".
2. Le nouveau device cree un passkey.
3. L'ancien owner signe une transaction `addOwnerWithThreshold`.
4. La transaction est sponsorisee.
5. Le nouveau passkey devient owner.

Validation:

- la liste des owners augmente;
- le nouveau device peut signer un paiement;
- le threshold reste coherent.

Regle MVP:

```text
threshold Safe = 1
owners = n passkeys
recovery = obligatoire avant usage production
```

### F5 - Activer recovery

Etapes:

1. L'utilisateur ajoute un ou plusieurs guardians.
2. Le frontend cree un batch:
   - enable SocialRecoveryModule;
   - add guardian(s);
   - set threshold.
3. Le batch est sponsorise.
4. L'utilisateur signe avec passkey.

Validation:

- le module recovery est actif;
- les guardians sont reconnus;
- le threshold est lisible.

MVP recommande:

```text
dev: 1-of-1 guardian avec grace period courte
demo: 1-of-2 guardians
production: 2-of-3 guardians minimum
```

### F6 - Restaurer un wallet

Etapes:

1. L'utilisateur perdu cree un nouveau passkey.
2. Un guardian initie ou signe la recovery.
3. La recovery remplace les owners par le nouveau passkey.
4. Apres grace period, la recovery est finalisee.
5. Le nouveau passkey signe une transaction de test.

Validation:

- l'ancien passkey n'est plus necessaire;
- le nouveau passkey peut payer;
- tentative avant grace period refusee;
- nombre insuffisant de guardians refuse.

## Plan de Tests

### Tests unitaires

- conversion montant ZCHF vers `bigint` 18 decimals;
- encodage `transfer(address,uint256)`;
- validation adresse EVM;
- serialisation/deserialisation `StoredWallet`;
- detection WebAuthn indisponible;
- mapping des erreurs paymaster/bundler vers messages utilisateur.

### Tests integration

- creation Safe Account deterministe;
- construction UserOperation sans signature;
- subvention UserOperation avec `CandidePaymaster`;
- signature passkey;
- envoi UserOperation au bundler;
- lecture solde ZCHF;
- ajout owner;
- activation SocialRecoveryModule.

### Tests end-to-end manuels

#### Scenario A - Creation + paiement

1. Ouvrir `vit-pay-app`.
2. Creer un wallet avec passkey.
3. Alimenter le wallet en ZCHF test ou MockZCHF.
4. Envoyer `0.01 ZCHF` vers une adresse de test.
5. Verifier l'inclusion sur explorer.

Succes:

- FaceID / TouchID demande;
- pas de demande d'ETH;
- UserOperation incluse;
- solde diminue.

#### Scenario B - Ajout device

1. Creer un wallet sur device A.
2. Ouvrir le flow "Ajouter device".
3. Creer un passkey sur device B.
4. Signer l'ajout depuis device A.
5. Envoyer un paiement depuis device B.

Succes:

- device B devient owner;
- device B peut signer seul si threshold `1`.

#### Scenario C - Recovery

1. Activer recovery avec guardian G.
2. Simuler perte du passkey initial.
3. Creer un nouveau passkey.
4. Guardian G signe la recovery.
5. Finaliser apres grace period.
6. Payer depuis le nouveau passkey.

Succes:

- nouveau passkey owner;
- ancien passkey non requis;
- transaction post-recovery incluse.

## Notes pour Iterations Futures

### Iteration 0.2

- Remplacer `MockZCHF` par ZCHF testnet officiel si disponible.
- Ajouter un faucet interne pour ZCHF test.
- Ajouter preflight anti-scam avant signature.
- Ajouter une page "debug UserOperation".

### Iteration 0.3

- Tester sur Optimism mainnet avec montants tres faibles.
- Ajouter monitoring des UserOperations.
- Ajouter un dashboard paymaster: budget, policies, erreurs.
- Ajouter limites de paiement journalieres.

### Iteration 0.4

- Comparer migration vers Safe `relay-kit`.
- Extraire uniquement les APIs stables dans `vit-core`.
- Archiver ou supprimer les stubs `core.safe.webauthn` et recovery custom.

## Criteres de Sortie MVP 0.1

Le MVP est valide si:

- un utilisateur cree un wallet avec passkey;
- une transaction ZCHF ou MockZCHF est envoyee sans ETH utilisateur;
- un second device est ajoute comme owner;
- un recovery minimal remplace l'owner;
- tous les flows passent via `WalletService`;
- aucune seed phrase, private key ou share Horcrux n'est exposee.

## Risques

- Disponibilite reelle de ZCHF sur testnet: a confirmer par RPC. Fallback: `MockZCHF`.
- Paymaster: necessite une policy active et un budget suffisant.
- WebAuthn: depend du domaine/RP ID; les passkeys crees sur `localhost` ne sont pas equivalents aux passkeys du domaine final.
- Recovery: une grace period trop courte est acceptable en dev, pas en production.
- Couplage Candide: evite via `WalletService`.

