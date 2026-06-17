require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

const OP_SEPOLIA_RPC_URL =
  process.env.OP_SEPOLIA_RPC_URL || "https://sepolia.optimism.io";
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    opSepolia: {
      url: OP_SEPOLIA_RPC_URL,
      chainId: 11155420,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
