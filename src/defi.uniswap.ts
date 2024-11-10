import { ethers, parseUnits } from "ethers";
import {config} from './tools.config';

export interface SwapInput {
  amountIn: number;
  inAddress: string;
  ttl: number;
}

export const swap = async (input:SwapInput, outAddress:string, signer: ethers.Signer) => {
  try {
    // Adresses des contrats Uniswap v2 Router et Factory sur le réseau Ethereum
    const uniswapRouterAddress = config.option('uniswapRouterAddress');
    //const uniswapFactoryAddress = config.option('uniswapFactoryAddress');

    // ABI du contrat Uniswap v2 Router
    const uniswapRouterAbi = [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
    ];


    // Montant de USDC à échanger
    const amountIn = parseUnits(input.amountIn.toString(), 'ether'); // USDC amount to swap (in wei)

    // Créer une instance du contrat Uniswap v2 Router
    const uniswapRouter = new ethers.Contract(uniswapRouterAddress, uniswapRouterAbi, signer);

    // Adresses des tokens USDC et XCHF
    // Adresse du token USDC
    // Adresse du token XCHF
    // Chemin du swap (USDC -> XCHF)
    const path = [input.inAddress, outAddress];

    // Appeler la fonction getAmountsOut pour calculer le montant minimal de XCHF à recevoir
    const amounts = await uniswapRouter.getAmountsOut(amountIn, path);
    const amountOutMin = amounts[1]; // Le montant minimal de XCHF à recevoir est le deuxième élément du tableau

    // Appeler la fonction swapExactTokensForTokens pour effectuer le swap en utilisant le montant minimal calculé
    const tx = await uniswapRouter.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      signer.getAddress(),
      Math.floor(Date.now() / 1000) + (input.ttl||1800) // Date limite pour le swap (30 minutes)
    );

    console.log('Swap successful! Transaction hash:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error during swap:', error);
    throw error;
  }
};
