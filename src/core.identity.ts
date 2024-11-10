import { keccak256, AbiCoder } from "ethers";
import { requiresWork } from "./core.POW";
import { strToHex } from "./tools";


/**
 * Generates an identity object for a given username.
 *
 * This function converts the provided username to a hexadecimal string,
 * determines the required work for the generated UID, and then computes
 * a unique identifier using the keccak256 hash function.
 *
 * @param {string} username - The username to generate an identity for.
 * @returns {Promise<{ id: string, uid: string, work: string }>} A promise that resolves to an object containing:
 * - `private`: The private representation of the unique identifier (mixing SHA with POW).
 * - `public`: The public unique identifier SHA(private).
 */
export async function identity(username: string) {
  const id = strToHex(username);
  const work = await requiresWork(id);
  const priv = keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[id,work[0]]));
  const pub = keccak256(AbiCoder.defaultAbiCoder().encode(['uint256'],[priv]));
  return { priv,pub};
}

/**
 * Authenticates a user by their username and password.
 *
 * This function retrieves the user and password identities, then encodes and hashes them
 * using the keccak256 algorithm.
 *
 * @param {string} username - The username.
 * @param {string} password - The password.
 * @returns {Promise<string>} A promise that resolves to the keccak256 hash of the encoded user and password identities.
 */
export async function auth(username: string, password: string) {
  const user = await identity(username);
  const pass = await identity(password);
  const priv = keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[user.priv,pass.priv]));
  const pub = keccak256(AbiCoder.defaultAbiCoder().encode(['uint256'],[priv]));
  return {priv,pub};
}

