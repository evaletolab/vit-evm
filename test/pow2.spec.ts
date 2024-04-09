import { expect } from 'chai';
import { ethers, BigNumber } from 'ethers';
import { requiresWork } from '../src/core.POW';

describe('core.POW', () => {
  describe('requiresWork', () => {
    it('should return an array with two hex strings', () => {
      const result = requiresWork('test', BigNumber.from(50));
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(result[1]).to.match(/^0x[a-fA-F0-9]*$/);
    });

    it('should return different results for different inputs', () => {
      const result1 = requiresWork('test1', BigNumber.from(50));
      const result2 = requiresWork('test2', BigNumber.from(50));
      expect(result1[0]).to.not.equal(result2[0]);
      expect(result1[1]).to.not.equal(result2[1]);
    });

    it('should return different results for different probabilities', () => {
      const result1 = requiresWork('test', BigNumber.from(50));
      const result2 = requiresWork('test', BigNumber.from(60));
      expect(result1[0]).to.not.equal(result2[0]);
      expect(result1[1]).to.not.equal(result2[1]);
    });
  });
});