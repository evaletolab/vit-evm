import { PBKDF2 } from './core.pbkdf2';
const salt = 'kng2-fixed-salt';


/**
 * Generates a proof of work for a given string and difficulty.
 * 
 * @param {string} string - The input string to generate work for.
 * @param {bigint} [difficulty] - The difficulty level for the proof of work. Defaults to 0x7ff if not provided.
 * @returns {Promise<[string, string, number]>} - A promise that resolves to a tuple containing the work in hex format, the index in hex format, and the average difficulty as a number.
 */
export async function  requiresWork(string: string, difficulty?: bigint): Promise<[string, string,number]> {
  difficulty = difficulty || BigInt(0x7ff); // default difficulty
  let avg_difficulty = difficulty;
  const threshold = difficulty / 2n;
  for (let index = 0;; index++) {
    const workBytes = await PBKDF2(string + index, salt);
    const work = BigInt('0x' + Buffer.from(workBytes).toString('hex'));
    avg_difficulty = (avg_difficulty/2n) + (work % difficulty)/ 2n;
    if ((avg_difficulty) < (threshold)) {
    //console.log('work', work.toString(16), 'target', avg_difficulty.toString(10),avg_difficulty.toString(16));
    return ['0x' + work.toString(16), '0x' + index.toString(16), Number(avg_difficulty)];
    }
  }
}


export async function proofOfWork(string: string, hash: string, nonce: string) {
  const workBytes = await PBKDF2(string + BigInt(nonce).toString(10), salt);
  const pow = BigInt('0x' + Buffer.from(workBytes).toString('hex'));
  return (BigInt(hash) == (pow));
}