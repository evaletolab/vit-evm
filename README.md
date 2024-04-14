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
A simple and deterministic API to create and use a unique serverless (pseudo) identities to protect our Wallet. 
[![](https://mermaid.ink/img/pako:eNqdV1tv4jgU_itRRiMxWkC5X_pWoJVWqnYfyu5LmQcndsDCJKzjTMu2_e_j3IjtkMCMI6HE5zu3z8fH5l2PM4j0O31LwXGnrVebVOMjL6J64lhEBMczgkCS16J__ly9lJ_GLGcZRXBWYPhdm81m2kc5bX40OvdneCe0WuGiFqIU1i-NSoe0P7QcxRSxexGw6ABOC2hMKXHXMjHuxpw2m8-0-_7UQpxaVFPL_hSnR4m8nRjxXDsockRTcECTl_bt-7daXps-Zq_m5IX_ttOVixuTW7UmLMnEUvL8xxHk-WtGYRfCeUpxWj76VD8gegAY8vJ4L8Ubne3QAW30O_4KUQIKwjb6VBD9CygGEUF5iXlvgtcjEO-3NCu47Ur1dYcZahRL-ZHiA6CnZUYyWiO-PCwflo-PAobnnKVQQSV8QNESQ5RhGbTLySQwppppGF-nWujNLd9xjTAw7PDrt34QC04Gooq-5XADXqkfDOqfA7xowTsbsOeuFTqm6XuOLxloY7-oH1wPoElgjd6YyJFpm7ZhXApURRp8WOaFiBQg3UaTcO4azTA5q4NfYoAEp0j0Z1dD8icHJEt5JaaL_Xa8QDpArzaiilezEYe2b6wWPbHViAEfkndAafa6QwCOZpBkKXsEB0xONWKz4VlRFBXxDjHtkJffU-0HohCkYKqVu4Uo6s_4_2aHmd7xTaQPRIgslK30BQXlI8BS3s9HaKrEVapDRMSkyPnKjzDZIkQzPcKa_vCE0_34omNG0PCqI7hFT7dlDmJ-IIlBVVvXDeee5ZleYFmOPdX4p-97ru3ZphWU-8mfh4YZeoYfOLa0n2pzw0xWcmVrRIRHqWKe5LrfUnQS6xZvU0CGCajl69GtUZdG9sajHW2iZ9zFJvfbTFVmrzBBsux4BZJmDPUi6xdWBZMT5QXqAqhgri8N_gEYztK-T8_zLiMVt075SD3ovwKlMfqrOESSRfXE482qb4_3VTAxDas8q_iP5bpTzZg7oVSUhD1f0r3iwOqIcqTDgIF838_ftZ0kilWYnHwAQgNCBVNy_oS3OzYSWou7AbICdD-yhC3s74LlGKIbkEt-idyXFxT53LNNz1YXHK1vo0YAywRFSewniYDcUiyeHqTkSWkGMEsvmBpFqhEquJhi1s8iSQI-VJhcjUha3AyCk9LIZETVBEaWAPEDlCoUua7FhwpSe10PFRN-ay1RQ1ecBBOyPh2RMdQIW4A5dMS1AKvrj7bhXL9Ftnp2p2dand7g5a_VcwQ937vdn9vpzX7BnSfcMG935gtBBsGgt1Ltc5N-8j8SxREChh4g5sehfpcAkqOpDgqWPZ_SWL9jtEAtaIUB_5dzaFCfPwFeVEsm)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV1tv4jgU_itRRiMxWkC5X_pWoJVWqnYfyu5LmQcndsDCJKzjTMu2_e_j3IjtkMCMI6HE5zu3z8fH5l2PM4j0O31LwXGnrVebVOMjL6J64lhEBMczgkCS16J__ly9lJ_GLGcZRXBWYPhdm81m2kc5bX40OvdneCe0WuGiFqIU1i-NSoe0P7QcxRSxexGw6ABOC2hMKXHXMjHuxpw2m8-0-_7UQpxaVFPL_hSnR4m8nRjxXDsockRTcECTl_bt-7daXps-Zq_m5IX_ttOVixuTW7UmLMnEUvL8xxHk-WtGYRfCeUpxWj76VD8gegAY8vJ4L8Ubne3QAW30O_4KUQIKwjb6VBD9CygGEUF5iXlvgtcjEO-3NCu47Ur1dYcZahRL-ZHiA6CnZUYyWiO-PCwflo-PAobnnKVQQSV8QNESQ5RhGbTLySQwppppGF-nWujNLd9xjTAw7PDrt34QC04Gooq-5XADXqkfDOqfA7xowTsbsOeuFTqm6XuOLxloY7-oH1wPoElgjd6YyJFpm7ZhXApURRp8WOaFiBQg3UaTcO4azTA5q4NfYoAEp0j0Z1dD8icHJEt5JaaL_Xa8QDpArzaiilezEYe2b6wWPbHViAEfkndAafa6QwCOZpBkKXsEB0xONWKz4VlRFBXxDjHtkJffU-0HohCkYKqVu4Uo6s_4_2aHmd7xTaQPRIgslK30BQXlI8BS3s9HaKrEVapDRMSkyPnKjzDZIkQzPcKa_vCE0_34omNG0PCqI7hFT7dlDmJ-IIlBVVvXDeee5ZleYFmOPdX4p-97ru3ZphWU-8mfh4YZeoYfOLa0n2pzw0xWcmVrRIRHqWKe5LrfUnQS6xZvU0CGCajl69GtUZdG9sajHW2iZ9zFJvfbTFVmrzBBsux4BZJmDPUi6xdWBZMT5QXqAqhgri8N_gEYztK-T8_zLiMVt075SD3ovwKlMfqrOESSRfXE482qb4_3VTAxDas8q_iP5bpTzZg7oVSUhD1f0r3iwOqIcqTDgIF838_ftZ0kilWYnHwAQgNCBVNy_oS3OzYSWou7AbICdD-yhC3s74LlGKIbkEt-idyXFxT53LNNz1YXHK1vo0YAywRFSewniYDcUiyeHqTkSWkGMEsvmBpFqhEquJhi1s8iSQI-VJhcjUha3AyCk9LIZETVBEaWAPEDlCoUua7FhwpSe10PFRN-ay1RQ1ecBBOyPh2RMdQIW4A5dMS1AKvrj7bhXL9Ftnp2p2dand7g5a_VcwQ937vdn9vpzX7BnSfcMG935gtBBsGgt1Ltc5N-8j8SxREChh4g5sehfpcAkqOpDgqWPZ_SWL9jtEAtaIUB_5dzaFCfPwFeVEsm)
This identity is then used to handle Horcruxes of our Wallet.
[,,,] more todo.

[![](https://mermaid.ink/img/pako:eNqdWGtv4kYU_SuWVyuRrkP9xkbalZrHqlKjbiWi9sOyigZ7DCOMTcfjJDTKf-8dD4aZMTa0gwSx7zn3Pa-8mUmZYnNqVgwxfEfQkqLN9bM7LwwY33_6YVxffzEqnFDMpgaq2WpUV5gWaIOtLaqql5KmV8bnL8bbtl7kJLEE9F3lz2aznwtjasxWaEOoMWsw_IliARQADt2QV0zFS6Fq4K0wOTWqFRqJ140r4rVAN8QGvCppQutXMCMkAiXCY2XryBElCYSoKBk2KFmumFFmQgQh8V-0xN9B3W9498P4bNSkYG4Qjg6qrriGvfM8y71pfDO0IUhyJlsWWCYpLhhhu4OmJviapF1Wa0JmKdXbyqyDDU5t8UfxQdlpcfumEaMnqA3U_ddfRuDYJzDTmBPFOnIaWEMAjwW8p57vaiZP5OCCJJKnQ4iS309q3E9_fPtrQAoOy1IAHwVTI7Bte1MZ4Hv5At9O8yjjO_G26j8BQy3ku2gf0zI3mG4QSWG2vnHR3GQrvMFzcwp_pjhDdc7mpiWJ_kSUoEWOK455E-rm5gIl6yUt6yIV1JcVYXhP5PItJRtEd7dlXlKB-HB_e3_79auEgfKURaqhMhiprIlhyogKWlX5KLItnpKPlhGHY3fiB3Yc2V788arrxA00GqYa3_VBQcj5US__4OBJDeFBgTcO3Nh3nEnoTxQFre8n-dF5B_YBPOJXJufI8RzPtk85qiOhZ2zXOeGRBqTLxSge845rhgNZ7X2SHcxJgWV7XjMUe6pDqhQ6sbhZL4cb5Ajo9MaiyauzF8fexL676YjdvRjBUKwjSsuXFUbpYARZWbCvsOXkO4GYzyEqihd1soItBGYkPFvGM6YpKpBl8NmSa_QZ-Wc_w5xw-yqnDy1wfqNNpQ844h8JVsD2OpCmRtyE2peIJK8rqPxAJluErKaTsP368ECK9XDRCctxf9VxusQPl0WOEtgaZaeaqRvE49ANnTByXd-zDHicTMLACz3Hjfh8moxj24lDexL5njKfhLr-TDZybWoscvBSxzyofb-keCf3LVkWKO9PgJA_Dk4N0RrlK3g7uIgecCcXuf-dqUbtmUzkZbk9A-HnnY5n3cZqYGqg0KABSjXM-dKQZ8RIWXRthmF4GqmZ9flHWYP-rnGR4N_rzULRqO94sFh19cG6ikaO7fK9Cr7cILAMe-zHSlPmbHaKe8aAe0yUr2wGDFXrbvyB52eLRIepwUcottNUw_CcP_AT64BrLe4CyB2i64EStrBvNavgYHYB8hbOdWt-QFH3Pc8JPb3g-PGy1EhgNUGLLJlkmYRcUiLvHjnPk7YYpGVxQtUgUvdQwyWUsG4UWRbB0GFqN2KluGWKdtpCpiKaRWCgBBg2UKqlKAhcGDpIX-s6qCSHGwFH9R1xMpLnj7sttvsWwhbg9G1xLcA9ro-e7Z8_RbY878hz3COv9_DX8nyJNwkvtxccedf_wVwonTAvNzaRnIyiXmucBneJd7hI1NsUbk_3KYHt0JxmKK-wZcKttJztisScMlrjFrT_l8Ae9f4vR_G-lQ)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdWGtv4kYU_SuWVyuRrkP9xkbalZrHqlKjbiWi9sOyigZ7DCOMTcfjJDTKf-8dD4aZMTa0gwSx7zn3Pa-8mUmZYnNqVgwxfEfQkqLN9bM7LwwY33_6YVxffzEqnFDMpgaq2WpUV5gWaIOtLaqql5KmV8bnL8bbtl7kJLEE9F3lz2aznwtjasxWaEOoMWsw_IliARQADt2QV0zFS6Fq4K0wOTWqFRqJ140r4rVAN8QGvCppQutXMCMkAiXCY2XryBElCYSoKBk2KFmumFFmQgQh8V-0xN9B3W9498P4bNSkYG4Qjg6qrriGvfM8y71pfDO0IUhyJlsWWCYpLhhhu4OmJviapF1Wa0JmKdXbyqyDDU5t8UfxQdlpcfumEaMnqA3U_ddfRuDYJzDTmBPFOnIaWEMAjwW8p57vaiZP5OCCJJKnQ4iS309q3E9_fPtrQAoOy1IAHwVTI7Bte1MZ4Hv5At9O8yjjO_G26j8BQy3ku2gf0zI3mG4QSWG2vnHR3GQrvMFzcwp_pjhDdc7mpiWJ_kSUoEWOK455E-rm5gIl6yUt6yIV1JcVYXhP5PItJRtEd7dlXlKB-HB_e3_79auEgfKURaqhMhiprIlhyogKWlX5KLItnpKPlhGHY3fiB3Yc2V788arrxA00GqYa3_VBQcj5US__4OBJDeFBgTcO3Nh3nEnoTxQFre8n-dF5B_YBPOJXJufI8RzPtk85qiOhZ2zXOeGRBqTLxSge845rhgNZ7X2SHcxJgWV7XjMUe6pDqhQ6sbhZL4cb5Ajo9MaiyauzF8fexL676YjdvRjBUKwjSsuXFUbpYARZWbCvsOXkO4GYzyEqihd1soItBGYkPFvGM6YpKpBl8NmSa_QZ-Wc_w5xw-yqnDy1wfqNNpQ844h8JVsD2OpCmRtyE2peIJK8rqPxAJluErKaTsP368ECK9XDRCctxf9VxusQPl0WOEtgaZaeaqRvE49ANnTByXd-zDHicTMLACz3Hjfh8moxj24lDexL5njKfhLr-TDZybWoscvBSxzyofb-keCf3LVkWKO9PgJA_Dk4N0RrlK3g7uIgecCcXuf-dqUbtmUzkZbk9A-HnnY5n3cZqYGqg0KABSjXM-dKQZ8RIWXRthmF4GqmZ9flHWYP-rnGR4N_rzULRqO94sFh19cG6ikaO7fK9Cr7cILAMe-zHSlPmbHaKe8aAe0yUr2wGDFXrbvyB52eLRIepwUcottNUw_CcP_AT64BrLe4CyB2i64EStrBvNavgYHYB8hbOdWt-QFH3Pc8JPb3g-PGy1EhgNUGLLJlkmYRcUiLvHjnPk7YYpGVxQtUgUvdQwyWUsG4UWRbB0GFqN2KluGWKdtpCpiKaRWCgBBg2UKqlKAhcGDpIX-s6qCSHGwFH9R1xMpLnj7sttvsWwhbg9G1xLcA9ro-e7Z8_RbY878hz3COv9_DX8nyJNwkvtxccedf_wVwonTAvNzaRnIyiXmucBneJd7hI1NsUbk_3KYHt0JxmKK-wZcKttJztisScMlrjFrT_l8Ae9f4vR_G-lQ)

## Horcrux
We propose the usage of Shamir Shared Secret (SSS) to protect your Mnemonic without the problem of single point of security. We decide to use as source of SSS the entropy that produce the Mnemonic. Shamir split entropy in **3 separate pieces** (called Horcruxes). Your need at least two pieces to reconstitute deterministicaly the same Mnemonic. We recomend you keep them in separate places/locations:

* Use printed paper.
* And use our Horcrux SmartContract. 👇
[![](https://mermaid.ink/img/pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV-mO2zYQfhVBQQBv61V1SzaQBboXFsii-bFGESAOCkoa2ax1OBS1u84iL5VH6JN1dNkSZcluacAQNd9cH4dD6k320wDkuZxxwuGWkhUj8eWzvkyWiYRjnTKf5a-_JdLl5ZX0UM0UnwGiJ4qiXEhzactSDj6HQMrWhAFi01B6WpOYssrINvci6n-E3YiRjKeMrEDaIKpxXsZ0FP8mCaNSKMaXX76WbgqD8AXNfZ1LzyTK4QiGwbecMpjXXhtx_bqG_I25tQKM84xLHkgQb_mQ0sF3C9B6WWDuFg-flcXn2nIt-CDlNOG6ZU_KkC8O2g28UC3CryQ_CqqqRxpAwinfTbYky15SFlx02H4GRsNdyZ6AzzNgCYnhBL67GC3x2GLQ4K8mnNI6zrFGOvLG_ZAc5y1OsZQ-lkv69PD7JKfBr_ts__kpfbg6lJrIe62452-OC0aCRliRfyXF9BXLeF_0NcnyVI6BxYQGuFHeipdLma8hhqU8x8cAQpJHfClPW6I_CaPEiyArMG-VoaXsEX-zYmmeBJXqy5pyqBUL-ZbRmLDdTRqlrEK8u7u5u7m_b2Ey8NMkEFAhjqBtiQPjtAtaZ9HEVaeSpqrvp9LMVnTHtNSZqxqz9xf9IK6RVWCCvm6iAbvQdwf19wEetWDvDRiKpc9MTXNs0-kYaGI_qu-eDqBOYAGvvM2RZmiGqh4LVESqOHTtSEQCkK28yUyx1HpoyOrgrB1gRBNo-zPK0fHXDagrxUpMrjer8QI5AHq14ZW8arV4Zjjq7XVPrNdigqPjnTCWvqxx84xmEKYJv8cjINpViOUSs2Lg5f4auBRnxXwqYRsJSEKmUrFbIkH9iX6vd5hmb1_b9BEPomthK70Dt_i1YAmebCM0leIy1SEi_Ah7PbARJhtE20yPsLo_PNJkM77olEcwvOoQrODxvMyJj22tHVS5da2ZYuu2Zru6bhpTCaeOY1uGbWi6W-wnR5mp2sxWHdc0OvupMjfMZCkXtoYXYZQi5rFb9yuGfbpVt3SVkGiYgEq-GN0aVWmkrxjtaBPd4442uf_NVGn2BBNRmm5PQBK8UPUi6xdWCesmigVqkUDAnF4a-kw4TZO-T9u2jyMFt2bx6_SgbzkkPvyRx17HonjiYbPq28O-SiaaqhdnFf7pljWVVMWcdYoy4k_HdE840A9EmZ3DgJNs08_fMszQ80VYN3mXzNQgEDAF5490teYjoTW4MyC3hG1GlrCBfcp5hhe7M5A3eE3aFBeU7rlnaLYhLjgszqOmBe4S5IW-E4Yt5IrR9ukRFTwJzSBIkyOmRpFihALOZ5T3swhDF4cI61YjdBY3DchOaGRdRNkERpYA8ABlAkWWpeMQQWKv66H8CK-_BWroihPSKFrstqAONcIGoA0dcQ1AP_RHQzVP3yIbPeOgp-kHvcHLX6NntvQc-3x_1kHv8j-4s1s3zPOdOa0gXXfQW6GGn2rFh0S-DfA76i6geBzK85BEGUxlkvP0aZf48pyzHBpQ_TVeo378C6WSmNU)