//
// create a Rocket Pool functions for stacking, unstaking, and claiming rewards
import { ethers } from 'ethers';
import config from './tools.config';


export async function rocketPoolStake(signer: ethers.Signer, amount: number): Promise<void> {
  try {
    const rplTokenAddress = config.option('RPL_CONTRACT_ADDRESS');
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');

    // Convert the amount to stake to Wei
    const stakeAmountWei = ethers.utils.parseEther(amount.toString());
    const approveAbi = ['function approve(address spender, uint256 amount)'];

    // Approve the Rocket Pool contract to spend the RPL amount
    const rplToken = new ethers.Contract(rplTokenAddress, approveAbi, signer);
    await rplToken.approve(rocketPoolContractAddress, stakeAmountWei);

    // Stake the tokens on Rocket Pool
    const rocketPoolContract = new ethers.Contract(rocketPoolContractAddress, ['function stake(uint256 amount)'], signer);
    await rocketPoolContract.stake(stakeAmountWei);
  } catch (error) {
    console.error('Error while staking:', error);
    throw error;
  }
}

export async function rocketPoolStakedAmount(signer: ethers.Signer): Promise<number> {
  try {
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');
    const stackedAbi = ['function getStakedAmount() view returns (uint256)'];
    const rocketPoolContract = new ethers.Contract(rocketPoolContractAddress, stackedAbi, signer);
    const stakedAmountWei = await rocketPoolContract.getStakedAmount();
    return parseFloat(ethers.utils.formatEther(stakedAmountWei));
  } catch (error) {
    console.error('Error while retrieving staked amount:', error);
    throw error;
  }
}

export async function rocketPoolInterest(signer: ethers.Signer): Promise<number> {
  try {
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');
    const interestAbi = ['function calculateInterest() view returns (uint256)'];
    const rocketPoolContract = new ethers.Contract(rocketPoolContractAddress, interestAbi, signer);
    const interestWei = await rocketPoolContract.calculateInterest();
    return parseFloat(ethers.utils.formatEther(interestWei));
  } catch (error) {
    console.error('Error while calculating interest:', error);
    throw error;
  }
}
