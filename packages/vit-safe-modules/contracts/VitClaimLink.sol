// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VitClaimLink — hash-locked claim links for ERC20 transfers
/// @notice Sender locks tokens with a secret hash. Anyone with the secret can
///         redeem to any recipient. Sender can cancel at any time while the
///         link is still pending. After expiry, only cancellation is allowed.
/// @dev    The "secret" is generated client-side and embedded in the share URL
///         (e.g. https://app/claim?id=&s=). It is revealed on-chain at claim
///         time — that's fine because the link must be passed off-chain anyway.
contract VitClaimLink is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { Pending, Claimed, Cancelled }

    struct Link {
        address sender;
        address token;
        uint128 amount;
        uint64  expiry;     // 0 = no expiry, else unix seconds
        Status  status;
        bytes32 secretHash; // keccak256(abi.encode(secret))
    }

    mapping(bytes32 => Link) public links;

    event LinkCreated(
        bytes32 indexed id,
        address indexed sender,
        address indexed token,
        uint128 amount,
        uint64 expiry
    );
    event LinkClaimed(bytes32 indexed id, address indexed recipient, uint128 amount);
    event LinkCancelled(bytes32 indexed id, address indexed sender, uint128 amount);

    error AlreadyExists();
    error NotPending();
    error NotSender();
    error Expired();
    error WrongSecret();
    error ZeroAmount();

    /// @notice Lock `amount` of `token` behind `secretHash`. Sender must have
    ///         approved this contract for `amount` beforehand.
    /// @param id          Caller-chosen unique identifier (typically a random
    ///                    32-byte value bound to the secret).
    /// @param token       ERC20 token address.
    /// @param amount      Quantity to lock (must be > 0).
    /// @param expiry      Unix seconds after which claim is forbidden; 0 = none.
    /// @param secretHash  keccak256(abi.encode(secret)).
    function create(
        bytes32 id,
        address token,
        uint128 amount,
        uint64  expiry,
        bytes32 secretHash
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (links[id].sender != address(0)) revert AlreadyExists();

        links[id] = Link({
            sender:     msg.sender,
            token:      token,
            amount:     amount,
            expiry:     expiry,
            status:     Status.Pending,
            secretHash: secretHash
        });

        emit LinkCreated(id, msg.sender, token, amount, expiry);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Reveal `secret` and forward the locked amount to `recipient`.
    ///         Anyone may call (the secret holder = anyone who knows it).
    function claim(bytes32 id, bytes32 secret, address recipient) external nonReentrant {
        Link storage l = links[id];
        if (l.status != Status.Pending) revert NotPending();
        if (l.expiry != 0 && block.timestamp > l.expiry) revert Expired();
        if (keccak256(abi.encode(secret)) != l.secretHash) revert WrongSecret();

        l.status = Status.Claimed;
        uint128 amount = l.amount;
        address token  = l.token;

        emit LinkClaimed(id, recipient, amount);
        IERC20(token).safeTransfer(recipient, amount);
    }

    /// @notice Sender refund. Allowed any time while status is Pending (incl.
    ///         after expiry — that's the whole point of cancellation).
    function cancel(bytes32 id) external nonReentrant {
        Link storage l = links[id];
        if (l.status != Status.Pending) revert NotPending();
        if (l.sender != msg.sender) revert NotSender();

        l.status = Status.Cancelled;
        uint128 amount = l.amount;
        address token  = l.token;

        emit LinkCancelled(id, msg.sender, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Quick read of a link's full state.
    function getLink(bytes32 id) external view returns (Link memory) {
        return links[id];
    }
}
