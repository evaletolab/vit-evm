// FILEPATH: /home/evaleto/nodejs/karibou.ch/karibou-web3/test/tools.utils.spec.ts

import { expect } from 'chai';
import { keccak256, sha256, toBeHex } from 'ethers';

import { numberToKecc256 } from '../dist/tools';

describe('tools', () => {
  describe('numberToKecc256', () => {
    it('should return a valid hex string', () => {
      const value = 12345;
      const result = numberToKecc256(value);
      expect(result).to.be.a('string');
      expect(result).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should return the correct hex string for a given input', () => {
      const value = 12345;
      const result = numberToKecc256(value);
      const expected = keccak256(toBeHex(value));
      expect(result).to.equal(expected);
    });
  });
});