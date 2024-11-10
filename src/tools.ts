import { keccak256, toBeHex, toUtf8Bytes } from "ethers";
import SessionKeystore from 'session-keystore'

/**
 * Converts a string to a HEX256 representation.
 *
 * @param string - The string to convert.
 * @returns The HEX256 representation of the string.
 */
export function strToHex(message: string) {
  let messageBytes = toUtf8Bytes(message);
  return keccak256(messageBytes);
}

/**
 * Converts a number to a HEX256 representation.
 *
 * @param number - The number to convert.
 * @returns The HEX256 representation of the string.
 */
export function numberToKecc256(value: number) {
  let valueHex = toBeHex(value);
  return keccak256(valueHex);
}

//
// Secure cryptographic Memory Storage (K|V) for browsers or Node.js
// https://github.com/47ng/session-keystore
export function memorySession(name:string) {
  const store = new SessionKeystore({ name })
  return store;
}



