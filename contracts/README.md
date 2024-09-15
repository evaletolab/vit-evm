# ViT Isn't Twint

🚀 **ViT Isn't Twint** is a decentralized payment processing system built on Ethereum, offering secure, upgradable, and flexible smart contracts for handling transactions, authorizations, captures, cancellations, and refunds using whitelisted ERC-20 tokens.

## Objective

To create a robust and secure payment gateway that **mimics** traditional payment systems on the blockchain, allowing for authorizations, captures, and refunds with upgradable contracts for future enhancements.

## Use Cases

- 🛒 **E-commerce Payments**: Facilitate secure and efficient payments for online purchases using ERC-20 tokens.
- 🔄 **Authorization and Capture**: Support separate authorization and capture phases, similar to credit card processing systems like Stripe.
- 💸 **Refunds and Cancellations**: Enable merchants to process partial or full refunds and cancellations of transactions.
- ⏳ **Holding Periods**: Implement holding periods before fund release to handle disputes or chargebacks.
- 📈 **Scalability**: Allow for bulk operations such as bulk withdrawals to optimize gas costs for high-volume merchants.

## Specifications

### **Payment Contract (`Payment.sol`)**

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

### **Escrow Contract (`ERC20Escrow.sol`)**

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

Made with ❤️ for secure and transparent blockchain payments!


```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
