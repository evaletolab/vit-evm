# VIT Isn't TWINT
VIT is a private initiative to create an open-source competitor to TWINT. 
Our primary objective is straightforward: acquiring all the world.

## kng-web3 😸 (AKA. King Kong II for Web3)
The purpose of this project is to provide a simple and intuitive API for our VIT Wallet. This API facilitates spending, swapping, and lending, and is specifically designed for certain tokens such as XCHF, USDC, (BTC), and ETH (on the Optimism network).

But the main feature provides a solid solution to protect your **Digital Identity** with multiple strategies.

## APIs (checked for v0.01)
### Account ERC-4337
- [x] select startup SDK (Thirdweb,StackUp,Biconomy,Pimlico)
- [x] `account.create` // ERC-4337 instance, plus recovery code, plus horcruxes
- [x] `account.recovery`
- [x] `account.localEncrypt`
- [ ] `account.TX(Time-Locked Transactions)` // Pimlico
- [ ] `account.TX(Reputation System)` // StackUp
- [ ] `account.TX(Custom Validation Logic)` // StackUp (whitelist add)
- [ ] `account.paymaster`: paymasters allow users to sponsor transactions or accept  **xCHF** (ERC20 tokens) for gas payment.

### Tx
- [ ] `evm.transaction`: Interact with the ETH network to sign/send/read/list transactions (**TODO**).
- [ ] `btc.transaction`: Interact with the BTC network to sign/send/read/list transactions (**TODO**).
- [ ] `transaction`: high level api for transactions that include  black/white-addresses.
 
### Core
- [x] `core.identity`: Manage and secure an identity associated with the device (**DOING**)
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


## Preparing content
Before storing Horcruxes on your devices or on public ledgers, we use our API to protect the content.

* **Secret-Leafs (A/B)** are generated client-side with the preimage of a pseudo, password, and POW. 
* ~~The POW element is the [puzzle](https://en.wikipedia.org/wiki/Proof_of_work#List_of_proof-of-work_functions) result of user sha256(username, password). It's a simple way to protect against DoS attacks.~~
* The POW element is a PBKDF2 of username and password, it's a simple way to protect against DoS attacks.
* Users can also choose to store the pseudo/password form fields on a third-party service.
* **Public-Leafs (A/B)** are derivated images of **Secret-Leafs (A/B)**, These values can be used for specific **online** features, such as storing a Horcrux in a public blockchain.
* **Public-Leaf0** is the result of sha256(leaf1, leaf2). This publicKey (leaf0) will be used as address to store a Horcrux.


[![](https://mermaid.ink/img/pako:eNqdl1tv4ygUgP-K5dFIHW0S-X7pW5O00mqr3ZXanZfJPGCDExRiZzGeNtP0vy_40gCOncxiKbI537lwgAN5M9MCIvPWXFOw3xjPy1Vu8FZWSdOxrxKC0ylBICsb0T-_L7-JT2tasoIiOK0w_G5Mp1PjKLrtY6tz94GfhE4nnDdClMPmpVU5ke7RKFFKEbuTgfkJ8DqgNaXF3cjkuFtzxnQ2Ne76XXO5a153LfpdPD1a5F3HiOfGwbHcgKNRlYjmYIduvom3718aojF-_Hv-x_JB5Kh4sRvgN_7aQbXLKwe77Bl0OoOgLGWrizPB1dBLQaGko0UhHnNi7hDdAQz5-nkT4pXJNmiHVuYtf4UoAxVhK3Miib4CikFCUCmYt3Y0ZgLS7ZoWFbddq75sMEOtopDvKd4BelgUpKAN8el-cb94eJAYnoQihxqV8QZlSwxRhlVoU5KbyJoYtmV9nhhxMHNCz7fiyHLjz1_6Qcx5XhDV9B2PGwiEfjSo_xHgWQvBhwF35juxZ9th4IWKgS72s_rR5QDaATyjVybnyHZt17LOBaqTFm-OfSYiDaTr5Cae-VbbbJ7VwS85QIJzJPtz66b4UwNSpXwl5vPtenyBnIDe2kjqvNqtOHZDaznviZ1WDHhTvANKi5cNAnB0BFmRsweww-TQEKsVHxVFSZVuEDN2pfieGD8QhSAHE0PsFqKpP-Gf7Q6zg_2rnD6QIDLXttInFIlHwnJe8EfSVIvroQ4lIiVVyWd-JJMdIZvpJaytD484345POmYEDc86gmv0eN3IQcpPLDmoeuv68SxwAjuIHMdzJwb_DMPAdwPXdiKxn8JZbNlxYIWR5yr7qTE3nMlarm2NhPAodeZRXfdrig7yusXrHJDhBDTy59Gt0SyN4pVHO1pEP7izRe5_Z6o2eyETpCj2F5C8YKgXWX9h1Zg6UL5AfQA15vLU4B-A4SLv-wyC4DypufXEo9SgfyuUp-jPapcoFvUTjxervj1eV8GNbTnirOI_ju9PDGvmxcqiJOzpnO4FB84pUZ5yGDBQbvvj910vS1IdUwcfgdiCUGNEzh_xesNGQuu4K5AloNuRKeywvypWYoiuIBf8lrkVFxT13HPtwNUnHD1flxoJVhOUZGmYZRK5plg-PYjIk1YMYJGfMTVK6hFqXEox648iyyLedExdjUiZ3AKCg1bIVKIuAiNTgPgBSrUU-b7Dmw7pta5HpYTfWAU1dMXJMCHPhz2yhgphB9hDR1wHOKf66Fre5Vtkp-ee9GznpDd4-ev0PEkvDK7355_0pr_gLpBumNc7C6Ugo2jQm1B7X-Xv_I9EtYeAoXuI-XFo3maAlGhigooVT4c8NW8ZrVAHLTHgf3t2LfX-H4XSVeg)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdl1tv4ygUgP-K5dFIHW0S-X7pW5O00mqr3ZXanZfJPGCDExRiZzGeNtP0vy_40gCOncxiKbI537lwgAN5M9MCIvPWXFOw3xjPy1Vu8FZWSdOxrxKC0ylBICsb0T-_L7-JT2tasoIiOK0w_G5Mp1PjKLrtY6tz94GfhE4nnDdClMPmpVU5ke7RKFFKEbuTgfkJ8DqgNaXF3cjkuFtzxnQ2Ne76XXO5a153LfpdPD1a5F3HiOfGwbHcgKNRlYjmYIduvom3718aojF-_Hv-x_JB5Kh4sRvgN_7aQbXLKwe77Bl0OoOgLGWrizPB1dBLQaGko0UhHnNi7hDdAQz5-nkT4pXJNmiHVuYtf4UoAxVhK3Miib4CikFCUCmYt3Y0ZgLS7ZoWFbddq75sMEOtopDvKd4BelgUpKAN8el-cb94eJAYnoQihxqV8QZlSwxRhlVoU5KbyJoYtmV9nhhxMHNCz7fiyHLjz1_6Qcx5XhDV9B2PGwiEfjSo_xHgWQvBhwF35juxZ9th4IWKgS72s_rR5QDaATyjVybnyHZt17LOBaqTFm-OfSYiDaTr5Cae-VbbbJ7VwS85QIJzJPtz66b4UwNSpXwl5vPtenyBnIDe2kjqvNqtOHZDaznviZ1WDHhTvANKi5cNAnB0BFmRsweww-TQEKsVHxVFSZVuEDN2pfieGD8QhSAHE0PsFqKpP-Gf7Q6zg_2rnD6QIDLXttInFIlHwnJe8EfSVIvroQ4lIiVVyWd-JJMdIZvpJaytD484345POmYEDc86gmv0eN3IQcpPLDmoeuv68SxwAjuIHMdzJwb_DMPAdwPXdiKxn8JZbNlxYIWR5yr7qTE3nMlarm2NhPAodeZRXfdrig7yusXrHJDhBDTy59Gt0SyN4pVHO1pEP7izRe5_Z6o2eyETpCj2F5C8YKgXWX9h1Zg6UL5AfQA15vLU4B-A4SLv-wyC4DypufXEo9SgfyuUp-jPapcoFvUTjxervj1eV8GNbTnirOI_ju9PDGvmxcqiJOzpnO4FB84pUZ5yGDBQbvvj910vS1IdUwcfgdiCUGNEzh_xesNGQuu4K5AloNuRKeywvypWYoiuIBf8lrkVFxT13HPtwNUnHD1flxoJVhOUZGmYZRK5plg-PYjIk1YMYJGfMTVK6hFqXEox648iyyLedExdjUiZ3AKCg1bIVKIuAiNTgPgBSrUU-b7Dmw7pta5HpYTfWAU1dMXJMCHPhz2yhgphB9hDR1wHOKf66Fre5Vtkp-ee9GznpDd4-ev0PEkvDK7355_0pr_gLpBumNc7C6Ugo2jQm1B7X-Xv_I9EtYeAoXuI-XFo3maAlGhigooVT4c8NW8ZrVAHLTHgf3t2LfX-H4XSVeg)

This how identity is used to prepare Horcruxes of our Identity.


[![](https://mermaid.ink/img/pako:eNqdV1tv4jgU_itR0Eh0J6W5E5BmpO1NI001uxLVvgzz4CQOWISEdZy2bNX_vse5ENuBwK6RQOZ85_b5-Nh-16M8xvpcLxhi-J6gFUXb6xd7mWkwfv72S7u-_qotFoubTJtrizXaEqotcEQx4zOKb7JlVoMrC9o6pxEt38ZFhTGKorjJrrR3TRm1Ch-1be5lS94w7QS1hU4y11DJ1uMr7cvXRjYSzFSQCtxEAEZr6Uf90_3NQQXLKW4jz3IInJLVmml5UosgWf6LVvjnrgy_4_0v7YtWkozZnj8-mLpaKtlXEZYFphnaYmOHiuI1p_Fg_i3HrRZ4JjHOGGH7g6Uq55LEfa3WhajVuQWtnah18FFRUHPYSQ-2jkpbyivhGo3q-VzIpPu3AkGIUDHffm9KYVSHU4YpiQ4LI3InZX0xZWIN1HMu-fP2-_3jiM-PSXmgsqzDS4C55pnmttAg7vwVvi0-kxM-6BzS5f98rgy2y3ZzWISPumB0Q99iukUkhp33zkVLna3xFi91IFSPcYLKlC11QxD9hShBYYoLjnmvzS31EEWbFc3LLK5VX9eE4UaRy3eUbBHd3-VpTmvE6OHu4e7xUcDA-uRZrKASGLFoiWHKiAxaF-k4MA1OyydDm_kTe-p65iwwndmnq34Qt1BbmCr6tgsGfK4fnNQ_BHjUgn8w4Ew8e-Za1tR3p5KBNvaj-sH5AJoEnvEbEzmyHMsxzWOBqkgThm0diUgB0lU4nk08sxkWsHpyJgaYkgyL_pxqSP7kgGQpVGJ2u1kNF0gH6NVGWPFqNeKZMzXvb3tiuxEjGJJ3RGn-usYoHswgyTP2CMdPuq8RyyVkRXFYRmtoOLAtYW5oL5jGKEOGxndLqqgvyD_NDrP83ZtIHwpxeqtspREO-EeAZXBUDtBUiatUTxERpWUBKz_AZIsQzfQIa_rDE8k2w4tOWIpPrzqOV_jpssxRBIehGFS1db3ZxLd9yw9s23UMDabTqe85vmPZAd9P08nMtGa-OQ1cR9pPtbnTTFZyZWuEKUSpYp7kul9RvBfrlqwylJ4moJY_D26NujTyN4h2sIkecEeb3P9mqjJ7hok0z3dnIPyG04usX1gVTE4UCtRDsYI5vzTkBTGSZ32fvu8fRypuXf6RetDfJc4i_KPchpJF9cSDZtW3B30VjS3T5mcVfNmeZ2jmxJ1JRZmyxTHdMw7sjihXOgwYKjb9_D3HTcJIhcnJB2hmxrGC4Zw_8TvqQGgt7gLIPaKbgSVsYX-UrICL2QXIO7jXbfgFRT73HMt31AXHz5dRI4BlgsIkmiaJgFxRIp4eKedJaQZxnh0xNYhUI1RwESWsn0WSBDBUmFyNWFrcPEZ7pZHJiKoJDCwBhgOUKhR5ng1DBam9roeKUngEcNSpK05C0vR5v8PmqUbYAqxTR1wLsLv-6Jju-Vtkq-d0epbd6Z28_LV6rqA39S_353V61__BnS_cMC93NhWCDIKT3rgavCU-4CFR7mJ4PT3EBI5DfZ6gtMCGDu_QfLHPIn3OaIlbUPO8b1Af_wIX8aPv)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV1tv4jgU_itR0Eh0J6W5E5BmpO1NI001uxLVvgzz4CQOWISEdZy2bNX_vse5ENuBwK6RQOZ85_b5-Nh-16M8xvpcLxhi-J6gFUXb6xd7mWkwfv72S7u-_qotFoubTJtrizXaEqotcEQx4zOKb7JlVoMrC9o6pxEt38ZFhTGKorjJrrR3TRm1Ch-1be5lS94w7QS1hU4y11DJ1uMr7cvXRjYSzFSQCtxEAEZr6Uf90_3NQQXLKW4jz3IInJLVmml5UosgWf6LVvjnrgy_4_0v7YtWkozZnj8-mLpaKtlXEZYFphnaYmOHiuI1p_Fg_i3HrRZ4JjHOGGH7g6Uq55LEfa3WhajVuQWtnah18FFRUHPYSQ-2jkpbyivhGo3q-VzIpPu3AkGIUDHffm9KYVSHU4YpiQ4LI3InZX0xZWIN1HMu-fP2-_3jiM-PSXmgsqzDS4C55pnmttAg7vwVvi0-kxM-6BzS5f98rgy2y3ZzWISPumB0Q99iukUkhp33zkVLna3xFi91IFSPcYLKlC11QxD9hShBYYoLjnmvzS31EEWbFc3LLK5VX9eE4UaRy3eUbBHd3-VpTmvE6OHu4e7xUcDA-uRZrKASGLFoiWHKiAxaF-k4MA1OyydDm_kTe-p65iwwndmnq34Qt1BbmCr6tgsGfK4fnNQ_BHjUgn8w4Ew8e-Za1tR3p5KBNvaj-sH5AJoEnvEbEzmyHMsxzWOBqkgThm0diUgB0lU4nk08sxkWsHpyJgaYkgyL_pxqSP7kgGQpVGJ2u1kNF0gH6NVGWPFqNeKZMzXvb3tiuxEjGJJ3RGn-usYoHswgyTP2CMdPuq8RyyVkRXFYRmtoOLAtYW5oL5jGKEOGxndLqqgvyD_NDrP83ZtIHwpxeqtspREO-EeAZXBUDtBUiatUTxERpWUBKz_AZIsQzfQIa_rDE8k2w4tOWIpPrzqOV_jpssxRBIehGFS1db3ZxLd9yw9s23UMDabTqe85vmPZAd9P08nMtGa-OQ1cR9pPtbnTTFZyZWuEKUSpYp7kul9RvBfrlqwylJ4moJY_D26NujTyN4h2sIkecEeb3P9mqjJ7hok0z3dnIPyG04usX1gVTE4UCtRDsYI5vzTkBTGSZ32fvu8fRypuXf6RetDfJc4i_KPchpJF9cSDZtW3B30VjS3T5mcVfNmeZ2jmxJ1JRZmyxTHdMw7sjihXOgwYKjb9_D3HTcJIhcnJB2hmxrGC4Zw_8TvqQGgt7gLIPaKbgSVsYX-UrICL2QXIO7jXbfgFRT73HMt31AXHz5dRI4BlgsIkmiaJgFxRIp4eKedJaQZxnh0xNYhUI1RwESWsn0WSBDBUmFyNWFrcPEZ7pZHJiKoJDCwBhgOUKhR5ng1DBam9roeKUngEcNSpK05C0vR5v8PmqUbYAqxTR1wLsLv-6Jju-Vtkq-d0epbd6Z28_LV6rqA39S_353V61__BnS_cMC93NhWCDIKT3rgavCU-4CFR7mJ4PT3EBI5DfZ6gtMCGDu_QfLHPIn3OaIlbUPO8b1Af_wIX8aPv)

## Horcrux
We propose the usage of Shamir Shared Secret (SSS) to protect your Mnemonic without the problem of single point of security. We decide to use as source of SSS the entropy that produce the Mnemonic. Shamir split entropy in **3 separate pieces** (called Horcruxes). Your need at least two pieces to reconstitute deterministicaly the same Mnemonic. We recomend you keep them in separate places/locations:

* Use printed paper.
* And use our Horcrux SmartContract. 👇
[![](https://mermaid.ink/img/pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)

## Refs
- https://chatgpt.com/share/b07564f7-7c48-43a0-9419-c505f283ffde
