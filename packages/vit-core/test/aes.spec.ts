// @ts-nocheck
import { describe, it, beforeAll, expect } from 'vitest'
import { aes_encrypt, aes_decrypt, createSecretKey } from '../dist/core.AES';
import { ethers } from 'ethers';
// No shim needed: Node 20+ exposes globalThis.crypto

// Dummy implementation of keccak256 and toUtf8String for testing purposes
// const mockKeccak256 = jest.fn((input: Uint8Array) => '0123456789abcdef0123456789abcdef');
// const mockToUtf8String = jest.fn((input: Uint8Array) => 'testkey');

// jest.mock('your-hash-module', () => ({
//   keccak256: mockKeccak256,
//   toUtf8String: mockToUtf8String,
// }));

describe('encrypt and decrypt with AES', () => {
  const msg = '--import data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));';
  const salt = ethers.toUtf8Bytes('testsalt91234');// Salt is Min 12 lentgh

  // No setup required
  it('should verify the key length', async () => {
    try {
      await createSecretKey("hello")
    } catch (err: any) {
      expect.fail('Should have thrown an error');
    }    
  });

  it('should shuffle and deshuffle data to retrieve the original input', async () => {
    const key = await createSecretKey("hello secret"); 
    expect(key.extractable).toBe(false);
    expect(key.type).toBe('secret');
    expect((key.algorithm as any).name).toBe('AES-GCM');

    // Perform shuffle
    const shuffledData = await aes_encrypt(msg, key, salt);
    expect(shuffledData.toString()).not.toBe(msg);

    // Perform deshuffle
    const deshuffledData = await aes_decrypt(shuffledData, key, salt);
    expect(deshuffledData.toString()).toBe(msg);
  });

  it('should handle empty data', async () => {
    const emptyData = "";
    const key = await createSecretKey("hello secret");

    const shuffledEmpty = await aes_encrypt(emptyData, key, salt);

    const deshuffledEmpty = await aes_decrypt(shuffledEmpty, key, salt);
    expect(deshuffledEmpty.toString()).toBe(emptyData.toString());
  });

  it('should handle single-element data', async () => {
    const data = "a"
    const key = await createSecretKey("hello secret");

    const shuffledSingle = await aes_encrypt(data, key, salt);
    expect(shuffledSingle).not.toBe(data);

    const deshuffledSingle = await aes_decrypt(shuffledSingle, key, salt);
    expect(deshuffledSingle.toString()).toBe(data);
  });
});
