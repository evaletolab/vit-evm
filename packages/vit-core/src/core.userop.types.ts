export interface UserOperation {
  sender: string;
  nonce?: string;
  initCode?: string;
  callData: string;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  paymasterAndData?: string;
  signature?: string;
}

export interface SponsorResponse {
  paymasterAndData: string;
  preVerificationGas?: string;
  verificationGasLimit?: string;
  callGasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}


