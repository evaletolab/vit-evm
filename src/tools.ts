import { ethers } from "ethers";
import SessionKeystore from 'session-keystore'

/**
 * Converts a string to a HEX256 representation.
 *
 * @param string - The string to convert.
 * @returns The HEX256 representation of the string.
 */
export function strHEX256(string: string) {
  return ethers.utils.id(string);
}

/**
 * Converts a number to a HEX256 representation.
 *
 * @param number - The number to convert.
 * @returns The HEX256 representation of the string.
 */
export function pinToHEX256(value: number) {
  return ethers.utils.sha256(ethers.utils.hexlify(value));
}

//
// Secure cryptographic Memory Storage (K|V) for browsers or Node.js
// https://github.com/47ng/session-keystore
export function memorySession(name:string) {
  const store = new SessionKeystore({ name })
  return store;
}



