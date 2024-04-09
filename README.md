# kng2-web3 😸
This is a private challenge to develop an open-source TWINT competitor.
The purpose of this project is to provide a simple and intuitive API to handle a browser wallet for payment, swap, and lending. The APIs are specifically designed for XCHF, USDC, BTC, and ETH (on Optimism network).

## config.options
* `aavePoolProviderAddress`
* `aavePoolProviderABI`
* `aaveContractAddress`
* `aaveTokenAddress`
* `rocketPoolContractAddress`
* `USDC_CONTRACT_ADDRESS`
* `RPL_CONTRACT_ADDRESS`
* `XCHF_CONTRACT_ADDRESS`
* `salt`
* `allowedTokens`
* `networks`

### Tools
- `tools.config`: Secure configuration tools for the project.
- `tools.utils`: Utility functions for the project.

### Core
- `core.identity`: Manage and secure an identity associated with the device (**TODO**)
- `core.AES`: Simple AES encryption wrapper available natively on the browser.
- `core.POW`: Simple Proof-of-Work API.
- `core.SSS`: Shamir's Secret Sharing Wrapper.
- `core.XOR`: Shuffle operations to avoid clear content.
- `core.entropy`: API related to Mnemonics and seed.
- `core.derivation`: API related to key derivation.

### Tx
- `eth.transaction`: Interact with the ETH network to send/read/list transactions (**TODO**).
- `btc.transaction`: Interact with the BTC network to send/read/list transactions (**TODO**).
- `transaction`: Common tools for transactions that include scam-database and white-list.

### DeFi
- `defi.aave`: Interact with the Aave protocol to lend USDC.
- `defi.rocketpool`: Interact with the Rocket Pool to stake ETH.
- `defi.uniswap`: Interact with Uniswap to swap XCHF <=> USDC.

### Others
- [ ] Use [scam-database/blacklist](https://github.com/scamsniffer/scam-database/tree/main/blacklist) (**TODO**)
