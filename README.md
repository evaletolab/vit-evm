# kng2-web3 😸 (AKA. King Kong II for Web3)
This is a private challenge to develop an open-source TWINT competitor.
The purpose of this project is to provide a simple and intuitive API to handle a browser wallet for payment, swap, and lending. The APIs are specifically designed for XCHF, USDC, BTC, and ETH (on Optimism network).

## APIs
### config.option
* `aavePoolProviderAddress`
* `aavePoolProviderABI`
* `aaveContractAddress`
* `aaveTokenAddress`
* `rocketPoolContractAddress`
* `uniswapRouterAddress` 
* `USDC_CONTRACT_ADDRESS`
* `RPL_CONTRACT_ADDRESS`
* `XCHF_CONTRACT_ADDRESS`
* `salt`
* `allowedTokens`
* `networks`

### Tools
- `tools.config`: Secure configuration for the project.
- `tools.utils`: Utility functions for the project.

### Core
- `core.identity`: Manage and secure an identity associated with the device (**DOING**)
- `core.AES`: Simple AES encryption wrapper available natively on the browser.
- `core.POW`: Simple Proof-of-Work API.
- `core.SSS`: Shamir's Secret Sharing Wrapper.
- `core.XOR`: Shuffle operations to avoid clear content.
- `core.entropy`: API related to Mnemonics and seed.
- `core.derivation`: API related to key derivation.

### Tx
- `evm.transaction`: Interact with the ETH network to send/read/list transactions (**TODO**).
- `btc.transaction`: Interact with the BTC network to send/read/list transactions (**TODO**).
- `transaction`: high level api for transactions that include  black/white-addresses.

### DeFi
- `defi.aave`: Interact with the Aave protocol to lend USDC.
- `defi.rocketpool`: Interact with the Rocket Pool to stake ETH.
- `defi.uniswap`: Interact with Uniswap to swap XCHF <=> USDC.

### Others
- [ ] Use [scam-database/blacklist](https://github.com/scamsniffer/scam-database/tree/main/blacklist) (**TODO**)


## Identity
Protect your Digital Identity! Digital identity is a new reality, it appears complex or wird because we have no practice on that subject. The goal of this application is to provide a few solutions to protect your identiy without the needs of a trusted thirdparties.

But what is a Digital Identity? It's simply a 32-byte large number, often represented as a mnemonic of 12/15/24 words (to facilitate human memorization of words instead of numbers). With this large number, you are able to generate an infinite number of Wallets and public identities.

Okay, but what is a Digital Identity for day-to-day life? With this root number, you can generate multiple identities (one for cash transactions, one to collect funds for a birthday, one validated by the state to authorize voting, authorize bus tickets, etc.) with various levels of privacy depending on the purpose. It allows a type of authentication on the Internet without mandatory KYC. It's like cash but online.

To achieve that goal, we built a simple and deterministic API as a frictionless solution to manage your own private mnemonic.

## Use Horcruxes/SSS to recover your identity
To increase the security of your identity, we break the Mnemonic phrase into 3 separate pieces (called Horcruxes). You need at **least two pieces** to reconstitute your identity. You decide where you want to store each Horcrux. We recommend you keep them in separate places/locations. We provide a few alternatives (do not keep all of them on trusted third parties):

* One Horcrux is stored on the device.
* One or two Horcruxes are stored on printed paper and kept in separate places/locations.
* One is stored on our Vault SmartContract, a digital and secure space.

Before storing Horcruxes on public devices, we use our API to protect the data.

* **Secret-Leafs (A/B)** are generated client-side with the preimage of a pseudo, password, and POW. 
* The POW element is the [puzzle](https://en.wikipedia.org/wiki/Proof_of_work#List_of_proof-of-work_functions) result of user sha256(username, password). It's a simple way to protect against DoS attacks. 
* Users can also choose to store the pseudo/password form fields on a third-party service.
* **Public-Leafs (A/B)** are derivated images of **Secret-Leafs (A/B)**, These values can be used for specific **online** features, such as storing a Horcrux in a public blockchain.
* **Public-Leaf0** is the result of sha256(leaf1, leaf2). This publicKey (leaf0) will be used to store a Horcrux.


[![](https://mermaid.ink/img/pako:eNqdV1tv4jgU_itRRiMxWkC5X_pWoJVWqnYfyu5LmQcndsDCJKzjTMu2_e_j3IjtkMCMI6HE5zu3z8fH5l2PM4j0O31LwXGnrVebVOMjL6J64lhEBMczgkCS16J__ly9lJ_GLGcZRXBWYPhdm81m2kc5bX40OvdneCe0WuGiFqIU1i-NSoe0P7QcxRSxexGw6ABOC2hMKXHXMjHuxpw2m8-0-_7UQpxaVFPL_hSnR4m8nRjxXDsockRTcECTl_bt-7daXps-Zq_m5IX_ttOVixuTW7UmLMnEUvL8xxHk-WtGYRfCeUpxWj76VD8gegAY8vJ4L8Ubne3QAW30O_4KUQIKwjb6VBD9CygGEUF5iXlvgtcjEO-3NCu47Ur1dYcZahRL-ZHiA6CnZUYyWiO-PCwflo-PAobnnKVQQSV8QNESQ5RhGbTLySQwppppGF-nWujNLd9xjTAw7PDrt34QC04Gooq-5XADXqkfDOqfA7xowTsbsOeuFTqm6XuOLxloY7-oH1wPoElgjd6YyJFpm7ZhXApURRp8WOaFiBQg3UaTcO4azTA5q4NfYoAEp0j0Z1dD8icHJEt5JaaL_Xa8QDpArzaiilezEYe2b6wWPbHViAEfkndAafa6QwCOZpBkKXsEB0xONWKz4VlRFBXxDjHtkJffU-0HohCkYKqVu4Uo6s_4_2aHmd7xTaQPRIgslK30BQXlI8BS3s9HaKrEVapDRMSkyPnKjzDZIkQzPcKa_vCE0_34omNG0PCqI7hFT7dlDmJ-IIlBVVvXDeee5ZleYFmOPdX4p-97ru3ZphWU-8mfh4YZeoYfOLa0n2pzw0xWcmVrRIRHqWKe5LrfUnQS6xZvU0CGCajl69GtUZdG9sajHW2iZ9zFJvfbTFVmrzBBsux4BZJmDPUi6xdWBZMT5QXqAqhgri8N_gEYztK-T8_zLiMVt075SD3ovwKlMfqrOESSRfXE482qb4_3VTAxDas8q_iP5bpTzZg7oVSUhD1f0r3iwOqIcqTDgIF838_ftZ0kilWYnHwAQgNCBVNy_oS3OzYSWou7AbICdD-yhC3s74LlGKIbkEt-idyXFxT53LNNz1YXHK1vo0YAywRFSewniYDcUiyeHqTkSWkGMEsvmBpFqhEquJhi1s8iSQI-VJhcjUha3AyCk9LIZETVBEaWAPEDlCoUua7FhwpSe10PFRN-ay1RQ1ecBBOyPh2RMdQIW4A5dMS1AKvrj7bhXL9Ftnp2p2dand7g5a_VcwQ937vdn9vpzX7BnSfcMG935gtBBsGgt1Ltc5N-8j8SxREChh4g5sehfpcAkqOpDgqWPZ_SWL9jtEAtaIUB_5dzaFCfPwFeVEsm)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV1tv4jgU_itRRiMxWkC5X_pWoJVWqnYfyu5LmQcndsDCJKzjTMu2_e_j3IjtkMCMI6HE5zu3z8fH5l2PM4j0O31LwXGnrVebVOMjL6J64lhEBMczgkCS16J__ly9lJ_GLGcZRXBWYPhdm81m2kc5bX40OvdneCe0WuGiFqIU1i-NSoe0P7QcxRSxexGw6ABOC2hMKXHXMjHuxpw2m8-0-_7UQpxaVFPL_hSnR4m8nRjxXDsockRTcECTl_bt-7daXps-Zq_m5IX_ttOVixuTW7UmLMnEUvL8xxHk-WtGYRfCeUpxWj76VD8gegAY8vJ4L8Ubne3QAW30O_4KUQIKwjb6VBD9CygGEUF5iXlvgtcjEO-3NCu47Ur1dYcZahRL-ZHiA6CnZUYyWiO-PCwflo-PAobnnKVQQSV8QNESQ5RhGbTLySQwppppGF-nWujNLd9xjTAw7PDrt34QC04Gooq-5XADXqkfDOqfA7xowTsbsOeuFTqm6XuOLxloY7-oH1wPoElgjd6YyJFpm7ZhXApURRp8WOaFiBQg3UaTcO4azTA5q4NfYoAEp0j0Z1dD8icHJEt5JaaL_Xa8QDpArzaiilezEYe2b6wWPbHViAEfkndAafa6QwCOZpBkKXsEB0xONWKz4VlRFBXxDjHtkJffU-0HohCkYKqVu4Uo6s_4_2aHmd7xTaQPRIgslK30BQXlI8BS3s9HaKrEVapDRMSkyPnKjzDZIkQzPcKa_vCE0_34omNG0PCqI7hFT7dlDmJ-IIlBVVvXDeee5ZleYFmOPdX4p-97ru3ZphWU-8mfh4YZeoYfOLa0n2pzw0xWcmVrRIRHqWKe5LrfUnQS6xZvU0CGCajl69GtUZdG9sajHW2iZ9zFJvfbTFVmrzBBsux4BZJmDPUi6xdWBZMT5QXqAqhgri8N_gEYztK-T8_zLiMVt075SD3ovwKlMfqrOESSRfXE482qb4_3VTAxDas8q_iP5bpTzZg7oVSUhD1f0r3iwOqIcqTDgIF838_ftZ0kilWYnHwAQgNCBVNy_oS3OzYSWou7AbICdD-yhC3s74LlGKIbkEt-idyXFxT53LNNz1YXHK1vo0YAywRFSewniYDcUiyeHqTkSWkGMEsvmBpFqhEquJhi1s8iSQI-VJhcjUha3AyCk9LIZETVBEaWAPEDlCoUua7FhwpSe10PFRN-ay1RQ1ecBBOyPh2RMdQIW4A5dMS1AKvrj7bhXL9Ftnp2p2dand7g5a_VcwQ937vdn9vpzX7BnSfcMG935gtBBsGgt1Ltc5N-8j8SxREChh4g5sehfpcAkqOpDgqWPZ_SWL9jtEAtaIUB_5dzaFCfPwFeVEsm)

This how identity is used to prepare Horcruxes of our Identity.


[![](https://mermaid.ink/img/pako:eNqdl3mL4zYUwL-K8bKQ6Xoyvu0EttA5lkKHbiFD-8dmWWRbTkR8pLI8M-kw371PPmJZjp20CiSx3-8denq63tQwj7C6VAuGGL4naENRev1srjMF2refvivX1z8rq9XqJlOWymqLUkKVFQ4pZvyJ4ptsndVwZUHZ5jSk5eusqBitKIqb7Ep5U6RWq_BW2-ZeUvKKaSeoLXSSZfMipnmqoJJtZ1cdXBEV2wQANmvpe_3TveZQwXKK28CzHOKmZLNlSh7XIugr_0Ub_G1fBr_hw3fls1KSjJmOOzuaulpLna-iKgtMM5RibY-K4iWn0WT32xS3WuCZRDhjhB2Olq6UzwCQaKjVuhC1OregtRe1jj64ast34qOx0-L2TSVGP4otgoL49ZcZBPYJ3FTu6iHqdCqsUoCIa7xG6uDKICHhcZjETPZycFECyQ-OCoLmRS374-tfIxIIUJQA2AmWiqHrelooEGv-At8OfxLxQfe45U8At2N2cxyB97paVE1NMU0RiWDWvXHRWmVbnOK1uoS_EY5RmbC1qgmiPxElKEhwwZm32txaDVC429C8zKJa9WVLGG4UuXxPSYro4S5PcloTHx7uHu6-fBEYGI08iyQqhhaJlhimjPShbZHMfF3jCfqoKQt3bnq2oy983Vp8vBoGcQt1hamkb9pgwOX6_qj-McCTFtyjAWvumAvbMDzX9noG2thP6vvnA2g68IRfmZgjwzIsXT8VqExCBemmcSIiCaSbYLaYO3rTDMjq6JMYYEIyLPqzqtbz1w-oL4VKzG53m-kC6YBBbQRVXo1GvLA8_f52IDYbMYLW844ozV-2GEWTPYjzjH2BrSc51MR6Db2iOCjDLWwIMCPhWVOeMY1QhjSFz5ZEUl-Rf5oZZrj7VzF9KMDJrTSVPmCffwQsg21yIk2VuOrqWCLCpCxg5Ccy2RKimUHCmvXhkWS76UEnLMHjo46jDX68rOcohJ1QDKqaus5i7pqu4fqmaVuaAo-e5zqWaxmmz-eTN1_oxsLVPd-2evOpNjeeyUouTY0ggShl5rFf9xuKD2Ldkk2GkvEE1PKnyalRl0b-CtFOLqJH7uQi978zVZk9k4kkz_dnEH68GUQ2LKwK63cUCtRBkcScHxryjBjJs6FP13VPk5Jbm396a9DfJc5C_HuZBj2L8o4Hi9XQHqyraGboJt-r4Mt0HE3R5_aiV5QJW53SPePA7BJl9zYDhordsP-OZcdBKGP9zvtooUeRxPCcP_ID6kRoLXcBco_obmIIW-xryQo4h11A3sExbscPKP19zzJcSx5w_HRZagS4n6AgDr04FsgNJeLukfA8SYtBlGcnTE2ScoQSF1LChr2IYx-ajPWrEfcGN4_QQVrI-kS1CEwMAYYNlEopchwTmgzJa92AChO4AHBq7IgTkyR5OuyxPrYQtoAxtsW1gNmtj5Zunz9FtnpWp2eYnd7o4a_VswU9z73cn9PpXf8Hd65wwrzcmScE6fuj3rga3CXe4SJR7iO4LD1EBLZDdRmjpMCaCpfQfHXIQnXJaIlbqLnaN9T7v152pdU)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdl3mL4zYUwL-K8bKQ6Xoyvu0EttA5lkKHbiFD-8dmWWRbTkR8pLI8M-kw371PPmJZjp20CiSx3-8denq63tQwj7C6VAuGGL4naENRev1srjMF2refvivX1z8rq9XqJlOWymqLUkKVFQ4pZvyJ4ptsndVwZUHZ5jSk5eusqBitKIqb7Ep5U6RWq_BW2-ZeUvKKaSeoLXSSZfMipnmqoJJtZ1cdXBEV2wQANmvpe_3TveZQwXKK28CzHOKmZLNlSh7XIugr_0Ub_G1fBr_hw3fls1KSjJmOOzuaulpLna-iKgtMM5RibY-K4iWn0WT32xS3WuCZRDhjhB2Olq6UzwCQaKjVuhC1OregtRe1jj64ast34qOx0-L2TSVGP4otgoL49ZcZBPYJ3FTu6iHqdCqsUoCIa7xG6uDKICHhcZjETPZycFECyQ-OCoLmRS374-tfIxIIUJQA2AmWiqHrelooEGv-At8OfxLxQfe45U8At2N2cxyB97paVE1NMU0RiWDWvXHRWmVbnOK1uoS_EY5RmbC1qgmiPxElKEhwwZm32txaDVC429C8zKJa9WVLGG4UuXxPSYro4S5PcloTHx7uHu6-fBEYGI08iyQqhhaJlhimjPShbZHMfF3jCfqoKQt3bnq2oy983Vp8vBoGcQt1hamkb9pgwOX6_qj-McCTFtyjAWvumAvbMDzX9noG2thP6vvnA2g68IRfmZgjwzIsXT8VqExCBemmcSIiCaSbYLaYO3rTDMjq6JMYYEIyLPqzqtbz1w-oL4VKzG53m-kC6YBBbQRVXo1GvLA8_f52IDYbMYLW844ozV-2GEWTPYjzjH2BrSc51MR6Db2iOCjDLWwIMCPhWVOeMY1QhjSFz5ZEUl-Rf5oZZrj7VzF9KMDJrTSVPmCffwQsg21yIk2VuOrqWCLCpCxg5Ccy2RKimUHCmvXhkWS76UEnLMHjo46jDX68rOcohJ1QDKqaus5i7pqu4fqmaVuaAo-e5zqWaxmmz-eTN1_oxsLVPd-2evOpNjeeyUouTY0ggShl5rFf9xuKD2Ldkk2GkvEE1PKnyalRl0b-CtFOLqJH7uQi978zVZk9k4kkz_dnEH68GUQ2LKwK63cUCtRBkcScHxryjBjJs6FP13VPk5Jbm396a9DfJc5C_HuZBj2L8o4Hi9XQHqyraGboJt-r4Mt0HE3R5_aiV5QJW53SPePA7BJl9zYDhordsP-OZcdBKGP9zvtooUeRxPCcP_ID6kRoLXcBco_obmIIW-xryQo4h11A3sExbscPKP19zzJcSx5w_HRZagS4n6AgDr04FsgNJeLukfA8SYtBlGcnTE2ScoQSF1LChr2IYx-ajPWrEfcGN4_QQVrI-kS1CEwMAYYNlEopchwTmgzJa92AChO4AHBq7IgTkyR5OuyxPrYQtoAxtsW1gNmtj5Zunz9FtnpWp2eYnd7o4a_VswU9z73cn9PpXf8Hd65wwrzcmScE6fuj3rga3CXe4SJR7iO4LD1EBLZDdRmjpMCaCpfQfHXIQnXJaIlbqLnaN9T7v152pdU)

## Horcrux
We propose the usage of Shamir Shared Secret (SSS) to protect your Mnemonic without the problem of single point of security. We decide to use as source of SSS the entropy that produce the Mnemonic. Shamir split entropy in **3 separate pieces** (called Horcruxes). Your need at least two pieces to reconstitute deterministicaly the same Mnemonic. We recomend you keep them in separate places/locations:

* Use printed paper.
* And use our Horcrux SmartContract. 👇
[![](https://mermaid.ink/img/pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)