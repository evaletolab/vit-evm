// FILEPATH: /home/evaleto/nodejs/karibou.ch/karibou-web3/test/tools.utils.spec.ts

import { expect } from 'chai';
import { ethers } from 'ethers';
import { pinToHEX256 } from '../src/tools.utils';

describe('tools.HEX256', () => {
  describe('pinToHEX256', () => {
    it('should return a valid hex string', () => {
      const value = 12345;
      const result = pinToHEX256(value);
      expect(result).to.be.a('string');
      expect(result).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should return the correct hex string for a given input', () => {
      const value = 12345;
      const result = pinToHEX256(value);
      const expected = ethers.utils.sha256(ethers.utils.hexlify(value));
      expect(result).to.equal(expected);
    });
  });
});