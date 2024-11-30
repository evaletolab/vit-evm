// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract MockSafe {
    event ExecutedTransaction(address to, uint256 value, bytes data, uint8 operation);

    enum Operation { Call, DelegateCall }

    //
    // Mock 4337 module transfer operations
    address public user;

    function mockTransferFrom(address _user) external {
        user = _user;
    }

    // example with Executor.sol
    // https://github.com/safe-global/safe-smart-account/blob/7f79aaf05c33df71d9cb687f0bc8a73fa39d25d5/contracts/base/Executor.sol#L21
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) external returns (bool success) {
        emit ExecutedTransaction(to, value, data, uint8(operation));

        address recipient;
        uint256 amount;
        bytes memory buf = new bytes(data.length - 4);
        for (uint256 i = 4; i < data.length; i++) {
            buf[i - 4] = data[i];
        }
        (recipient, amount) = abi.decode(buf, (address, uint256));
        success= IERC20(to).transferFrom(user, recipient, amount);
        return success; 
    }


    receive() external payable {}
}
