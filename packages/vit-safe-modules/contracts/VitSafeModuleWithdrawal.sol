// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "hardhat/console.sol";


interface ISafe {
    enum Operation { Call, DelegateCall }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) external returns (bool success);
}

contract VitSafeModuleWithdrawal is PausableUpgradeable, OwnableUpgradeable{
    // Stores the withdrawal requests by secretHash
    struct WithdrawalRequest {
        uint timelimit; 
        uint amount;
        uint sender;
    }

    // immutable
    IERC20 public  xCHF;

    // Mapping from secretHash to WithdrawalRequest
    mapping(bytes32 => WithdrawalRequest) public withdrawals;

    event Withdrawal(uint256 amount, address recipient, uint256 when);

    /**
     * FOR_UPDATE_ONLY: Initializes the contract setting the initial parameters.
     * This function should be called only once during the contract deployment.
     * It sets up the necessary configurations and state variables required for the contract to function properly.
     */
    // function initialize(address _xCHF, address _owner) public initializer {
    //     __Ownable_init(_owner);
    //     __Pausable_init();
    //     xCHF = IERC20(_xCHF);
    // }

    constructor(address _xCHF, address _owner){
        __Ownable_init(_owner);
        __Pausable_init();
        xCHF = IERC20(_xCHF);
    }

    // Fonction utilitaire pour vérifier si une adresse est un contrat
    function isContract(address account) internal view returns (bool) {
      uint256 size;
      assembly { size := extcodesize(account) }
      return size > 0; 
    }

    function isSafe(address account) internal view returns (bool) {
        bytes32 safeCodeHash = "0x123456..."; // Remplacez par le hash du bytecode du contrat Safe
        bytes32 codeHash;

        assembly {
            codeHash := extcodehash(account)
        }
        return (codeHash == safeCodeHash)||true;
    }    

    /**
     * User can create a one-time withdrawal to let a third party withdraw the funds
     * @param secret The hash of the secret (bytes32)
     * @param amount The fixed amount authorized to withdraw from the safe account
     */
    function createWithdrawal(bytes32 secret, uint amount) external whenNotPaused{
      require(amount > 0, "Amount must be greater than zero");
      require(isContract(msg.sender), "Caller must be from Safe");
      withdrawals[secret] = WithdrawalRequest({
          amount: amount, 
          sender: uint256(keccak256(abi.encodePacked(msg.sender))),
          timelimit: (block.timestamp + 604800)
      });

      //console.log("create with code:", uint256(secret), withdrawals[secret].timelimit);
      return ;
    }


    /**
     * Authorizes a withdrawal from the safe account
     * @param code The code to authorize the withdrawal
     * @param salt The salt used to generate the secret: sha256(code + salt) produces secretHash
     * @param recipient The funds destination
     * Note: code and salt should be securely sent and are note deterministic
     */
    function authorizeWithdrawal(
        uint code, 
        uint salt,
        address recipient) external whenNotPaused {
        bytes32 hash = (keccak256(abi.encodePacked(code, salt)));
        bytes32 secret = bytes32(keccak256(abi.encodePacked(hash)));

        WithdrawalRequest storage request = withdrawals[secret];
        require(request.amount> 0 , "Invalid Account");
        require(recipient != address(0), "Recipient cannot be the zero address");

        // Check if the request is still valid
        if(request.timelimit < block.timestamp){
            delete withdrawals[secret];
            revert("Withdrawal request expired");
        }

        // Avoid reentrancy        
        uint amount = request.amount;        
        request.amount = 0; 
        
        //
        // Check if sender is valid SafeModule
        require(uint256(keccak256(abi.encodePacked(msg.sender))) == request.sender, "Chain of trust broken");

        // this is safe
        ISafe safe = ISafe(msg.sender);

        //
        // Transfert specific ERC-20 from EOA account to recipient
        bytes memory transferData = abi.encodeWithSelector(IERC20.transfer.selector, recipient, amount);


        // Execute the transaction from the Safe
        bool success = safe.execTransactionFromModule(
            address(xCHF),
            0,
            transferData,
            ISafe.Operation.Call
        );
        require(success, "Transaction failed");
        // Delete the withdrawal request to prevent reuse        
        emit Withdrawal(amount, recipient, withdrawals[secret].timelimit);

        delete withdrawals[secret];
    }


    // Fonctions d'administration
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

}
