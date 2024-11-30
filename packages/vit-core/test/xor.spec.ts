import { expect } from 'chai'
import { xor_shuffle, xor_deshuffle } from '../dist/core.XOR';

// Dummy implementation of keccak256 and toUtf8String for testing purposes
// const mockKeccak256 = jest.fn((input: Uint8Array) => '0123456789abcdef0123456789abcdef');
// const mockToUtf8String = jest.fn((input: Uint8Array) => 'testkey');

// jest.mock('your-hash-module', () => ({
//   keccak256: mockKeccak256,
//   toUtf8String: mockToUtf8String,
// }));

describe('shuffle and deshuffle with XOR + sha256', () => {
  it('should shuffle and deshuffle data to retrieve the original input', () => {
    const data = new Uint8Array([65, 66, 67, 68]); // Test data: ASCII for 'ABCD'
    const key = new Uint8Array([1, 2, 3, 4]);      // Sample key

    // Perform shuffle
    const shuffledData = xor_shuffle(data, key);
    expect(shuffledData.toString()).not.equal(data.toString()); // Ensure data is shuffled and not equal to original

    // Perform deshuffle
    const deshuffledData = xor_deshuffle(shuffledData, key);
    expect(deshuffledData.toString()).equal(data.toString());
  });

  it('should handle empty data', () => {
    const emptyData = new Uint8Array([]);
    const key = new Uint8Array([1, 2, 3, 4]);

    const shuffledEmpty = xor_shuffle(emptyData, key);
    expect(shuffledEmpty.toString()).equal(emptyData.toString());

    const deshuffledEmpty = xor_deshuffle(shuffledEmpty, key);
    expect(deshuffledEmpty.toString()).equal(emptyData.toString());
  });

  it('should handle single-element data', () => {
    const data = new Uint8Array([42]); // Arbitrary single byte
    const key = new Uint8Array([1, 2, 3, 4]);

    const shuffledSingle = xor_shuffle(data, key);
    expect(shuffledSingle).not.equal(data);

    const deshuffledSingle = xor_deshuffle(shuffledSingle, key);
    expect(deshuffledSingle.toString()).equal(data.toString());
  });
});
