// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./Payment.ERC20Escrow.sol";

contract Payment is UUPSUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {

    struct Authorization {
        uint256 amount;
        address tokenAddress;
        uint256 createdAt;
        uint256 expiresAt;
        bool captured;
        bool canceled;
    }

    bytes32 public constant PAYMENT_EXECUTOR_ROLE = keccak256("PAYMENT_EXECUTOR_ROLE");

    mapping(bytes32 => Authorization) public authorizations;
    mapping(address => bool) public whitelistedTokens;

    uint256 public refundWindow;
    uint256 public authExpiration;

    ERC20Escrow public escrowContract;

    event Authorized(bytes32 indexed orderId, bytes32 indexed cartId, uint256 amount, address tokenAddress, uint256 expiresAt);
    event Captured(bytes32 indexed orderId, uint256 amount, address tokenAddress);
    event Canceled(bytes32 indexed orderId);
    event Refunded(bytes32 indexed orderId, uint256 amount, address tokenAddress);

    function initialize(uint256 _authExpiration, uint256 _refundWindow, address _paymentExecutor, address _escrowAddress) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();

        authExpiration = _authExpiration;
        refundWindow = _refundWindow;

        _setupRole(PAYMENT_EXECUTOR_ROLE, _paymentExecutor);

        escrowContract = ERC20Escrow(_escrowAddress);

        _setRoleAdmin(PAYMENT_EXECUTOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function whitelistToken(address tokenAddress, bool isWhitelisted) external onlyOwner {
        whitelistedTokens[tokenAddress] = isWhitelisted;
    }

    function authorize(bytes32 orderId, bytes32 cartId, uint256 amount, address tokenAddress, address payer) external whenNotPaused {
        require(authorizations[orderId].createdAt == 0, "Order already authorized");
        require(amount > 0, "Amount must be greater than zero");
        require(whitelistedTokens[tokenAddress], "Token not whitelisted");

        authorizations[orderId] = Authorization({
            amount: amount,
            tokenAddress: tokenAddress,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + authExpiration,
            captured: false,
            canceled: false
        });

        // Deposit tokens in escrow
        escrowContract.deposit(orderId, amount, tokenAddress, payer);

        emit Authorized(orderId, cartId, amount, tokenAddress, authorizations[orderId].expiresAt);
    }

    function capture(bytes32 orderId) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Authorization canceled");
        require(block.timestamp <= auth.expiresAt, "Authorization has expired");

        // Withdraw tokens from escrow to the seller
        escrowContract.withdraw(orderId, msg.sender);

        auth.captured = true;

        emit Captured(orderId, auth.amount, auth.tokenAddress);
    }

    function cancel(bytes32 orderId) external whenNotPaused onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Already canceled");
        require(block.timestamp <= auth.expiresAt, "Authorization already expired");

        auth.canceled = true;

        // Refund tokens from escrow to the payer
        escrowContract.refund(orderId, msg.sender);

        emit Canceled(orderId);
    }

    function refund(bytes32 orderId, uint256 amount) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(auth.captured, "Payment not captured");
        require(!auth.canceled, "Payment already canceled");
        require(amount <= auth.amount, "Refund amount exceeds captured amount");
        require(block.timestamp <= auth.createdAt + refundWindow, "Refund window has expired");

        escrowContract.refund(orderId, msg.sender);

        auth.amount -= amount;

        emit Refunded(orderId, amount, auth.tokenAddress);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setRefundWindow(uint256 newRefundWindow) external onlyOwner {
        refundWindow = newRefundWindow;
    }

    function setAuthExpiration(uint256 newAuthExpiration) external onlyOwner {
        authExpiration = newAuthExpiration;
    }
}
