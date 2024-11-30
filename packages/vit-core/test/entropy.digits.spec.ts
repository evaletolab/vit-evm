import { expect } from 'chai';

// Importe la fonction à tester
import { randomDigits } from '../dist/core.entropy';

describe('randomDigits', () => {
    it('should generate exactly 5 codes', () => {
        const codes = randomDigits(5);
        expect(codes).to.have.lengthOf(5);
    });

    it('should generate codes of exactly 4 digits', () => {
        const codes = randomDigits(5);
        codes.forEach((code) => {
            expect(code).to.be.a('string');
            expect(code).to.match(/^\d{4}$/); // Vérifie que chaque code a exactement 4 chiffres
        });
    });

    it('should generate unique codes', () => {
        const codes = randomDigits(5);
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).to.equal(codes.length);
    });

    it('should generate 4x5 digits in range of 1000-9999', () => {
        const codes = randomDigits(5);
        codes.forEach((code) => {
            const num = parseInt(code, 10);
            expect(num).to.be.at.least(1000);
            expect(num).to.be.at.most(9999);
        });
    });


    it('should generate deterministic 5 codes of 4 digits with input seed', () => {
        const seed = Uint8Array.from([
            166,132,233,149,219,173,213,168,248,117,9,110,153,92,242,204,147,145,76,241
        ]);
        const codes = randomDigits(5,seed);
        // console.log("  privates codes", codes);
        expect(codes[0]).eq('6001');
        expect(codes[1]).eq('8069');
        expect(codes[2]).eq('9177');

        codes.forEach((code) => {
            expect(code).to.be.a('string');
            expect(code).to.match(/^\d{4}$/); // Vérifie que chaque code a exactement 4 chiffres
        });
    });

});
