// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.24;

/// @title VitSafeWebAuthnValidator (ERC-7579 Validator placeholder)
/// @notice Minimal compilable stub to be replaced with full implementation
contract VitSafeWebAuthnValidator {
    event CredentialLinked(address indexed safe, bytes credentialId);

    function linkCredential(bytes calldata credentialId, bytes calldata /*pubKey*/ ) external {
        emit CredentialLinked(msg.sender, credentialId);
    }

    function executeWithPasskey(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata /*webauthnSig*/
    ) external returns (bytes memory) {
        (bool ok, bytes memory ret) = to.call{value: value}(data);
        require(ok, 'EXEC_FAIL');
        return ret;
    }
}


