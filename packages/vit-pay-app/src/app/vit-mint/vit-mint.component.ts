import { Component, Input, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import {
  SafeAccountV0_3_0 as SafeAccount,
  getFunctionSelector,
  createCallData,
  MetaTransaction,
  WebauthnDummySignerSignaturePair,
  CandidePaymaster,
} from 'abstractionkit';

import { PasskeyLocalStorageFormat } from '../../lib/passkeys';
import { signAndSendUserOp } from '../../lib/userOp';
import { getItem } from '../../lib/storage';
import { environment } from '../../environments/environment';

const { jsonRpcProvider, bundlerUrl, paymasterUrl, chainId } = environment;

@Component({
  selector: 'vit-mint',
  templateUrl: './vit-mint.component.html',
  styleUrls: ['./vit-mint.component.scss']
})
export class VitMintComponent implements OnInit {
  @Input() passkey!: PasskeyLocalStorageFormat;

  userOpHash?: string;
  deployed = false;
  loadingTx = false;
  error?: string;
  txHash?: string;
  chainName = environment.chainName;
  gasSponsor?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };

  accountAddress: string = getItem('accountAddress') as string;
  provider = new ethers.JsonRpcProvider(jsonRpcProvider);

  ngOnInit() {
    if (this.accountAddress) {
      this.isDeployed();
    }
  }

  async isDeployed() {
    const safeCode = await this.provider.getCode(this.accountAddress);
    this.deployed = safeCode !== '0x';
  }

  async handleMintNFT() {
    this.loadingTx = true;
    this.txHash = undefined;
    this.error = undefined;

    const nftContractAddress = '0x9a7af758aE5d7B6aAE84fe4C5Ba67c041dFE5336';
    const mintFunctionSignature = 'mint(address)';
    const mintFunctionSelector = getFunctionSelector(mintFunctionSignature);
    const mintTransactionCallData = createCallData(mintFunctionSelector, ['address'], [this.accountAddress]);

    const mintTransaction: MetaTransaction = {
      to: nftContractAddress,
      value: BigInt(0),
      data: mintTransactionCallData,
    };

    const safeAccount = SafeAccount.initializeNewAccount([this.passkey.pubkeyCoordinates]);

    try {
      let userOperation = await safeAccount.createUserOperation(
        [mintTransaction],
        jsonRpcProvider,
        bundlerUrl,
        {
          dummySignerSignaturePairs: [WebauthnDummySignerSignaturePair],
          preVerificationGasPercentageMultiplier: 120,
          verificationGasLimitPercentageMultiplier: 120,
        }
      );

      const paymaster = new CandidePaymaster(paymasterUrl);
      const { userOperation: userOperationSponsored, sponsorMetadata } = await paymaster.createSponsorPaymasterUserOperation(
        safeAccount,
        userOperation,
        bundlerUrl
      );
      this.gasSponsor = sponsorMetadata;
      userOperation = userOperationSponsored;

      const bundlerResponse = await signAndSendUserOp(
        safeAccount,
        userOperation,
        this.passkey,
        chainId
      );

      this.userOpHash = bundlerResponse.userOperationHash;
      const userOperationReceiptResult = await bundlerResponse.included();

      if (!userOperationReceiptResult) {
        this.error = 'Useroperation receipt unavailable';
      } else if (userOperationReceiptResult.success) {
        this.txHash = userOperationReceiptResult.receipt.transactionHash;
        console.log('One NFT was minted. The transaction hash is : ' + this.txHash);
        this.userOpHash = undefined;
      } else {
        this.error = 'Useroperation execution failed';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(this.error);
    } finally {
      this.loadingTx = false;
    }
  }
}
