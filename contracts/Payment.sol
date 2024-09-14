// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract VitPayment is UUPSUpgradeable, 
                    OwnableUpgradeable, 
                    AccessControlUpgradeable, 
                    ReentrancyGuardUpgradeable, 
                    PausableUpgradeable {

    struct Authorization {
        uint256 amount;
        uint256 createdAt;
        uint256 expiresAt;
        bool captured;
        bool canceled;
    }

    //
    // Define the role for payment executor
    bytes32 public constant PAYMENT_EXECUTOR_ROLE = keccak256("PAYMENT_EXECUTOR_ROLE");

    //
    // Mapping of authorized payments (orderID => Authorization)
    mapping(bytes32 => Authorization) public authorizations; 

    uint256 public refundWindow; // Time window for refunds (in seconds)
    uint256 public authExpiration; // Time window for authorization expiration (in seconds)

    event Authorized(bytes32 indexed orderId, bytes32 indexed cartId, uint256 amount, uint256 expiresAt);
    event Captured(bytes32 indexed orderId, uint256 amount);
    event Canceled(bytes32 indexed orderId);
    event Refunded(bytes32 indexed orderId, uint256 amount);

    // Initializer instead of constructor for upgradable contracts
    function initialize(uint256 _authExpiration, uint256 _refundWindow, address _paymentExecutor) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();

        // Grant the payment executor role to the specified address
        _setupRole(PAYMENT_EXECUTOR_ROLE, _paymentExecutor);

        // Set the owner as the default admin of the contract
        _setRoleAdmin(PAYMENT_EXECUTOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // Only allow the owner to upgrade the contract
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Authorize a payment (hold the amount) for a specific order
    function authorize(bytes32 orderId, bytes32 cartId, uint256 amount) external whenNotPaused {
        require(authorizations[orderId].createdAt == 0, "Order already authorized");
        require(amount > 0, "Amount must be greater than zero");

        // Create an authorization for the payment
        authorizations[orderId] = Authorization({
            amount: amount,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + authExpiration,
            captured: false,
            canceled: false
        });

        emit Authorized(orderId, cartId, amount, authorizations[orderId].expiresAt);
    }

    // Capture the authorized payment for a specific amount
    function capture(bytes32 orderId, uint256 amount) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];

        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Authorization canceled");
        require(amount <= auth.amount, "Capture amount exceeds authorized amount");
        require(block.timestamp <= auth.expiresAt, "Authorization has expired");

        // Capture the payment
        auth.captured = true;

        emit Captured(orderId, amount);
    }

    // Cancel the authorization
    function cancel(bytes32 orderId) external whenNotPaused onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];

        require(auth.createdAt > 0, "Authorization does not exist");
        require(!auth.captured, "Already captured");
        require(!auth.canceled, "Already canceled");
        require(block.timestamp <= auth.expiresAt, "Authorization already expired");

        // Cancel the authorization
        auth.canceled = true;

        emit Canceled(orderId);
    }

    // Refund the captured payment, within the refund window
    function refund(bytes32 orderId, uint256 amount) external whenNotPaused nonReentrant onlyRole(PAYMENT_EXECUTOR_ROLE) {
        Authorization storage auth = authorizations[orderId];

        require(auth.createdAt > 0, "Authorization does not exist");
        require(auth.captured, "Payment not captured");
        require(!auth.canceled, "Payment already canceled");
        require(amount <= auth.amount, "Refund amount exceeds captured amount");
        require(block.timestamp <= auth.createdAt + refundWindow, "Refund window has expired");

        // Process the refund
        auth.amount -= amount;

        emit Refunded(orderId, amount);
    }

    // Pause contract functions
    function pause() external onlyOwner {
        _pause();
    }

    // Unpause contract functions
    function unpause() external onlyOwner {
        _unpause();
    }

    // Set new refund window
    function setRefundWindow(uint256 newRefundWindow) external onlyOwner {
        refundWindow = newRefundWindow;
    }

    // Set new authorization expiration time
    function setAuthExpiration(uint256 newAuthExpiration) external onlyOwner {
        authExpiration = newAuthExpiration;
    }
}
