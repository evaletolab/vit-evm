import { Contract, formatEther, parseEther, Signer, ethers } from "ethers";
import {config} from './tools.config';

/**
 * Phase 2 (NOT MVP):
 * - Aave integration is kept for later, but ViT MVP Phase 1 focuses on ZCHF (Frankencoin) on Optimism
 *   and a simple “swap to ZCHF” flow.
 *
 * The purpose of this code is to interact with the Aave protocol, a decentralized lending platform
 * on the Ethereum blockchain. It provides functions to **deposit** funds into Aave, **retrieve** the
 * deposited amount, **calculate the interest** earned, and **obtain lending proposals** and details from
 * Aave V3. These functions are designed to be used with the Ethereum wallet and signer provided by
 * the ethers.js library. By using this code, you can easily manage your funds on Aave and explore
 * lending opportunities.
 */

// ABI of PoolAddressesProvider for Aave V3

//
// obtain lending proposals on Aave V3
export async function aaveLendingPools(signer: Signer) {
  const aavePoolProviderAddress = config.option('aavePoolProviderAddress'); // Replace with the actual address of PoolAddressesProvider for Aave V3
  const aavePoolProviderABI = config.option('aavePoolProviderABI');

    // Create an instance of the PoolAddressesProvider contract with the signer
    const addressesProvider = new Contract(aavePoolProviderAddress, aavePoolProviderABI, signer);

    // Get the address of the main Pool
    const poolAddress = await addressesProvider.getPool();

    // poolABI
    // "name": "getReservesList",
    // "outputs": [
    //   {
    //     "internalType": "address[]",
    //     "name": "",
    //     "type": "address[]"
    //   }
    // ],    
    // Create an instance of the Pool contract with the signer
    const poolABI:string[] = []; // ABI of Pool

    const pool = new Contract(poolAddress, poolABI, signer);

    // Get the list of active reserves
    const reservesList = await pool.getReservesList();
    console.log('Reserves List:', reservesList);

    // Optional: Iterate over the reserves list to retrieve additional information
    for (const reserveAddress of reservesList) {
        console.log(`Reserve Address: ${reserveAddress}`);
        // Here, you can add additional calls to retrieve and display specific data for each reserve
    }
}

//
// obtain lending details on Aave V3
export async function aaveLendingProposals(signer: Signer, lendingPoolAddress: string) {
  const lendingPoolAbi = [
      'function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)'
  ];

  const usdcAddress = config.option('USDC_CONTRACT_ADDRESS');
  const lendingPoolContract = new Contract(lendingPoolAddress, lendingPoolAbi, signer);

  try {
      const reserveData = await lendingPoolContract.getReserveData(usdcAddress);
      console.log('Reserve Data for USDC:', reserveData);

      // Convertir les taux d'intérêt de ray à pourcentage
      const liquidityRatePercent = (reserveData.liquidityRate / 1e27) * 100;
      const stableBorrowRatePercent = (reserveData.stableBorrowRate / 1e27) * 100;
      const variableBorrowRatePercent = (reserveData.variableBorrowRate / 1e27) * 100;

      console.log(`Liquidity Rate: ${liquidityRatePercent}%`);
      console.log(`Stable Borrow Rate: ${stableBorrowRatePercent}%`);
      console.log(`Variable Borrow Rate: ${variableBorrowRatePercent}%`);
  } catch (error) {
      console.error('Error fetching lending proposals:', error);
  }
}

export async function aaveDeposit(signer: Signer, amount: number): Promise<void> {
    try {
        // Convert the amount to deposit to Wei
        const depositAmountWei = parseEther(amount.toString());

        // Approve the Aave contract to spend the aToken amount
        const approveAbi = [
            'function approve(address spender, uint256 amount)'
        ]
        const aToken = new Contract(config.option('aaveTokenAddress'), approveAbi, signer);
        await aToken.approve(config.option('aaveContractAddress'), depositAmountWei);

        // Deposit the tokens on Aave
        const depositAbi = [
          'function deposit(uint256 amount)'
        ]
        const aaveContract = new Contract(config.option('aaveContractAddress'), depositAbi, signer);
        await aaveContract.deposit(depositAmountWei);
    } catch (error) {
        console.error('Error while depositing:', error);
        throw error;
    }
}

export async function aaveDepositedAmount(signer: Signer): Promise<number> {
    try {
        const depositedAbi = ['function getDepositedAmount() view returns (uint256)'];
        const aaveContract = new Contract(config.option('aaveContractAddress'), depositedAbi, signer);
        const depositedAmountWei = await aaveContract.getDepositedAmount();
        return parseFloat(formatEther(depositedAmountWei));
    } catch (error) {
        console.error('Error while retrieving deposited amount:', error);
        throw error;
    }
}

export async function aaveInterest(signer: Signer): Promise<number> {
    try {
        const interestAbi = ['function calculateInterest() view returns (uint256)'];
        const aaveContract = new Contract(config.option('aaveContractAddress'), interestAbi, signer);
        const interestWei = await aaveContract.calculateInterest();
        return parseFloat(formatEther(interestWei));
    } catch (error) {
        console.error('Error while calculating interest:', error);
        throw error;
    }
}

// 4337 userOp calldata builders for Aave v3 Pool
export interface AaveSupplyParams {
  pool: string;
  asset: string;
  amount: bigint;
  onBehalfOf: string;
  referralCode?: number; // default 0
}

export function encodeAaveSupply(p: AaveSupplyParams): { to: string; data: string } {
  const iface = new ethers.Interface([
    'function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)'
  ]);
  const data = iface.encodeFunctionData('supply', [p.asset, p.amount, p.onBehalfOf, p.referralCode ?? 0]);
  return { to: p.pool, data };
}

export interface AaveWithdrawParams {
  pool: string;
  asset: string;
  amount: bigint; // use max uint for full withdraw in real impl
  to: string;
}

export function encodeAaveWithdraw(p: AaveWithdrawParams): { to: string; data: string } {
  const iface = new ethers.Interface([
    'function withdraw(address asset,uint256 amount,address to) returns (uint256)'
  ]);
  const data = iface.encodeFunctionData('withdraw', [p.asset, p.amount, p.to]);
  return { to: p.pool, data };
}

