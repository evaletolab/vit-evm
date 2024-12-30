import { ethers, randomBytes, toBeHex } from 'ethers';
import { PBKDF2 } from './core.pbkdf2';
const salt = ethers.toUtf8Bytes('kng2-fixed-salt-0E0E');


export enum POWforce {
  LOW = 1,
  MEDIUM = 6,
  HIGH = 8
}

/**
 * Generates a proof of work for a given string and difficulty.
 * 
 * @param {string} string - The input string to generate work for.
 * @param {bigint} [difficulty] - The difficulty level for the proof of work. Defaults to 0x7ff if not provided.
 * @returns {Promise<[string, string, number]>} - A promise that resolves to a tuple containing the work in hex format, the index in hex format, and the average difficulty as a number.
 */
export async function requiresWork(
  input: string, force:POWforce = POWforce.MEDIUM
): Promise<[string, string]> {
  // Ajustez ce facteur selon la performance voulue (10 => ~100ms, 20 => ~200ms, etc.)
  const difficulty = 150_000 * force;

  
  // Génère un nonce aléatoire (8 octets).
  const nonce = ethers.hexlify(randomBytes(8));
  const compound = ethers.toUtf8Bytes(input + nonce);

  // Calcule la "preuve de travail"
  const workBytes = await PBKDF2(compound, salt, difficulty);
  const hash = ethers.hexlify(workBytes);

  return [hash, nonce];
}

export async function proofOfWork(input: string, hash: string, nonce: string, force:POWforce = POWforce.MEDIUM) {
  const difficulty = 150_000 * force;
  const compound = ethers.toUtf8Bytes(input + nonce);
  const workBytes = await PBKDF2(compound, salt,difficulty);
  const pow = ethers.hexlify(workBytes);
  return ((hash) == (pow));
}