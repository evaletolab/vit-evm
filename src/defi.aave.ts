import { ethers } from "ethers";
import config from './tools.config';

/**
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
export async function aaveLendingPools(signer: ethers.Signer) {
  const aavePoolProviderAddress = config.option('aavePoolProviderAddress'); // Replace with the actual address of PoolAddressesProvider for Aave V3
  const aavePoolProviderABI = config.option('aavePoolProviderABI');

    // Create an instance of the PoolAddressesProvider contract with the signer
    const addressesProvider = new ethers.Contract(aavePoolProviderAddress, aavePoolProviderABI, signer);

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

    const pool = new ethers.Contract(poolAddress, poolABI, signer);

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
export async function aaveLendingProposals(signer: ethers.Signer, lendingPoolAddress: string) {
  const lendingPoolAbi = [
      'function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)'
  ];

  const usdcAddress = config.option('USDC_CONTRACT_ADDRESS');
  const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolAbi, signer);

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

export async function aaveDeposit(signer: ethers.Signer, amount: number): Promise<void> {
    try {
        // Convert the amount to deposit to Wei
        const depositAmountWei = ethers.utils.parseEther(amount.toString());

        // Approve the Aave contract to spend the aToken amount
        const approveAbi = [
            'function approve(address spender, uint256 amount)'
        ]
        const aToken = new ethers.Contract(config.option('aaveTokenAddress'), approveAbi, signer);
        await aToken.approve(config.option('aaveContractAddress'), depositAmountWei);

        // Deposit the tokens on Aave
        const depositAbi = [
          'function deposit(uint256 amount)'
        ]
        const aaveContract = new ethers.Contract(config.option('aaveContractAddress'), depositAbi, signer);
        await aaveContract.deposit(depositAmountWei);
    } catch (error) {
        console.error('Error while depositing:', error);
        throw error;
    }
}

export async function aaveDepositedAmount(signer: ethers.Signer): Promise<number> {
    try {
        const depositedAbi = ['function getDepositedAmount() view returns (uint256)'];
        const aaveContract = new ethers.Contract(config.option('aaveContractAddress'), depositedAbi, signer);
        const depositedAmountWei = await aaveContract.getDepositedAmount();
        return parseFloat(ethers.utils.formatEther(depositedAmountWei));
    } catch (error) {
        console.error('Error while retrieving deposited amount:', error);
        throw error;
    }
}

export async function aaveInterest(signer: ethers.Signer): Promise<number> {
    try {
        const interestAbi = ['function calculateInterest() view returns (uint256)'];
        const aaveContract = new ethers.Contract(config.option('aaveContractAddress'), interestAbi, signer);
        const interestWei = await aaveContract.calculateInterest();
        return parseFloat(ethers.utils.formatEther(interestWei));
    } catch (error) {
        console.error('Error while calculating interest:', error);
        throw error;
    }
}

