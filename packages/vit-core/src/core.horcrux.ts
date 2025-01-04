import { AbiCoder, Contract, getBytes, hexlify, keccak256 } from "ethers";
import { xor_shuffle, xor_deshuffle } from "./core.XOR";
import { POWforce } from "./core.POW";

export async function publish(uid:string,nonce:string, share:string, options:any) {
  try{
    // await this.initMetamask();

    //
    // init contract state
    const privateKey =  keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[uid,nonce]));
    const hash = keccak256(privateKey);

    //
    // simple mixer
    console.log('--- DEBUG share',share);
    let bytes = xor_shuffle(
      getBytes('0x'+share),
      getBytes(privateKey.substring(0,16))
    );
    const mixed = hexlify(bytes);
    console.log('--- DEBUG mixed',mixed);
    
    // load Horcrux Contract
    const horcrux = new Contract(options.address,options.abi,options.signer);

    console.log('---- DEBUG create',hash,mixed);
    const tx = await horcrux.create(hash,mixed);

    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // await this.metamaskdisconnect();
  }catch(err: any) {    
    console.debug(err);
    throw (err);
  }
}

//
// uid = strToHex(this.username+""+this.password);
// nonce = requiresWork(uid,POWforce.HIGH)[1];
export async function restore(uid:string,nonce:string, options:any) {

  try{
    // await this.initMetamask();
    console.log('--- DEBUG',uid,nonce);

    //
    // init contract state
    const privateKey =  keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','uint256'],[uid,nonce]));

    const horcrux = new Contract(options.address,options.abiRedeem,options.signer);

    const result = (await horcrux.redeem(uid,nonce)).toHexString();

    const mixed = getBytes(result);
    let share;

    if (mixed[0] == 0){
      throw new Error("Not available");
    }
    //
    // simple demixer
    const bytes = xor_deshuffle(
      mixed,
      getBytes(privateKey.substring(0,16))
    );
    // share = hexlify(bytes).replace('0x','8');
    return hexlify(bytes);
  }catch(err) {
    console.log('--- DEBUG restore',err);
  }
  
}