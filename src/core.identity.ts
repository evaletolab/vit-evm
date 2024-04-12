import { BigNumber, ethers } from "ethers";
import { requiresWork } from "./core.POW";
import { strHEX256 } from "./tools.utils";


export function identity(username: string, difficulty: number = 0.1) {
  const uid = strHEX256(username);
  const nonce = requiresWork(uid, BigNumber.from(difficulty));
  return { uid, nonce };
}

export function auth(username: string, password: string) {
  const { uid } = identity(username);
  const secret = strHEX256(password);
  return  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint256','uint256'],[uid,secret]));
}