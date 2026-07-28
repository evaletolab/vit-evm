// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// NOTE(deps): ReentrancyGuardUpgradeable a été supprimé d'OZ contracts-upgradeable 5.5+.
// Le package est donc pinné sur 5.4.0 (cf. package.json) : monter de version impose de
// passer au ReentrancyGuard non-upgradeable, que hardhat-upgrades 3.x rejette encore.
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title VitClaimLink — hash-locked claim links for ERC20 transfers (UUPS)
/// @notice Sender locks tokens with a secret hash. Anyone with the secret can
///         redeem to any recipient. Sender can cancel while pending. After
///         expiry, anyone may call cancelExpired (funds always return to sender).
/// @dev    metaHash = keccak256 of off-chain contact payload; 0 = none.
contract VitClaimLink is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    enum Status { Pending, Claimed, Cancelled }

    struct Link {
        address sender;
        address token;
        uint128 amount;
        uint64  expiry;     // 0 = no expiry, else unix seconds
        Status  status;
        bytes32 secretHash; // keccak256(abi.encode(secret))
        bytes32 metaHash;   // keccak256(contact payload); 0 = unchecked
    }

    mapping(bytes32 => Link) public links;

    event LinkCreated(
        bytes32 indexed id,
        address indexed sender,
        address indexed token,
        uint128 amount,
        uint64 expiry,
        bytes32 metaHash
    );
    event LinkClaimed(bytes32 indexed id, address indexed recipient, uint128 amount);
    event LinkCancelled(bytes32 indexed id, address indexed sender, uint128 amount);

    error AlreadyExists();
    error NotPending();
    error NotSender();
    error Expired();
    error NotExpired();
    error WrongSecret();
    error ZeroAmount();
    error MetaMismatch();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Lock `amount` of `token` behind `secretHash`.
    /// @param metaHash keccak256 of contact payload bytes (0 if none).
    function create(
        bytes32 id,
        address token,
        uint128 amount,
        uint64  expiry,
        bytes32 secretHash,
        bytes32 metaHash
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (links[id].sender != address(0)) revert AlreadyExists();

        links[id] = Link({
            sender:     msg.sender,
            token:      token,
            amount:     amount,
            expiry:     expiry,
            status:     Status.Pending,
            secretHash: secretHash,
            metaHash:   metaHash
        });

        emit LinkCreated(id, msg.sender, token, amount, expiry, metaHash);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Reveal `secret` and forward locked amount to `recipient`.
    /// @param expectedMetaHash must match stored metaHash when metaHash != 0.
    function claim(
        bytes32 id,
        bytes32 secret,
        address recipient,
        bytes32 expectedMetaHash
    ) external nonReentrant {
        Link storage l = links[id];
        if (l.status != Status.Pending) revert NotPending();
        if (l.expiry != 0 && block.timestamp > l.expiry) revert Expired();
        if (keccak256(abi.encode(secret)) != l.secretHash) revert WrongSecret();
        if (l.metaHash != bytes32(0) && l.metaHash != expectedMetaHash) {
            revert MetaMismatch();
        }

        l.status = Status.Claimed;
        uint128 amount = l.amount;
        address token  = l.token;

        emit LinkClaimed(id, recipient, amount);
        IERC20(token).safeTransfer(recipient, amount);
    }

    /// @notice Sender refund while pending (incl. after expiry).
    function cancel(bytes32 id) external nonReentrant {
        Link storage l = links[id];
        if (l.status != Status.Pending) revert NotPending();
        if (l.sender != msg.sender) revert NotSender();
        _refund(id, l);
    }

    /// @notice Permissionless cancel after expiry — funds always to original sender.
    function cancelExpired(bytes32 id) external nonReentrant {
        Link storage l = links[id];
        if (l.status != Status.Pending) revert NotPending();
        if (l.expiry == 0 || block.timestamp <= l.expiry) revert NotExpired();
        _refund(id, l);
    }

    function getLink(bytes32 id) external view returns (Link memory) {
        return links[id];
    }

    function _refund(bytes32 id, Link storage l) private {
        l.status = Status.Cancelled;
        uint128 amount = l.amount;
        address token  = l.token;
        address sender = l.sender;

        emit LinkCancelled(id, sender, amount);
        IERC20(token).safeTransfer(sender, amount);
    }
}
