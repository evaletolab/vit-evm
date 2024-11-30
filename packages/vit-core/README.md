# VIT Isn't TWINT
VIT is a private initiative to create an open-source competitor to TWINT. 
Our primary objective is straightforward: acquiring all the world.

## Vit-core 
The purpose of this project is to provide a simple and intuitive API for our VIT Wallet. This API facilitates spending, swapping, and lending, and is specifically designed for certain tokens such as XCHF, USDC, (BTC), and ETH (on the Optimism network).

## APIs (checked for v0.01)
* [ERC-4337 - discussions](https://chatgpt.com/c/8a462eda-72a2-406f-be7a-31f2fb5aac85)
* [ERC-4337 - custom guardian](https://chatgpt.com/c/672b9681-9748-8010-babb-a9f3c6137c41)
* [ERC-4337 - escrow transaction](https://chatgpt.com/share/6735bdcc-acc4-8010-a635-66a7bdf2f65a)
* [ERC-4337 - permissionless.js](https://chatgpt.com/c/6735bf4f-667c-8010-b7e6-13034443dfd0)

### Account ERC-4337
- [x] select startup SDK (Thirdweb,StackUp,Biconomy,Pimlico, ...)
- [x] `account.create` // ERC-4337 instance, plus recovery code
  - One-Time Use Codes, Two-Factor, Whitelist, Timespend, DeadDonation
- [x] `account.recovery` with Guardians
- [x] `account.localEncrypt`
- [~] `account.TX(Time-Locked Transactions)` 
- [ ] `account.TX(Reputation System)` 
- [~] `account.TX(Custom Validation Logic)` 
- [~] `account.paymaster`: paymasters allow users to sponsor transactions or accept  **xCHF** (ERC20 tokens) for gas payment.

### Core
The main feature provides also a solid solution to protect your **Digital Identity** with multiple strategies.

- [ ] `identity.create`: Create an identity associated with the device (**DOING**)
- [ ] `identity.horcrux`: Secure identity
- [ ] `identity.recovery`: Restore identity with N Horcruxes of M

### Tx
- [~] `evm.transaction`: Interact with the ETH network to sign/send/read/list transactions (**TODO**).
- [~] `evm.paymaster`: Interact with 4337 Account Abstraction (**TODO**).
- [~] `transaction`: high level api for transactions that include  black/white-addresses.
 
### Core
- [x] `core.AES`: Simple AES encryption wrapper available natively on the browser.
- [x] `core.POW`: Simple Proof-of-Work API.
- [x] `core.SSS`: Shamir's Secret Sharing Wrapper.
- [x] `core.XOR`: Shuffle operations to avoid clear content.
- [x] `core.entropy`: API related to Mnemonics and seed.
- [x] `core.derivation`: API related to key derivation.

### config.option
* [ ] `aavePoolProviderAddress`
* [ ] `aavePoolProviderABI`
* [ ] `aaveContractAddress`
* [ ] `aaveTokenAddress`
* [ ] `rocketPoolContractAddress`
* [ ] `uniswapRouterAddress` 
* [ ] `USDC_CONTRACT_ADDRESS`
* [ ] `RPL_CONTRACT_ADDRESS`
* [x] `XCHF_CONTRACT_ADDRESS` 
* [x] `salt`
* [x] `allowedTokens`
* [x] `networks`

### Tools
- [x] `tools.config`: Secure configuration for the project.
- [x] `tools`: Utilities (Secure Session Storage , Converters, ...).

### DeFi
- [ ] `defi.aave`: Interact with the Aave protocol to lend USDC.
- [ ] `defi.rocketpool`: Interact with the Rocket Pool to stake ETH.
- [ ] `defi.uniswap`: Interact with Uniswap to swap XCHF <=> USDC.

### Others
- [ ] Use [scam-database/blacklist](https://github.com/scamsniffer/scam-database/tree/main/blacklist) for TX.validation


## 4337 security
###  Biconomy Security Solutions

* **Paymasters**: Biconomy allows the use of Paymasters to sponsor transactions. Developers can implement custom logic in the Paymaster contract to validate transactions.
* **Gas Tank**: Biconomy’s Gas Tank mechanism ensures that users can pay transaction fees using ERC-20 tokens, adding an extra layer of security by abstracting gas payments.
* **Rate Limiting**: Implementing rate limiting can prevent abuse by limiting the number of transactions a user can perform in a given period.
* **Monitoring and Alerts**: Biconomy provides tools for monitoring transactions and setting up alerts for suspicious activities, enabling quick responses to potential security threats.

### StackUp Security Solutions (userop.js)
* **Custom Validation Logic**: StackUp’s Userop.js allows developers to define custom validation logic within their smart contracts to ensure transactions meet specific security criteria.
* **EntryPoint Contract**: The EntryPoint contract in StackUp verifies and executes UserOperations. Developers can customize the verification process to include additional security checks.
* **Simulation**: Before actual execution, transactions can be simulated to verify their validity. This helps in identifying and preventing potentially malicious transactions.
* **Reputation System**: StackUp supports implementing a reputation system to prioritize transactions from trusted sources while scrutinizing or rejecting those from untrusted sources.

### Pimlico Security Solutions
* **Two-Factor** Authentication (2FA): Pimlico allows integrating 2FA within smart contract wallets. This requires users to provide an additional authentication factor before a transaction is approved.
* **Multi-Signature Wallets**: Pimlico supports multi-signature wallets, where multiple approvals are required to validate a transaction. This adds a layer of security by distributing control across multiple parties.
* **Time-Locked** Transactions: Implementing time-locked transactions ensures that a certain period must pass before a transaction is executed, providing a buffer to detect and prevent fraudulent activities.
* **Recovery Mechanisms**: Secure recovery mechanisms, such as social recovery or backup keys, ensure that users can regain access to their accounts and secure their transactions even if their primary keys are compromised.

## Digital Identity
Digital identity is a new reality, it appears complex or wird because we have no practice on that subject. The goal of VIT is to provide a few solutions to protect your identiy without the needs of a trusted thirdparties.

A Digital Identity is simply a 32-bytes large number, often represented as a mnemonic of 12/15/24 words (to facilitate human memorization of words instead of numbers). With this large number, you are able to generate an infinite number of Wallets and public identities.

Okay, but what it means for a day-to-day life? With this **secret large number**, you can generate multiple digital identities: one for cash transactions, one to collect funds for a birthday, some for social networks, some are publics, some are privates.

To achieve that goal, we built a simple and deterministic API as a frictionless solution to manage your own private mnemonic.

## Use Horcruxes/SSS to recover your identity
To increase the security of your identity, we break the Mnemonic phrase (**the secret large number**) into 3 separate pieces (called Horcruxes). You need at **least two pieces** to reconstitute your identity. You decide where you want to store each Horcrux. We recommend you keep them in separate places/locations. We provide a few alternatives (do not keep all of them on trusted third parties):

* One Horcrux is stored on the device.
* One or two Horcruxes are stored on printed paper and kept in separate places/locations.
* One is stored on our Vault SmartContract, a digital and secure place.


