import { ethers } from 'ethers';

function keyNumberAt(key:string, i:number) {
  return parseInt(key[Math.floor(i % key.length)]);
}

export function xor_shuffle(data:Uint8Array, key:Uint8Array) :Uint8Array {
  // convert key to a string
  const keyString = ethers.utils.toUtf8String(key);
  const h256 = (ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [keyString])));

  return data.map((digit, i) => {
    return (digit ^ keyNumberAt(h256, i));
  });
}

export function  xor_deshuffle(data:Uint8Array, key:Uint8Array) :Uint8Array {    
  // convert key to a string
  const keyString = ethers.utils.toUtf8String(key);
  const h256 = (ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [keyString])));
  return data.map((digit, i) => {
    return ( digit ^ keyNumberAt(h256, i) );
  });
}
