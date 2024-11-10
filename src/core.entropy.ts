import { toUtf8Bytes, wordlists, Mnemonic, hexlify, randomBytes  } from "ethers";


//
// Converts a list of base 1024 indices in big endian order to an integer value.
//
function intFromIndices(indices:number[], RADIX_BITS:number = 10): BigInt {
  let value = BigInt(0);
  const radix = BigInt(Math.pow(2, RADIX_BITS));
  indices.forEach((index) => {
    value = value * radix + BigInt(index);
  });

  return value;
}


export function phraseToHex(phrase: string, defaultLang:string = 'en') {

    // Décomposer la phrase en mots individuels
    const words = phrase.split(' ');

    // Obtenir la liste des mots BIP39
    const wordlist = wordlists[defaultLang];
    if(!wordlist){
      throw new Error(`La langue '${defaultLang}' n'est pas supportée.`);
    }

    // Récupérer l'indice de chaque mot
    const indices = words.map(word => {
      const index = wordlist.getWordIndex(word);
      if (index === -1) {
        throw new Error(`Le mot '${word}' n'est pas dans la liste BIP39.`);
      }
      return index;
    });

    const strEntropy = intFromIndices(indices, 10).toString(16);

  return strEntropy;
}

export function retrieveEntropy(mnemonic: string, defaultLang:string = 'en') {
  const strEntropy = Mnemonic.phraseToEntropy(mnemonic, wordlists[defaultLang]);
  return toUtf8Bytes(strEntropy);
}


export function createMnemonic(entropy: Uint8Array, size: number = 16, defaultLang:string = 'en') {
  // https://docs.ethers.io/v5/api/utils/hdnode/#Mnemonic
  // https://github.com/ethers-io/ethers.js/issues/34
  const sizedEntropy = entropy.slice(0, size);
  const mnemonic = Mnemonic.entropyToPhrase(hexlify(sizedEntropy), wordlists[defaultLang])
  return mnemonic;
}

export function isValidMnemonic(mnemonic: string, defaultLang:string = 'en') {
  return Mnemonic.isValidMnemonic(mnemonic, wordlists[defaultLang]);
}

export function isValidPrivateKey(pKey: string) {
  const hex32 = (typeof (pKey) === "string" && pKey.match(/^(0x)?[0-9a-f]{64}$/i));
  return hex32;
}

// DEPRECATED
// export async function mnemonicToSeed(mnemonic: string) {
//   return Mnemonic.fromPhrase(mnemonic);
// }


export function randomDigits(count:number, seed?:Uint8Array) {
  const digits = 4;
  const codes = [];
  const min = Math.pow(10, digits - 1);  // 1000 pour 4 chiffres
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
