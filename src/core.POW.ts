import { BigNumber, ethers } from 'ethers';


export function requiresWork(string: string, probability: BigNumber) {
  const maxUint256 = BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  // Use the probability as a threshold in the interval [0, 2^256)
  const target = maxUint256.mul(probability).div(100); 

  for (let index = 0;; index++) {
    const work = BigNumber.from(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint', 'uint'], [string, index])));

    if (work.lte(target)) {
      return [work.toHexString(), '0x' + index.toString(16)];
    }
  }
}


export function proofOfWork(string: string, hash: string, nonce: string) {
  const pow = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint','uint'],[string,nonce]));
  return (BigNumber.from(hash).eq(pow));
}