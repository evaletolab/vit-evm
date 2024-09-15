// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ERC20Escrow is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // Structure to store deposit information
    struct Deposit {
        uint256 amount;            // Total amount deposited
        address tokenAddress;      // ERC-20 token address
        address payer;             // Address of the payer
        address payee;             // Address of the payee (seller)
        uint256 releaseTime;       // Time after which funds can be withdrawn
        uint256 withdrawnAmount;   // Amount already withdrawn
    }

    // Mapping from orderId to Deposit
    mapping(bytes32 => Deposit) private deposits;

    // Mapping from payee address to array of orderIds
    mapping(address => bytes32[]) private payeeOrders;

    event Deposited(bytes32 indexed orderId, address indexed payer, uint256 amount, address token);
    event Withdrawn(bytes32 indexed orderId, address indexed payee, uint256 amount, address token);
    event BulkWithdrawn(address indexed payee, bytes32[] orderIds, uint256[] amounts, address[] tokens);
    event Refunded(bytes32 indexed orderId, address indexed payer, uint256 amount, address token);

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
    }

    /**
     * @dev Deposits tokens into escrow for a specific orderId.
     * @param orderId The unique identifier of the order.
     * @param amount The amount of tokens to deposit.
     * @param tokenAddress The address of the ERC-20 token.
     * @param payer The address of the payer.
     */
    function deposit(bytes32 orderId, uint256 amount, address tokenAddress, address payer) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(deposits[orderId].amount == 0, "Funds already deposited");

        // Renommer la variable locale pour éviter le conflit
        Deposit storage escrowDeposit = deposits[orderId];

        // Mettre à jour l'état avant l'appel externe
        escrowDeposit.amount = amount;
        escrowDeposit.tokenAddress = tokenAddress;
        escrowDeposit.payer = payer;
        escrowDeposit.payee = address(0);
        escrowDeposit.releaseTime = 0;
        escrowDeposit.withdrawnAmount = 0;

        emit Deposited(orderId, payer, amount, tokenAddress);

        // Transfert des tokens du payeur vers l'escrow
        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(payer, address(this), amount);
    }

    /**
     * @dev Sets the release time and payee for a deposit after capture.
     * @param orderId The unique identifier of the order.
     * @param payee The address of the payee (seller).
     * @param releaseTime The timestamp after which funds can be withdrawn.
     */
    function setReleaseTime(bytes32 orderId, address payee, uint256 releaseTime) external onlyOwner {
        Deposit storage deposit = deposits[orderId];
        require(deposit.amount > 0, "No deposit found");
        require(deposit.payee == address(0), "Payee already set");

        deposit.payee = payee;
        deposit.releaseTime = releaseTime;

        // Register the orderId for the payee
        payeeOrders[payee].push(orderId);
    }

    /**
     * @dev Withdraws funds for a specific orderId after the holding period.
     * @param orderId The unique identifier of the order.
     */
    function withdraw(bytes32 orderId) external nonReentrant {
        Deposit storage deposit = deposits[orderId];
        require(deposit.amount > 0, "No funds to withdraw");
        require(msg.sender == deposit.payee, "Only payee can withdraw");
        require(block.timestamp >= deposit.releaseTime, "Funds are still in holding period");
        require(deposit.withdrawnAmount < deposit.amount, "All funds already withdrawn");

        uint256 amountToWithdraw = deposit.amount - deposit.withdrawnAmount;

        // Update state before external call
        deposit.withdrawnAmount = deposit.amount; // All funds withdrawn

        emit Withdrawn(orderId, deposit.payee, amountToWithdraw, deposit.tokenAddress);

        // Transfer tokens to the payee
        IERC20 token = IERC20(deposit.tokenAddress);
        token.safeTransfer(deposit.payee, amountToWithdraw);

        // Remove orderId from payeeOrders
        _removeOrderIdFromPayee(deposit.payee, orderId);
    }

    /**
     * @dev Withdraws all available funds for the payee.
     */
    function bulkWithdraw() external nonReentrant {
        bytes32[] storage orders = payeeOrders[msg.sender];
        require(orders.length > 0, "No orders available for withdrawal");

        bytes32[] memory withdrawnOrderIds = new bytes32[](orders.length);
        uint256[] memory withdrawnAmounts = new uint256[](orders.length);
        address[] memory tokenAddresses = new address[](orders.length);

        uint256 count = 0;
        uint256 i = orders.length;

        while (i > 0) {
            i--;
            bytes32 orderId = orders[i];
            Deposit storage deposit = deposits[orderId];

            if (
                deposit.amount > 0 &&
                deposit.withdrawnAmount < deposit.amount &&
                block.timestamp >= deposit.releaseTime
            ) {
                uint256 amountToWithdraw = deposit.amount - deposit.withdrawnAmount;

                // Update state before external call
                deposit.withdrawnAmount = deposit.amount; // All funds withdrawn

                // Transfer tokens to the payee
                IERC20 token = IERC20(deposit.tokenAddress);
                token.safeTransfer(deposit.payee, amountToWithdraw);

                withdrawnOrderIds[count] = orderId;
                withdrawnAmounts[count] = amountToWithdraw;
                tokenAddresses[count] = deposit.tokenAddress;

                emit Withdrawn(orderId, deposit.payee, amountToWithdraw, deposit.tokenAddress);

                // Remove orderId from payeeOrders
                _removeOrderAtIndex(orders, i);

                count++;
            }
        }

        require(count > 0, "No funds available for withdrawal");

        // Emit the BulkWithdrawn event
        bytes32[] memory finalOrderIds = new bytes32[](count);
        uint256[] memory finalAmounts = new uint256[](count);
        address[] memory finalTokens = new address[](count);

        for (uint256 j = 0; j < count; j++) {
            finalOrderIds[j] = withdrawnOrderIds[j];
            finalAmounts[j] = withdrawnAmounts[j];
            finalTokens[j] = tokenAddresses[j];
        }

        emit BulkWithdrawn(msg.sender, finalOrderIds, finalAmounts, finalTokens);
    }

    /**
     * @dev Refunds a specified amount to the payer for a given orderId.
     * @param orderId The unique identifier of the order.
     * @param amount The amount to refund.
     */
    function refund(bytes32 orderId, uint256 amount) external onlyOwner nonReentrant {
        Deposit storage escrowDeposit = deposits[orderId];
        require(escrowDeposit.amount > 0, "No funds to refund");
        uint256 availableAmount = escrowDeposit.amount - escrowDeposit.withdrawnAmount;

        // If amount is zero, refund the entire available amount
        if (amount == 0) {
            amount = availableAmount;
        }

        require(amount > 0, "Refund amount must be greater than zero");
        require(amount <= availableAmount, "Refund amount exceeds available funds");

        // Update state before external call
        escrowDeposit.withdrawnAmount += amount;

        emit Refunded(orderId, escrowDeposit.payer, amount, escrowDeposit.tokenAddress);

        // Transfer tokens back to the payer
        IERC20 token = IERC20(escrowDeposit.tokenAddress);
        token.safeTransfer(escrowDeposit.payer, amount);

        // If all funds have been withdrawn, remove orderId from payeeOrders
        if (escrowDeposit.withdrawnAmount == escrowDeposit.amount && escrowDeposit.payee != address(0)) {
            _removeOrderIdFromPayee(escrowDeposit.payee, orderId);
        }
    }

    /**
     * @dev Returns the available balance in escrow for a specific orderId.
     * @param orderId The unique identifier of the order.
     */
    function balanceOf(bytes32 orderId) external view returns (uint256) {
        Deposit storage deposit = deposits[orderId];
        return deposit.amount - deposit.withdrawnAmount;
    }

    /**
     * @dev Returns the token address associated with a specific orderId.
     * @param orderId The unique identifier of the order.
     */
    function tokenOf(bytes32 orderId) external view returns (address) {
        return deposits[orderId].tokenAddress;
    }

    /**
     * @dev Internal function to remove an orderId from a payee's list.
     * @param payee The address of the payee.
     * @param orderId The unique identifier of the order to remove.
     */
    function _removeOrderIdFromPayee(address payee, bytes32 orderId) internal {
        bytes32[] storage orders = payeeOrders[payee];
        uint256 length = orders.length;
        for (uint256 i = 0; i < length; i++) {
            if (orders[i] == orderId) {
                _removeOrderAtIndex(orders, i);
                break;
            }
        }
    }

    /**
     * @dev Internal function to remove an element at a specific index in an array.
     * @param array The array from which to remove the element.
     * @param index The index of the element to remove.
     */
    function _removeOrderAtIndex(bytes32[] storage array, uint256 index) internal {
        uint256 lastIndex = array.length - 1;
        if (index != lastIndex) {
            array[index] = array[lastIndex];
        }
        array.pop();
    }
}
