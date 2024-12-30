import { toUtf8Bytes, wordlists, Mnemonic, hexlify, randomBytes  } from "ethers";


export function retrieveEntropy(mnemonic: string, defaultLang:string = 'en') {
  const strEntropy = Mnemonic.phraseToEntropy(mnemonic, wordlists[defaultLang]);
  return toUtf8Bytes(strEntropy);
}


export function createMnemonic(entropy: Uint8Array, size: number = 16, defaultLang:string = 'en') {
  // https://docs.ethers.io/v5/api/utils/hdnode/#Mnemonic
  // https://github.com/ethers-io/ethers.js/issues/34
  const sizedEntropy = entropy.slice(0, size);
  const mnemonic = Mnemonic.entropyToPhrase((sizedEntropy), wordlists[defaultLang])
  return mnemonic;
}

export function isValidMnemonic(mnemonic: string, defaultLang:string = 'en') {
  return Mnemonic.isValidMnemonic(mnemonic, wordlists[defaultLang]);
}



/**
 * Generates an array of random groupes of 4 digits strings of a specified length.
 *
 * @param count - The number of random digit strings to generate.
 * @param seed - An optional Uint8Array to seed the random number generator.
 *               If provided, its length must match the count parameter.
 * @returns An array of random digit strings, each of the specified length.
 * @throws {Error} If the length of the seed does not match the count parameter.
 * 
 * @example  1234-5678-0000-9999
 * 
 */
export function randomDigits(count:number, seed?:Uint8Array) {
  const digits = 4;
  const codes = [];
  const min = 0; 
  const max = Math.pow(10, digits) - 1;  // 9999 pour 4 chiffres
  const buffer32 = seed ? uint8to32(seed): Uint32Array.from(uint8to32(randomBytes(count*4)));
    
  if(buffer32.length !== (count)){
    throw new Error(`Invalid seed length: ${buffer32.length} of ${count}`);
  }

  for (let i = 0; i < count; i++) {
      const randomArray = buffer32.subarray(i, i+1);
      
      // Générer un nombre dans la plage désirée et l'ajouter à la liste
      const code = min + (randomArray[0] % (max - min + 1));
      codes.push(code.toString().padStart(digits, '0'));  // Assure que le code est bien sur 4 chiffres
  }

  return codes;
}


/**
 * Converter used by randomDigits 
 *
 * @param uint8Array - The Uint8Array to convert.
 * @returns The converted Uint32Array.
 */
function uint8to32(uint8Array: Uint8Array): Uint32Array {
  // Ajouter du padding si nécessaire pour que la longueur soit un multiple de 4
  const paddingLength = (4 - (uint8Array.length % 4)) % 4;
  const paddedArray = new Uint8Array(uint8Array.length + paddingLength);
  paddedArray.set(uint8Array);

  // Convertir le tableau Uint8Array en une chaîne hexadécimale
  const hex = hexlify(paddedArray);
  const uint32Array = new Uint32Array(paddedArray.length / 4);

  // Découper la chaîne hexadécimale par blocs de 8 caractères (32 bits) et les convertir
  for (let i = 0; i < hex.length; i += 8) {
    uint32Array[i / 8] = parseInt(hex.slice(i, i + 8), 16);
  }

  return uint32Array;
}
