// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.24;

/// @title VitSafePaymentGuard (ERC-7579 Guard placeholder)
/// @notice Minimal compilable stub to be replaced with real policy logic
contract VitSafePaymentGuard {
    address public owner;
    mapping(address => bool) public isWhitelisted;

    constructor() {
        owner = msg.sender;
    }

    function setWhitelist(address who, bool allowed) external {
        require(msg.sender == owner, 'ONLY_OWNER');
        isWhitelisted[who] = allowed;
    }
}


