// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.24;

/// @title RecoveryValidator (ERC-7579 Validator placeholder)
/// @notice Minimal compilable stub to be replaced with full implementation
contract RecoveryValidator {
    event RecoveryUsed(address indexed safe, address indexed newOwner);

    function linkRecovery(bytes32 /*salt*/ ) external {}

    function recover(address safe, address newOwner) external {
        emit RecoveryUsed(safe, newOwner);
    }
}


