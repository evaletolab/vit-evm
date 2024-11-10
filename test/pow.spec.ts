import { expect } from 'chai'
import { proofOfWork, requiresWork } from '../dist/core.POW';

describe('POW (based on PBKDF2)', function() {
  const msg = 'new message as pow seed 2';
  this.timeout(10000);

  it('should return an array with two hex strings (difficulty = 0x7fn)', async () => {
    const result = await requiresWork('test', 0x7fn);
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(3);
    expect(result[0]).to.match(/^0x[a-fA-F0-9]{64}$/);
    expect(result[1]).to.match(/^0x[a-fA-F0-9]*$/);
  });

  it('fast POW from lg[buffer] (difficulty = 0x7ffn)', async function() {
    const msg = '--import data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));';
    const work = await requiresWork(msg,0x7ffn);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);
    const exist = await proofOfWork(msg,work[0],work[1]);
    expect(exist).to.be.true;    
  })

  it('fast POW from sm[buffer] (difficulty = 0x7ffn)', async function() {
    const work = await requiresWork(msg,0x7ffn);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);
    const exist = await proofOfWork(msg,work[0],work[1]);
    expect(exist).to.be.true;    
  })

  it('medi POW from sm[buffer] (difficulty = 0x7fffn)', async function() {
    const work = await requiresWork(msg,0x7fffn);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);
  });


  it('slow POW from sm[buffer] (difficulty = 0x7ffffn)', async function() {
    const work = await requiresWork(msg,0x7ffffn);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);
  });


  it('slow POW from lg[buffer] (difficulty = 0x7ffffn)', async function() {
    const msg = '--import data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));';
    const work = await requiresWork(msg,0x7ffffn);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);
  });

})
