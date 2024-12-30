// FILEPATH: /home/evaleto/nodejs/karibou.ch/karibou-web3/test/tools.utils.spec.ts

import { expect } from 'chai';
import { keccak256, randomBytes, toBeHex } from 'ethers';

import { numberToKecc256, nonStdMnemonicToBytes, bytesToNonStdMenomnic } from '../dist/tools';
import { createMnemonic } from '../dist/core.entropy';

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

  describe('nonStdMnemonicToBytes', () => {
    it('should use valid wordlist', () => {
      try {
        const mnemonic = "belette adorer hachoir voyage dossier moqueur torche concert pollen question jugement lessive";
        nonStdMnemonicToBytes(mnemonic,'fr');
      } catch (err: any) {
        expect.fail('Should not thrown an error');
      }    
    });

    it('should return a valid array of bytes', () => {
      const random = Uint8Array.from([2,0,34]);
      const mnemonic = bytesToNonStdMenomnic(random,'fr');

      const reverse = nonStdMnemonicToBytes(mnemonic,'fr');
      expect(reverse).to.deep.equal(random);
    });
  });
});