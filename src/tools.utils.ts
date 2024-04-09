import { ethers } from "ethers";

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
