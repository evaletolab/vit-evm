// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract VitERC20Escrow is OwnableUpgradeable, ReentrancyGuardUpgradeable {

    mapping(bytes32 => uint256) private deposits; // Mapping to track deposits (orderId => amount)
    mapping(bytes32 => address) private tokens;   // Mapping to track the token addresses for each order

    event Deposited(bytes32 indexed orderId, address indexed user, uint256 amount, address token);
    event Withdrawn(bytes32 indexed orderId, address indexed payee, uint256 amount, address token);
    event Refunded(bytes32 indexed orderId, address indexed user, uint256 amount, address token);

    function initialize() public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
    }

    // Deposit ERC-20 tokens into escrow
    function deposit(bytes32 orderId, uint256 amount, address tokenAddress, address payer) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(deposits[orderId] == 0, "Funds already deposited");

        // Transfer tokens from payer to the escrow
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(payer, address(this), amount), "Token transfer failed");

        deposits[orderId] = amount;
        tokens[orderId] = tokenAddress;

        emit Deposited(orderId, payer, amount, tokenAddress);
    }

    // Withdraw the funds to the seller (after capture)
    function withdraw(bytes32 orderId, address payee) external onlyOwner nonReentrant {
        uint256 amount = deposits[orderId];
        address tokenAddress = tokens[orderId];
        require(amount > 0, "No funds to withdraw");

        // Transfer the tokens to the seller
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(payee, amount), "Withdraw failed");

        delete deposits[orderId];
        delete tokens[orderId];

        emit Withdrawn(orderId, payee, amount, tokenAddress);
    }

    // Refund the funds to the payer
    function refund(bytes32 orderId, address payer) external onlyOwner nonReentrant {
        uint256 amount = deposits[orderId];
        address tokenAddress = tokens[orderId];
        require(amount > 0, "No funds to refund");

        // Refund the tokens to the payer
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(payer, amount), "Refund failed");

        delete deposits[orderId];
        delete tokens[orderId];

        emit Refunded(orderId, payer, amount, tokenAddress);
    }

    // Check the balance held in escrow for a specific orderId
    function balanceOf(bytes32 orderId) external view returns (uint256) {
        return deposits[orderId];
    }

    // Check the token associated with a specific orderId
    function tokenOf(bytes32 orderId) external view returns (address) {
        return tokens[orderId];
    }
}
