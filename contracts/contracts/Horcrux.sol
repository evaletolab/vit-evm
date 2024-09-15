pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT

// FIXME use upgrade contracts
// https://docs.openzeppelin.com/learn/upgrading-smart-contracts
// https://medium.com/coinmonks/upgrading-smart-contracts-with-openzeppelin-upgrades-plugins-in-typescript-hardhat-dd5ca6d01585
contract Horcrux {
  //01 0x8312c1d40a7417364d711fe93578dee347da4553106f2a0ac8563950
  struct Vault {
    bytes1 id;
    bytes28 sss;
  }

  mapping (uint256 => uint256) public index;


  // (to be validated)
  // using log instead memory to preserve gas cost 
  event HorcruxVault(uint block, uint horcrux);

  constructor() {
  }

  //
  // Source is the destination place of the Horcrux
  // Horcrux is the encrypted shamir secret part
  function create(uint256 source, uint horcrux ) external isWallet {
    require((index[source]) == 0 ,"Horcrux: this destination is not available"); // cost 47 gas
    index[(source)] = uint256(horcrux);
    // this is a silent action
    //emit HorcruxVault(block.number,horcrux);
  }

  //
  // The Seed and the Nonce are elements that becomes the destination place of the Horcrux
  function redeem(uint256 seed, uint256 nonce) external view isWallet returns(uint) {
    bytes32 hash = (keccak256(abi.encodePacked(seed,nonce)));
    uint256 source =uint256(keccak256(abi.encodePacked(hash)));
    return (index[source]);
  }

  //
  // fallback is mandatory to exec relayer
  fallback() external isWallet{   
  }  

  modifier isWallet() {
    uint x;
    // This opcode returns the size of the code on an address. If the size is larger than zero, the address is a contract
    // https://ethereum.stackexchange.com/questions/45095/how-could-msg-sender-tx-origin-and-extcodesizecaller-0-be-true/45111
    assembly { x := extcodesize(caller()) }
    require(x == 0);
    _;
  }
}

