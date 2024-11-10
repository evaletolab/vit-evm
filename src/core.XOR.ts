import { AbiCoder, keccak256, toUtf8String } from 'ethers';

function keyNumberAt(key:string, i:number) {
  return parseInt(key[Math.floor(i % key.length)]);
}

export function xor_shuffle(data:Uint8Array, key:Uint8Array) :Uint8Array {
  // convert key to a string
  const h256 = (keccak256(key));

  return data.map((digit, i) => {
    return (digit ^ keyNumberAt(h256, i));
  });
}

export function  xor_deshuffle(data:Uint8Array, key:Uint8Array) :Uint8Array {    
  // convert key to a string
  const keyString = toUtf8String(key);
  const h256 = (keccak256(key));
  return data.map((digit, i) => {
    return ( digit ^ keyNumberAt(h256, i) );
  });
}
