import { BigNumber, ethers } from "ethers";
import { textToHex } from "./tools";


export function identity(username: string, difficulty: number = 0.1) {
  const uid = textToHex(username);
  const nonce = requiresWork(uid, BigNumber.from(difficulty));
  return { uid, nonce };
}

export function auth(username: string, password: string) {
  const { uid } = identity(username);
  const secret = textToHex(password);
  return  ethers.utils.keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[uid,secret]));
}


export function randomDigits(count:number = 1) {
  const digits = 4;
  const codes = [];
  const min = Math.pow(10, digits - 1);  // 1000 pour 4 chiffres
  const max = Math.pow(10, digits) - 1;  // 9999 pour 4 chiffres

  for (let i = 0; i < count; i++) {
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      
      // Générer un nombre dans la plage désirée et l'ajouter à la liste
      const code = min + (randomArray[0] % (max - min + 1));
      codes.push(code.toString().padStart(digits, '0'));  // Assure que le code est bien sur 4 chiffres
  }

  return codes;
}
