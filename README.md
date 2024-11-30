# VIT Isn't TWINT
«🚀 ViT; is a decentralized payment processing system built on Ethereum (L2), offering secure, upgradable, and flexible smart contracts for handling transfers, authorizations, captures, cancellations, and refunds using whitelisted ERC-20 tokens [xCHF, USDC, wETH, wBTC]»

✅ Lower fees: 0.3% + 1ct vs TWINT's 1.8% + 20ct<br/>
✅ No bank account required<br/>
✅ Open-source & permissionless infrastructure

Made with ❤️ for secure and transparent blockchain payments!

![GO2wJhSWQAA4UWQ](https://github.com/user-attachments/assets/7c17a070-3d37-4da3-bbdb-51c0fa485d34)

## Project Structure

This monorepo contains three main packages:

### 1. [`vit-core`](./packages/vit-core/)
Core API library providing:
- Account management (ERC-4337)
- Identity services
- Transaction handling
- DeFi integrations (Aave, Uniswap)
- Cryptographic tools
- Configuration management

### 2. [`vit-erc4337-contracts`](./packages/vit-erc4337-contracts/)
Smart contracts implementing:
- Account abstraction (ERC-4337)
- Payment processing
- Token management
- Security features

### 3. [`vit-pay-app`](./packages/vit-pay-app/)
User interface components for:
- Wallet management
- Payment processing
- Transaction history
- DeFi operations

