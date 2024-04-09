import { expect } from 'chai'
import { BigNumber } from 'ethers/utils';
import { base64 } from 'ethers/utils';

//
// FIXME: missing node randomNumbers, throw on init
// import * as secret from 'secrets.js-34r7h';

describe('Shamir (SSS)', () => {
  const difficulty = new BigNumber('0x7ffff');
  it('decode our SSS from http://passguardian.com/', () => {
    const entropy = 'cf27a3060af7f0d1a6203d98d019d4fd91ece5de';
    const b64 = base64.encode('0x'+entropy);
    const src = base64.decode(b64);

    const shares =[
      '801efa3b8c64bc31dd255ff69f597ac3ec90b638e858042503b5dc03104066bf51cbcb94b82b3dffd6bb8aced6a26233d78bb053f766c5f92a0f42e60e693b7bcd89edd2a73e51a6d4105b1f6b47a732669b8',
      '8032ef81f5715584d6b351c7d026ee920466fa5479251c6984d2f5d210c68bd622411d6ad9bba7cd2bdb3e94abe0e652b88120f239a7ce1cbfdcd72ce3764c41b75df7a1295522ed1c3cdce69c1ea95a6bb13'
    ];
    const decripted = '0x6fa3b8c64bc31dd255ff69f597ac3ec90b638e858042503b5dc03104066bf51cbcb94b82b3dffd6bb8aced6a26233d78bb053f766c5f92a0f42e60e693b7bcd89edd2a73e51a6d4105b1f6b47a732669b8';

    //
    // missing node randomNumbers
    //const result = secret.combine(shares);
    console.log('----',b64,(new BigNumber(src)).toHexString())
    //expect(result).to.exist;
    
  })
})
