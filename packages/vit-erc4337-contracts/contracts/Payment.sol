// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./Payment.ERC20Escrow.sol";

contract Payment is UUPSUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {

    struct Authorization {
        uint256 amount;
        address tokenAddress;
        address payer;
        uint256 createdAt;
        uint256 expiresAt;
        bool captured;
        bool canceled;
    }

    bytes32 public constant PAYMENT_EXECUTOR_ROLE = keccak256("PAYMENT_EXECUTOR_ROLE");

    mapping(bytes32 => Authorization) public authorizations;
    mapping(address => bool) public whitelistedTokens;

    uint256 public refundWindow;        // Délai pour les remboursements après la capture
    uint256 public authExpiration;      // Délai d'expiration de l'autorisation (ex: 7 jours)
    uint256 public holdingPeriod;       // Période de rétention des fonds après capture

    ERC20Escrow public escrowContract;

    event Authorized(bytes32 indexed orderId, bytes32 indexed cartId, uint256 amount, address tokenAddress, uint256 expiresAt);
    event Captured(bytes32 indexed orderId, uint256 amount, address tokenAddress);
    event Canceled(bytes32 indexed orderId);
    event Refunded(bytes32 indexed orderId, uint256 amount, address tokenAddress);

    function initialize(uint256 _authExpiration, uint256 _refundWindow, uint256 _holdingPeriod, address _paymentExecutor, address _escrowAddress,address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();

        authExpiration = _authExpiration;
        refundWindow = _refundWindow;
        holdingPeriod = _holdingPeriod;

        grantRole(PAYMENT_EXECUTOR_ROLE, _paymentExecutor);

        escrowContract = ERC20Escrow(_escrowAddress);

        _setRoleAdmin(PAYMENT_EXECUTOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Whitelist de tokens ERC-20
    function whitelistToken(address tokenAddress, bool isWhitelisted) external onlyOwner {
        whitelistedTokens[tokenAddress] = isWhitelisted;
    }

    // Autoriser un paiement avec un token ERC-20 spécifique
    function authorize(bytes32 orderId, bytes32 cartId, uint256 amount, address tokenAddress, address payer) external whenNotPaused {
        require(authorizations[orderId].createdAt == 0, "Order already authorized");
        require(amount > 0, "Amount must be greater than zero");
        require(whitelistedTokens[tokenAddress], "Token not whitelisted");

        authorizations[orderId] = Authorization({
            amount: amount,
            tokenAddress: tokenAddress,
            payer: payer,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + authExpiration,
            captured: false,
            canceled: false
        });

        // Dépôt des tokens dans l'escrow
        escrowContract.deposit(orderId, amount, tokenAddress, payer);

        emit Authorized(orderId, cartId, amount, tokenAddress, authorizations[orderId].expiresAt);
    }

    // Capturer le paiement autorisé
    function capture(bytes32 orderId) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Authorization canceled");
        require(block.timestamp <= auth.expiresAt, "Authorization has expired");

        auth.captured = true;

        // Définir le temps de libération dans l'escrow (temps actuel + période de rétention)
        uint256 releaseTime = block.timestamp + holdingPeriod;
        escrowContract.setReleaseTime(orderId, msg.sender, releaseTime);

        emit Captured(orderId, auth.amount, auth.tokenAddress);
    }

    // Annuler l'autorisation
    function cancel(bytes32 orderId) external whenNotPaused onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Already canceled");
        require(block.timestamp <= auth.expiresAt, "Authorization already expired");

        auth.canceled = true;

        // Remboursement des tokens de l'escrow au payeur
        escrowContract.refund(orderId,0);

        emit Canceled(orderId);
    }

    // Rembourser le paiement capturé
    function refund(bytes32 orderId, uint256 amount) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];
        require(auth.createdAt > 0, "Authorization does not exist");
        require(auth.captured, "Payment not captured");
        require(!auth.canceled, "Payment already canceled");
        require(block.timestamp <= auth.createdAt + refundWindow, "Refund window has expired");
        require(amount > 0, "Refund amount must be greater than zero");
        require(amount <= auth.amount, "Refund amount exceeds authorized amount");

        // Vérifier que les fonds sont toujours disponibles dans l'escrow
        uint256 escrowBalance = escrowContract.balanceOf(orderId);
        require(escrowBalance >= amount, "Insufficient funds in escrow for refund");

        // Remboursement via l'escrow
        escrowContract.refund(orderId, amount);

        auth.amount -= amount;

        emit Refunded(orderId, amount, auth.tokenAddress);
    }


    // Fonctions d'administration
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

    function setHoldingPeriod(uint256 newHoldingPeriod) external onlyOwner {
        holdingPeriod = newHoldingPeriod;
    }
}
