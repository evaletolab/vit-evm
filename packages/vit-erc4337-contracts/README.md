# ViT Isn't Twint


🚀 **ViT Isn't Twint** is a decentralized payment processing system built on Ethereum, offering secure, upgradable, and flexible smart contracts for handling transactions, authorizations, captures, cancellations, and refunds using whitelisted ERC-20 tokens.

# Objective for Human been
Simply send and receive money without KYC or excessive fees, a simple wallet for day-to-day spending. 


# Objective for Business
Create a robust and secure payment gateway API that **mimics** traditional payment systems but on the blockchain, allowing for authorizations, captures, and refunds (with upgradable contracts for future enhancements). This API can be simply ported to any E-commerce.


- 🛒 **E-commerce Payments**: Facilitate secure and efficient payments for online purchases using ERC-20 token xCHF.
- 🔄 **Authorization and Capture**: Support separate authorization and capture phases, similar to credit card processing systems like Stripe.
- 💸 **Refunds and Cancellations**: Enable merchants to process partial or full refunds and cancellations of transactions.
- ⏳ **Holding Periods**: Implement holding periods before fund release to handle disputes or chargebacks.
- 📈 **Scalability**: Allow for bulk operations such as bulk withdrawals to optimize gas costs for high-volume merchants.

## Specifications

### **Payment Contract (`Vit.Payment.sol`)**

- **Functions**:
  - **authorize**: Initiate a payment authorization.
    - **Signature**: `authorize(orderId, cartId, amount, tokenAddress, payer)`
    - **Default Values**:
      - `authExpiration`: 7 days
  - **capture**: Capture an authorized payment.
    - **Signature**: `capture(orderId)`
    - **Default Values**:
      - `holdingPeriod`: 3 days
    - 🔒 **Access Control**: Only executable by an address with `PAYMENT_EXECUTOR_ROLE`.
  - **cancel**: Cancel an authorization before it expires.
    - **Signature**: `cancel(orderId)`
  - **refund**: Process a partial or full refund.
    - **Signature**: `refund(orderId, amount)`
    - **Default Values**:
      - `refundWindow`: 21 days
    - 💰 **Partial Refunds**: If `amount` is `0`, the entire available amount is refunded.
- **Features**:
  - **Upgradability**: Implements the UUPS upgradeable pattern for contract upgrades.
  - **Token Whitelisting**: Only accepts ERC-20 tokens that are whitelisted.
  - **Role-Based Permissions**:
    - **PAYMENT_EXECUTOR_ROLE**: Assigned to an address authorized to execute captures, cancellations, and refunds. This allows delegation of transaction management placed in escrow by clients.
    - **onlyOwner**: Functions restricted to the contract owner (e.g., setting parameters, whitelisting tokens).

### **Escrow Contract (`Vit.Payment.Escrow.sol`)**

- **Functions**:
  - **deposit**: Securely holds tokens during authorization.
    - **Signature**: `deposit(orderId, amount, tokenAddress, payer)`
  - **setReleaseTime**: Sets the holding period and payee after capture.
    - **Signature**: `setReleaseTime(orderId, payee, releaseTime)`
  - **withdraw**: Allows sellers to withdraw funds after the holding period.
    - **Signature**: `withdraw(orderId)`
  - **bulkWithdraw**: Sellers can withdraw multiple orders' funds in one transaction.
    - **Signature**: `bulkWithdraw()`
  - **refund**: Processes refunds to the payer.
    - **Signature**: `refund(orderId, amount)`
    - 💰 **Partial Refunds**: If `amount` is `0`, the entire available amount is refunded.
- **Security Measures**:
  - **Safe Token Transfers**: Uses `SafeERC20` for secure token operations.
  - **Reentrancy Protection**: Implements reentrancy guards to prevent attacks.

## Key Features

- **Holding Period**:
  - Introduces a delay between capture and fund release, during which refunds can be processed.
  - Configurable via `holdingPeriod` (Default: 3 days).
- **Partial Refunds**:
  - Allows refunding any amount up to the available balance.
- **Bulk Withdrawal**:
  - Sellers can withdraw multiple orders' funds in a single transaction, reducing gas costs.
- **Event Emissions**:
  - Emits detailed events for transparency and tracking:
    - `Authorized`, `Captured`, `Canceled`, `Refunded`, `Withdrawn`, `BulkWithdrawn`.

## Usage

- **Initialization**:
  - Contracts are initialized with customizable parameters for authorization expiration, refund window, and holding period.
    - **Default Values**:
      - `authExpiration`: 7 days
      - `refundWindow`: 21 days
      - `holdingPeriod`: 3 days
  - Owner and executor addresses are set during deployment.
- **Roles and Permissions**:
  - `PAYMENT_EXECUTOR_ROLE`: Assigned to an address authorized to execute captures, cancellations, and refunds. This allows delegation of transaction management placed in escrow by clients.
  - `onlyOwner`: Functions restricted to the contract owner (e.g., setting parameters, whitelisting tokens).
- **Interacting with Contracts**:
  - **Clients**:
    - Authorize payments by calling `authorize`.
  - **Payment Executor**:
    - Capture payments using `capture`.
    - Process refunds using `refund`.
    - Cancel authorizations using `cancel`.
  - **Sellers**:
    - Withdraw funds after the holding period via `withdraw` or `bulkWithdraw`.

---

## 4337 
* [ERC-4337 - Safe Module](https://chatgpt.com/share/6745a8a4-c718-8010-bacd-a287af4c67b5)
* [ERC-4337 - custom guardian](https://chatgpt.com/c/672b9681-9748-8010-babb-a9f3c6137c41)
* [ERC-4337 - escrow transaction](https://chatgpt.com/share/6735bdcc-acc4-8010-a635-66a7bdf2f65a)
* [ERC-4337 - permissionless.js](https://chatgpt.com/c/6735bf4f-667c-8010-b7e6-13034443dfd0)
* [ERC-4337 - discussions](https://chatgpt.com/c/8a462eda-72a2-406f-be7a-31f2fb5aac85)
* [E-commerce payment API](https://chatgpt.com/share/66e835d0-d7fc-8010-8e45-438276d5b527)


* **Secret-Leafs (A/B)** are generated client-side with the preimage of a pseudo, password, and POW. 
* ~~The POW element is the [puzzle](https://en.wikipedia.org/wiki/Proof_of_work#List_of_proof-of-work_functions) result of user sha256(username, password). It's a simple way to protect against DoS attacks.~~
* The POW element is a PBKDF2 of username and password, it's a simple way to protect against DoS attacks.
* Users can also choose to store the pseudo/password form fields on a third-party service.
* **Public-Leafs (A/B)** are derivated images of **Secret-Leafs (A/B)**, These values can be used for specific **online** features, such as storing a Horcrux in a public blockchain.
* **Public-Leaf0** is the result of sha256(leaf1, leaf2). This publicKey (leaf0) will be used as address to store a Horcrux.


[![](https://mermaid.ink/img/pako:eNqdl1tv4ygUgP-K5dFIHW0S-X7pW5O00mqr3ZXanZfJPGCDExRiZzGeNtP0vy_40gCOncxiKbI537lwgAN5M9MCIvPWXFOw3xjPy1Vu8FZWSdOxrxKC0ylBICsb0T-_L7-JT2tasoIiOK0w_G5Mp1PjKLrtY6tz94GfhE4nnDdClMPmpVU5ke7RKFFKEbuTgfkJ8DqgNaXF3cjkuFtzxnQ2Ne76XXO5a153LfpdPD1a5F3HiOfGwbHcgKNRlYjmYIduvom3718aojF-_Hv-x_JB5Kh4sRvgN_7aQbXLKwe77Bl0OoOgLGWrizPB1dBLQaGko0UhHnNi7hDdAQz5-nkT4pXJNmiHVuYtf4UoAxVhK3Miib4CikFCUCmYt3Y0ZgLS7ZoWFbddq75sMEOtopDvKd4BelgUpKAN8el-cb94eJAYnoQihxqV8QZlSwxRhlVoU5KbyJoYtmV9nhhxMHNCz7fiyHLjz1_6Qcx5XhDV9B2PGwiEfjSo_xHgWQvBhwF35juxZ9th4IWKgS72s_rR5QDaATyjVybnyHZt17LOBaqTFm-OfSYiDaTr5Cae-VbbbJ7VwS85QIJzJPtz66b4UwNSpXwl5vPtenyBnIDe2kjqvNqtOHZDaznviZ1WDHhTvANKi5cNAnB0BFmRsweww-TQEKsVHxVFSZVuEDN2pfieGD8QhSAHE0PsFqKpP-Gf7Q6zg_2rnD6QIDLXttInFIlHwnJe8EfSVIvroQ4lIiVVyWd-JJMdIZvpJaytD484345POmYEDc86gmv0eN3IQcpPLDmoeuv68SxwAjuIHMdzJwb_DMPAdwPXdiKxn8JZbNlxYIWR5yr7qTE3nMlarm2NhPAodeZRXfdrig7yusXrHJDhBDTy59Gt0SyN4pVHO1pEP7izRe5_Z6o2eyETpCj2F5C8YKgXWX9h1Zg6UL5AfQA15vLU4B-A4SLv-wyC4DypufXEo9SgfyuUp-jPapcoFvUTjxervj1eV8GNbTnirOI_ju9PDGvmxcqiJOzpnO4FB84pUZ5yGDBQbvvj910vS1IdUwcfgdiCUGNEzh_xesNGQuu4K5AloNuRKeywvypWYoiuIBf8lrkVFxT13HPtwNUnHD1flxoJVhOUZGmYZRK5plg-PYjIk1YMYJGfMTVK6hFqXEox648iyyLedExdjUiZ3AKCg1bIVKIuAiNTgPgBSrUU-b7Dmw7pta5HpYTfWAU1dMXJMCHPhz2yhgphB9hDR1wHOKf66Fre5Vtkp-ee9GznpDd4-ev0PEkvDK7355_0pr_gLpBumNc7C6Ugo2jQm1B7X-Xv_I9EtYeAoXuI-XFo3maAlGhigooVT4c8NW8ZrVAHLTHgf3t2LfX-H4XSVeg)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdl1tv4ygUgP-K5dFIHW0S-X7pW5O00mqr3ZXanZfJPGCDExRiZzGeNtP0vy_40gCOncxiKbI537lwgAN5M9MCIvPWXFOw3xjPy1Vu8FZWSdOxrxKC0ylBICsb0T-_L7-JT2tasoIiOK0w_G5Mp1PjKLrtY6tz94GfhE4nnDdClMPmpVU5ke7RKFFKEbuTgfkJ8DqgNaXF3cjkuFtzxnQ2Ne76XXO5a153LfpdPD1a5F3HiOfGwbHcgKNRlYjmYIduvom3718aojF-_Hv-x_JB5Kh4sRvgN_7aQbXLKwe77Bl0OoOgLGWrizPB1dBLQaGko0UhHnNi7hDdAQz5-nkT4pXJNmiHVuYtf4UoAxVhK3Miib4CikFCUCmYt3Y0ZgLS7ZoWFbddq75sMEOtopDvKd4BelgUpKAN8el-cb94eJAYnoQihxqV8QZlSwxRhlVoU5KbyJoYtmV9nhhxMHNCz7fiyHLjz1_6Qcx5XhDV9B2PGwiEfjSo_xHgWQvBhwF35juxZ9th4IWKgS72s_rR5QDaATyjVybnyHZt17LOBaqTFm-OfSYiDaTr5Cae-VbbbJ7VwS85QIJzJPtz66b4UwNSpXwl5vPtenyBnIDe2kjqvNqtOHZDaznviZ1WDHhTvANKi5cNAnB0BFmRsweww-TQEKsVHxVFSZVuEDN2pfieGD8QhSAHE0PsFqKpP-Gf7Q6zg_2rnD6QIDLXttInFIlHwnJe8EfSVIvroQ4lIiVVyWd-JJMdIZvpJaytD484345POmYEDc86gmv0eN3IQcpPLDmoeuv68SxwAjuIHMdzJwb_DMPAdwPXdiKxn8JZbNlxYIWR5yr7qTE3nMlarm2NhPAodeZRXfdrig7yusXrHJDhBDTy59Gt0SyN4pVHO1pEP7izRe5_Z6o2eyETpCj2F5C8YKgXWX9h1Zg6UL5AfQA15vLU4B-A4SLv-wyC4DypufXEo9SgfyuUp-jPapcoFvUTjxervj1eV8GNbTnirOI_ju9PDGvmxcqiJOzpnO4FB84pUZ5yGDBQbvvj910vS1IdUwcfgdiCUGNEzh_xesNGQuu4K5AloNuRKeywvypWYoiuIBf8lrkVFxT13HPtwNUnHD1flxoJVhOUZGmYZRK5plg-PYjIk1YMYJGfMTVK6hFqXEox648iyyLedExdjUiZ3AKCg1bIVKIuAiNTgPgBSrUU-b7Dmw7pta5HpYTfWAU1dMXJMCHPhz2yhgphB9hDR1wHOKf66Fre5Vtkp-ee9GznpDd4-ev0PEkvDK7355_0pr_gLpBumNc7C6Ugo2jQm1B7X-Xv_I9EtYeAoXuI-XFo3maAlGhigooVT4c8NW8ZrVAHLTHgf3t2LfX-H4XSVeg)

This how identity is used to prepare Horcruxes of our Identity.


[![](https://mermaid.ink/img/pako:eNqdV1tv4jgU_itR0Eh0J6W5E5BmpO1NI001uxLVvgzz4CQOWISEdZy2bNX_vse5ENuBwK6RQOZ85_b5-Nh-16M8xvpcLxhi-J6gFUXb6xd7mWkwfv72S7u-_qotFoubTJtrizXaEqotcEQx4zOKb7JlVoMrC9o6pxEt38ZFhTGKorjJrrR3TRm1Ch-1be5lS94w7QS1hU4y11DJ1uMr7cvXRjYSzFSQCtxEAEZr6Uf90_3NQQXLKW4jz3IInJLVmml5UosgWf6LVvjnrgy_4_0v7YtWkozZnj8-mLpaKtlXEZYFphnaYmOHiuI1p_Fg_i3HrRZ4JjHOGGH7g6Uq55LEfa3WhajVuQWtnah18FFRUHPYSQ-2jkpbyivhGo3q-VzIpPu3AkGIUDHffm9KYVSHU4YpiQ4LI3InZX0xZWIN1HMu-fP2-_3jiM-PSXmgsqzDS4C55pnmttAg7vwVvi0-kxM-6BzS5f98rgy2y3ZzWISPumB0Q99iukUkhp33zkVLna3xFi91IFSPcYLKlC11QxD9hShBYYoLjnmvzS31EEWbFc3LLK5VX9eE4UaRy3eUbBHd3-VpTmvE6OHu4e7xUcDA-uRZrKASGLFoiWHKiAxaF-k4MA1OyydDm_kTe-p65iwwndmnq34Qt1BbmCr6tgsGfK4fnNQ_BHjUgn8w4Ew8e-Za1tR3p5KBNvaj-sH5AJoEnvEbEzmyHMsxzWOBqkgThm0diUgB0lU4nk08sxkWsHpyJgaYkgyL_pxqSP7kgGQpVGJ2u1kNF0gH6NVGWPFqNeKZMzXvb3tiuxEjGJJ3RGn-usYoHswgyTP2CMdPuq8RyyVkRXFYRmtoOLAtYW5oL5jGKEOGxndLqqgvyD_NDrP83ZtIHwpxeqtspREO-EeAZXBUDtBUiatUTxERpWUBKz_AZIsQzfQIa_rDE8k2w4tOWIpPrzqOV_jpssxRBIehGFS1db3ZxLd9yw9s23UMDabTqe85vmPZAd9P08nMtGa-OQ1cR9pPtbnTTFZyZWuEKUSpYp7kul9RvBfrlqwylJ4moJY_D26NujTyN4h2sIkecEeb3P9mqjJ7hok0z3dnIPyG04usX1gVTE4UCtRDsYI5vzTkBTGSZ32fvu8fRypuXf6RetDfJc4i_KPchpJF9cSDZtW3B30VjS3T5mcVfNmeZ2jmxJ1JRZmyxTHdMw7sjihXOgwYKjb9_D3HTcJIhcnJB2hmxrGC4Zw_8TvqQGgt7gLIPaKbgSVsYX-UrICL2QXIO7jXbfgFRT73HMt31AXHz5dRI4BlgsIkmiaJgFxRIp4eKedJaQZxnh0xNYhUI1RwESWsn0WSBDBUmFyNWFrcPEZ7pZHJiKoJDCwBhgOUKhR5ng1DBam9roeKUngEcNSpK05C0vR5v8PmqUbYAqxTR1wLsLv-6Jju-Vtkq-d0epbd6Z28_LV6rqA39S_353V61__BnS_cMC93NhWCDIKT3rgavCU-4CFR7mJ4PT3EBI5DfZ6gtMCGDu_QfLHPIn3OaIlbUPO8b1Af_wIX8aPv)](https://mermaid-js.github.io/mermaid-live-editor/edit/#pako:eNqdV1tv4jgU_itR0Eh0J6W5E5BmpO1NI001uxLVvgzz4CQOWISEdZy2bNX_vse5ENuBwK6RQOZ85_b5-Nh-16M8xvpcLxhi-J6gFUXb6xd7mWkwfv72S7u-_qotFoubTJtrizXaEqotcEQx4zOKb7JlVoMrC9o6pxEt38ZFhTGKorjJrrR3TRm1Ch-1be5lS94w7QS1hU4y11DJ1uMr7cvXRjYSzFSQCtxEAEZr6Uf90_3NQQXLKW4jz3IInJLVmml5UosgWf6LVvjnrgy_4_0v7YtWkozZnj8-mLpaKtlXEZYFphnaYmOHiuI1p_Fg_i3HrRZ4JjHOGGH7g6Uq55LEfa3WhajVuQWtnah18FFRUHPYSQ-2jkpbyivhGo3q-VzIpPu3AkGIUDHffm9KYVSHU4YpiQ4LI3InZX0xZWIN1HMu-fP2-_3jiM-PSXmgsqzDS4C55pnmttAg7vwVvi0-kxM-6BzS5f98rgy2y3ZzWISPumB0Q99iukUkhp33zkVLna3xFi91IFSPcYLKlC11QxD9hShBYYoLjnmvzS31EEWbFc3LLK5VX9eE4UaRy3eUbBHd3-VpTmvE6OHu4e7xUcDA-uRZrKASGLFoiWHKiAxaF-k4MA1OyydDm_kTe-p65iwwndmnq34Qt1BbmCr6tgsGfK4fnNQ_BHjUgn8w4Ew8e-Za1tR3p5KBNvaj-sH5AJoEnvEbEzmyHMsxzWOBqkgThm0diUgB0lU4nk08sxkWsHpyJgaYkgyL_pxqSP7kgGQpVGJ2u1kNF0gH6NVGWPFqNeKZMzXvb3tiuxEjGJJ3RGn-usYoHswgyTP2CMdPuq8RyyVkRXFYRmtoOLAtYW5oL5jGKEOGxndLqqgvyD_NDrP83ZtIHwpxeqtspREO-EeAZXBUDtBUiatUTxERpWUBKz_AZIsQzfQIa_rDE8k2w4tOWIpPrzqOV_jpssxRBIehGFS1db3ZxLd9yw9s23UMDabTqe85vmPZAd9P08nMtGa-OQ1cR9pPtbnTTFZyZWuEKUSpYp7kul9RvBfrlqwylJ4moJY_D26NujTyN4h2sIkecEeb3P9mqjJ7hok0z3dnIPyG04usX1gVTE4UCtRDsYI5vzTkBTGSZ32fvu8fRypuXf6RetDfJc4i_KPchpJF9cSDZtW3B30VjS3T5mcVfNmeZ2jmxJ1JRZmyxTHdMw7sjihXOgwYKjb9_D3HTcJIhcnJB2hmxrGC4Zw_8TvqQGgt7gLIPaKbgSVsYX-UrICL2QXIO7jXbfgFRT73HMt31AXHz5dRI4BlgsIkmiaJgFxRIp4eKedJaQZxnh0xNYhUI1RwESWsn0WSBDBUmFyNWFrcPEZ7pZHJiKoJDCwBhgOUKhR5ng1DBam9roeKUngEcNSpK05C0vR5v8PmqUbYAqxTR1wLsLv-6Jju-Vtkq-d0epbd6Z28_LV6rqA39S_353V61__BnS_cMC93NhWCDIKT3rgavCU-4CFR7mJ4PT3EBI5DfZ6gtMCGDu_QfLHPIn3OaIlbUPO8b1Af_wIX8aPv)




```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```



