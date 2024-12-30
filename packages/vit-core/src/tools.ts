import { ethers, keccak256, toBeHex, toUtf8Bytes, wordlists } from "ethers";

/**
 * Converts a string to a hidden HEX256 representation.
 *
 * @param string - The string to convert.
 * @returns The HEX256 representation of the string.
 */
export function textToHex(message: string) {
  let messageBytes = toUtf8Bytes(message);
  return keccak256(messageBytes);
}

/**
 * Converts a number to a hidden HEX256 representation.
 *
 * @param number - The number to convert.
 * @returns The HEX256 representation of the string.
 */
export function numberToKecc256(value: number) {
  let valueHex = toBeHex(value);
  return keccak256(valueHex);
}


/**
 * Converts a list of base 1024 indices in big endian order to an integer value.
 *
 * @param indices - An array of numbers representing the indices.
 * @param RADIX_BITS - The number of bits for the radix. Defaults to 10.
 * @returns The resulting BigInt value after combining the indices.
 */
function intFromIndices(indices:number[], RADIX_BITS:number = 10): Uint8Array {
  let value = BigInt(0);
  const radix = BigInt(Math.pow(2, RADIX_BITS));
  indices.forEach((index) => {
    value = value * radix + BigInt(index);
  });

  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }  
  return  ethers.getBytes('0x' +hex);
}


/**
 * Converts any mnemonic phrase into a byte array.
 *
 * @param phrase - The mnemonic phrase to convert.
 * @param defaultLang - The language of the mnemonic phrase (default is 'en').
 * @returns A Uint8Array representing the mnemonic phrase.
 * @throws Will throw an error if the specified language is not supported.
 * @throws Will throw an error if any word in the phrase is not in the BIP39 wordlist.
 */
export function nonStdMnemonicToBytes(phrase: string, defaultLang:string = 'en'): Uint8Array {
  // Décomposer la phrase en mots individuels
  const words = phrase.split(/[ ;\n,-]/).filter(word => word.length);

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

  return intFromIndices(indices, 10);
}


/**
 * Converts a byte array to a non standard mnemonic phrase using a specified language.
 *
 * @param bytes - The byte array to convert.
 * @param defaultLang - The language to use for the mnemonic phrase (default is 'en').
 * @returns The mnemonic phrase as a string.
 * @throws Will throw an error if the specified language is not supported.
 */
export function bytesToNonStdMenomnic(bytes: Uint8Array, defaultLang:string = 'en'): string {
  const radix = BigInt(1 << 10); // Base 1024 (2^10)
  const byte = BigInt(8);
  let value = BigInt(0);  

  // Convert bytes to a large BigInt (Big Endian)
  bytes.forEach((num) => {
    value = (value << byte) + BigInt(num); // Décalage de 8 bits pour chaque octet
  });

  // Get the BIP39 wordlist
  const wordlist = wordlists[defaultLang];
  if (!wordlist) {
    throw new Error(`The language '${defaultLang}' is not supported.`);
  }

  // Split the integer into digits in the specified base (base 1024 here)
  const indices: number[] = [];
  while (value > 0) {
    indices.unshift(Number(value % radix)); // Extract the least significant index
    value = value / radix; // Reduce the value
  }

  const mnemonic = indices.map((value) => {
    return wordlist.getWord(value)
  });
  return mnemonic.join(' ');
}


