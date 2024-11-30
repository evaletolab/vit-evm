//
// create a Rocket Pool functions for stacking, unstaking, and claiming rewards
import { Contract,  formatEther, parseEther, Signer } from 'ethers';
import {config} from './tools.config';


export async function rocketPoolStake(signer: Signer, amount: number): Promise<void> {
  try {
    const rplTokenAddress = config.option('RPL_CONTRACT_ADDRESS');
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');

    // Convert the amount to stake to Wei
    const stakeAmountWei = parseEther(amount.toString());
    const approveAbi = ['function approve(address spender, uint256 amount)'];

    // Approve the Rocket Pool contract to spend the RPL amount
    const rplToken = new Contract(rplTokenAddress, approveAbi, signer);
    await rplToken.approve(rocketPoolContractAddress, stakeAmountWei);

    // Stake the tokens on Rocket Pool
    const rocketPoolContract = new Contract(rocketPoolContractAddress, ['function stake(uint256 amount)'], signer);
    await rocketPoolContract.stake(stakeAmountWei);
  } catch (error) {
    console.error('Error while staking:', error);
    throw error;
  }
}

export async function rocketPoolStakedAmount(signer: Signer): Promise<number> {
  try {
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');
    const stackedAbi = ['function getStakedAmount() view returns (uint256)'];
    const rocketPoolContract = new Contract(rocketPoolContractAddress, stackedAbi, signer);
    const stakedAmountWei = await rocketPoolContract.getStakedAmount();
    return parseFloat(formatEther(stakedAmountWei));
  } catch (error) {
    console.error('Error while retrieving staked amount:', error);
    throw error;
  }
}

export async function rocketPoolInterest(signer: Signer): Promise<number> {
  try {
    const rocketPoolContractAddress = config.option('rocketPoolContractAddress');
    const interestAbi = ['function calculateInterest() view returns (uint256)'];
    const rocketPoolContract = new Contract(rocketPoolContractAddress, interestAbi, signer);
    const interestWei = await rocketPoolContract.calculateInterest();
    return parseFloat(formatEther(interestWei));
  } catch (error) {
    console.error('Error while calculating interest:', error);
    throw error;
  }
}
