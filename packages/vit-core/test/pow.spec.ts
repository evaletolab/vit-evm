import { describe, it, expect, beforeEach } from 'vitest'
import { POWforce, proofOfWork, requiresWork } from '../dist/core.POW';

describe('POW (based on PBKDF2)', () => {
  const msg = 'new message as pow seed 2';
  // vitest timeout handled per test via options if needed
  it('fast POW from lg[buffer] (difficulty = LOW ~150ms)', async function() {
    const msg = '--import data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));';
    const work = await requiresWork(msg, POWforce.LOW);
    expect(work).to.exist;
    // console.log('work (hash, index, avg-difficulty)',work);
    const exist = await proofOfWork(msg,work[0],work[1],POWforce.LOW);
    expect(exist).to.be.true;    
  })

  it('should return an array with two hex strings (difficulty = MEDIUM ~500ms)', async () => {
    const result = await requiresWork('test');
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(2);
    expect(result[0]).to.match(/^0x[a-fA-F0-9]{64}$/);
    expect(result[1]).to.match(/^0x[a-fA-F0-9]*$/);
  });

  it('fast POW from sm[buffer] (difficulty = HIGH ~1000ms)', async function() {
    const work = await requiresWork(msg, POWforce.HIGH);
    expect(work).to.exist;
    //console.log('work (hash, index, avg-difficulty)',work);    
    const exist = await proofOfWork(msg,work[0],work[1], POWforce.HIGH);
    expect(exist).to.be.true;    
  })


})
