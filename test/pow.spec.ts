import { expect } from 'chai'
import { proofOfWork, requiresWork } from '../../src/lib/POW'
import { BigNumber } from 'ethers';

describe('POW', () => {
  const difficulty = BigNumber.from('0x7ffff');
  it('generate pow from medium string', async () => {
    const msg = 'new message as pow seed';
    const work = requiresWork(msg,difficulty);
    expect(work).to.exist;

    const exist = proofOfWork(msg,work[0],work[1]);
    expect(exist).to.be.true;
    
  })
})
