# VIT Isn't TWINT
VIT is a private initiative to create an open-source competitor to TWINT. 
Our primary objective is straightforward: acquiring all the world.

## Vit-core 
The purpose of this project is to provide a simple and intuitive API for our VIT Wallet. This API facilitates spending, swapping, and lending, and is specifically designed for certain tokens such as ZCHF, USDC, (BTC), and ETH (on the Optimism network).

### 📚 Documentation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚀 MVP Gasless Flow (Safe4337Pack + ZCHF)                       │
│   • Step 1: Create Safe with passkey                            │
│   • Step 2: Preflight anti-scam check                           │
│   • Step 3: Execute gasless ZCHF payment                        │
│   • Swap to ZCHF example                                        │
├─────────────────────────────────────────────────────────────────┤
│ 🛡️ Anti-Scam Preflight (PRIORITY 2.5)                           │
│   • Patterns détectés (blocklist, approve, setApprovalForAll)   │
│   • Usage avec config                                           │
├─────────────────────────────────────────────────────────────────┤
│ 💰 PaymasterProvider Interface                                   │
│   • Providers (Pimlico ✅, Stackup stub)                        │
│   • Usage sponsorisé et token paymaster                         │
│   • Migration facile                                            │
├─────────────────────────────────────────────────────────────────┤
│ 📖 Module Reference (tableau)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## APIs (MVP v1.0)

### Safe + ERC-4337 (Account Abstraction)
Architecture: **Safe v6 + Relay Kit v4 (`Safe4337Pack`) + Pimlico paymaster**

- [x] `core.safe.4337`: **MVP "true path"** — gasless AA flow (ZCHF/Optimism)
- [x] `core.safe.account`: Safe v6 deterministic creation + management
- [x] `core.safe.execute`: Generic execution (single/batch)
- [x] `core.safe.payment`: ETH and ERC-20 transfers via Safe
- [x] `core.safe.paymaster`: **PaymasterProvider interface** — Pimlico (+ Stackup stub)
- [x] `core.safe.preflight`: **Anti-scam hook** — screen before signing (OK/WARN/BLOCK)
- [x] `core.safe.modules`: Enable/disable ERC-7579 modules
- [x] `core.safe.guard`: Enable/disable transaction guards
- [x] `core.safe.adapter`: ERC-7579 adapter helpers
- [x] `core.safe.owner-transfer`: Add/remove owners, threshold changes
- [x] `core.safe.webauthn`: WebAuthn module bridge (**Phase 2**)

### Authentication (WebAuthn / Passkeys)
- [x] `core.passkey`: WebAuthn wrapper (`registerPasskey`, `authenticatePasskey`)

### Identity & Cryptography
- [x] `core.AES`: AES encryption (browser-native)
- [x] `core.POW`: Proof-of-Work API
- [x] `core.SSS`: Shamir's Secret Sharing
- [x] `core.XOR`: Shuffle operations
- [x] `core.entropy`: Mnemonics and seed generation
- [x] `core.derivation`: Key derivation
- [ ] `identity.create`: Device-bound identity (**Phase 2**)
- [ ] `identity.horcrux`: Secure identity with SSS (**Phase 2**)
- [ ] `identity.recovery`: Restore identity with N of M Horcruxes (**Phase 2**)

### DeFi
- [x] `defi.uniswap`: Swap encoding for Uniswap V2 (`swap`, `encodeSwapExactTokensForTokens`)
- [~] `defi.aave`: Aave lending/borrowing (**Phase 2**)
- [ ] `defi.rocketpool`: Rocket Pool staking (**Phase 2**)
- [ ] `defi.frankencoin`: Frankencoin FPS/Savings Vault (**Phase 2**)

### Tools & Config
- [x] `tools.config`: Secure configuration
- [x] `tools`: Utilities (Session Storage, Converters)

### Configuration Options
| Option | Status | Notes |
|--------|--------|-------|
| `ZCHF_CONTRACT_ADDRESS` | ✅ | `0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553` (Optimism) |
| `salt` | ✅ | Deterministic deployment |
| `allowedTokens` | ✅ | Token whitelist |
| `networks` | ✅ | Chain configs |
| `uniswapRouterAddress` | ⚠️ | Per-chain config needed |
| `USDC_CONTRACT_ADDRESS` | ⚠️ | Per-chain config needed |
| `aave*` | ❌ | Phase 2 |
| `rocketPool*` | ❌ | Phase 2 |

### Security
- [x] Pre-flight anti-scam screening via `core.safe.preflight`
- [x] Blocklist/allowlist support (local + backend aggregator)
- [x] Risky pattern detection (unlimited approvals, setApprovalForAll)


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


## Safe v6 + Modules Workflow (MVP)

The MVP runs entirely on top of Safe v6 with ERC-7579-compatible modules. The following sequence describes the end-to-end flow to create an account, authenticate, pay, protect and restore.

---

## 🚀 MVP Gasless Flow (Safe4337Pack + ZCHF)

**File:** `core.safe.4337.ts`

This is the **recommended path for MVP**: gasless AA transactions on Optimism using ZCHF.

### Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Passkey    │───▶│  Create     │───▶│  Preflight  │───▶│  Execute    │
│  Register   │    │  Safe4337   │    │  Anti-scam  │    │  via 4337   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Step 1: Create Safe with passkey

```typescript
import { createSafeWithPasskey, Safe4337Config } from 'vit-core';

const config: Safe4337Config = {
  rpcUrl: 'https://optimism.rpc.url',
  bundlerUrl: 'https://bundler.pimlico.io/...',
  paymasterUrl: 'https://api.pimlico.io/...',
  chainId: 10,
};

const result = await createSafeWithPasskey({
  config,
  passkeyOwner: '0x...', // from passkey registration
  recoveryEOA: '0x...',
  threshold: 1,
}, signerPrivateKey);

console.log('Safe deployed:', result.safeAddress);
```

### Step 2: Preflight anti-scam check

```typescript
import { preflightRiskCheck, buildZchfTransfer } from 'vit-core';

const tx = buildZchfTransfer({ to: recipient, amount: parseZchf('50') });
const preflight = await preflightRiskCheck([tx], { blocklist: myBlocklist });

if (preflight.verdict === 'BLOCK') {
  throw new Error(preflight.summary);
}
if (preflight.verdict === 'WARN') {
  // Show warning UI, require extra confirmation
}
```

### Step 3: Execute gasless ZCHF payment

```typescript
import { initSafe4337Pack, sendZchfVia4337, parseZchf } from 'vit-core';

const pack = await initSafe4337Pack(config, safeAddress, signer);
const result = await sendZchfVia4337(pack, {
  to: '0xrecipient...',
  amount: parseZchf('100'), // 100 ZCHF
});

console.log('UserOp hash:', result.userOpHash);
```

### Swap to ZCHF

```typescript
import { initSafe4337Pack, swapToZchfVia4337 } from 'vit-core';

const pack = await initSafe4337Pack(config, safeAddress, signer);
const result = await swapToZchfVia4337(pack, {
  router: UNISWAP_V2_ROUTER,
  tokenIn: USDC_ADDRESS,
  amountIn: 1000000n, // 1 USDC
  amountOutMin: parseZchf('0.9'), // slippage
  recipient: safeAddress,
  deadline: BigInt(Date.now() / 1000 + 1800),
});
```

---

## 🛡️ Anti-Scam Preflight (PRIORITY 2.5)

**File:** `core.safe.preflight.ts`

Hook called **before any signature** to detect phishing/drainers.

### What it screens

| Pattern | Detection |
|---------|-----------|
| Recipient on blocklist | `BLOCK` |
| Spender in `approve()` on blocklist | `BLOCK` |
| Operator in `setApprovalForAll()` | `WARN` (high-risk by default) |
| Unlimited approval amount | `WARN` |

### Usage

```typescript
import { preflightRiskCheck, PreflightConfig } from 'vit-core';

const config: PreflightConfig = {
  blocklist: new Set(['0xknown_scammer...']),
  backendEndpoint: 'https://api.myapp.com/risk-check', // optional
};

const result = await preflightRiskCheck(transactions, config);
// result.verdict: 'OK' | 'WARN' | 'BLOCK'
// result.flags: detailed risk info
// result.summary: UI-friendly message
```

---

## 💰 PaymasterProvider Interface

**File:** `core.safe.paymaster.ts`

Abstraction layer for gas sponsorship. Swap providers without refactoring.

### Providers

| Provider | Sponsored | Token Paymaster | Status |
|----------|-----------|-----------------|--------|
| `PimlicoProvider` | ✅ | ✅ | Production |
| `StackupProvider` | ✅ | ❌ | Stub (migration-ready) |

### Usage

```typescript
import { createPaymasterProvider, PaymasterProviderConfig } from 'vit-core';

const config: PaymasterProviderConfig = {
  endpoint: 'https://api.pimlico.io/v2/10/rpc',
  apiKey: process.env.PIMLICO_API_KEY,
  chainId: 10,
};

const provider = createPaymasterProvider('pimlico', config);

// Sponsored mode (user pays nothing)
const sponsorData = await provider.sponsorUserOp(userOp);

// Token paymaster (user pays in ERC-20)
if (provider.supportsTokenPaymaster()) {
  const tokenData = await provider.getTokenPaymasterData({
    userOp,
    token: ZCHF_OPTIMISM,
  });
}
```

### Migrate to Stackup later

```typescript
// Just change the vendor string
const provider = createPaymasterProvider('stackup', config);
```

---

## Legacy Protocol Kit Workflow (non-4337)

For direct Safe execution without bundler/paymaster:

1) Create a Safe Account (deterministic optional)
- Use `core.safe.account.createSafeAccount({ provider, signerPrivateKey, owners, threshold, saltNonce? })` to predict and deploy.
- Retrieve owners and threshold with `core.safe.account.getSafeInfo`.

2) Install and Enable Modules / Guards
- Enable your validator/executor modules with `core.safe.modules.enableModuleViaSafe`.
- Enable a guard to enforce spending rules with `core.safe.guard.enableGuardViaSafe`.

3) Link WebAuthn (Phase 2 — Biometric Authentication via Module)
- Collect passkey credential/signature using `core.passkey` (browser).
- Use `core.safe.webauthn.linkPasskeyToSafe` to link the passkey to your WebAuthn validator module.
- For gated execution, wrap calls with `core.safe.webauthn.executeWithPasskey`.

4) Payments (ETH / ERC-20)
- For ETH: `core.safe.payment.sendEthViaSafe({ to, amountWei })`.
- For ERC-20: `core.safe.payment.sendErc20ViaSafe({ token, to, amount })`.
- Guards (if enabled) will validate these operations.

5) Protection (Policies & Limits)
- Use guards (e.g., `core.safe.guard`) to enforce daily limits, whitelists, or other policies.
- Additional ERC-7579 modules can hook into pre/post-execution for extra validation.

6) Ownership Transfer / Recovery
- Recovery modules can validate recovery codes and call `core.safe.owner-transfer.addOwnerViaSafe` or `removeOwnerViaSafe` to rotate keys.
- Adjust threshold according to your recovery policy.

7) Execution Utilities
- When you need generic execution (single/batch), use `core.safe.execute.executeViaSafe`.

---

## Module Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `core.safe.4337.ts` | MVP AA flow | `initSafe4337Pack`, `createSafeWithPasskey`, `executeVia4337`, `sendZchfVia4337`, `swapToZchfVia4337`, `buildZchfTransfer`, `buildSwapToZchf`, `buildErc20Transfer`, `buildErc20Approve`, `parseZchf`, `formatZchf`, `ZCHF_OPTIMISM`, `ZCHF_DECIMALS` |
| `core.safe.preflight.ts` | Anti-scam | `preflightRiskCheck`, `analyzeTransactionLocally`, `callBackendRiskScreening`, `parseErc20Approve`, `parseSetApprovalForAll`, `isBlocked`, `isAllowed`, `RISKY_SELECTORS` |
| `core.safe.paymaster.ts` | Paymaster abstraction | `PaymasterProvider`, `PimlicoProvider`, `StackupProvider`, `createPaymasterProvider`, `sponsorUserOp`, `configurePaymaster` |
| `core.safe.adapter.ts` | ERC-7579 adapter | `adapterRegisterModule`, `adapterSetPermission` |
| `core.safe.account.ts` | Safe lifecycle | `createSafeAccount`, `getSafeInfo` |
| `core.safe.execute.ts` | Execution | `executeViaSafe` |
| `core.safe.payment.ts` | Payments | `sendEthViaSafe`, `sendErc20ViaSafe`, `buildErc20TransferData` |
| `core.safe.modules.ts` | Module management | `enableModuleViaSafe`, `disableModuleViaSafe`, `installModule`, `uninstallModule`, `batchModuleCalls` |
| `core.safe.guard.ts` | Guard management | `enableGuardViaSafe`, `disableGuardViaSafe`, `configurePaymentGuard` |
| `core.safe.owner-transfer.ts` | Ownership | `addOwnerViaSafe`, `removeOwnerViaSafe` |
| `core.passkey.ts` | WebAuthn | `registerPasskey`, `authenticatePasskey` |
| `core.safe.webauthn.ts` | Phase 2 bridge | `installWebAuthnModule`, `linkPasskeyToSafe`, `executeWithPasskey` |

---

## Notes
- Provider is an RPC URL string; signer is a private key string (or passkey signer when available).
- Replace placeholder ABIs/selectors in `core.safe.webauthn` and guard/module configuration with your contract ABIs.
- ZCHF on Optimism: `0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553` (18 decimals)
- [ERC-4337 - discussions](https://chatgpt.com/c/8a462eda-72a2-406f-be7a-31f2fb5aac85)
- [ERC-4337 - custom guardian](https://chatgpt.com/c/672b9681-9748-8010-babb-a9f3c6137c41)
- [ERC-4337 - escrow transaction](https://chatgpt.com/share/6735bdcc-acc4-8010-a635-66a7bdf2f65a)
- [ERC-4337 - permissionless.js](https://chatgpt.com/c/6735bf4f-667c-8010-b7e6-13034443dfd0)