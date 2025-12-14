/**
 * Module: core.safe.webauthn
 *
 * Role
 * - Phase 2 / R&D helper: Bridge between WebAuthn passkeys and a custom on-chain validator module.
 *
 * MVP note
 * - The MVP uses Safe’s native passkey signer (`Safe.createPasskeySigner()`) with Relay Kit (`Safe4337Pack`),
 *   not a custom ERC-7579 WebAuthn validator module.
 *
 * Workflow
 * - Install the module with installWebAuthnModule when necessary (ABI placeholder).
 * - Link a passkey to the Safe via linkPasskeyToSafe (credentialId + uncompressed P-256 pubkey).
 * - Execute a target call gated by WebAuthn via executeWithPasskey (encodes signature tuple).
 *
 * Relations
 * - core.passkey: obtains credentials and signatures from WebAuthn API
 * - core.safe.account: ensures Safe is deployed before linking/execution
 * - core.safe.modules: module enable/disable may be managed there
 */
import { ethers } from 'ethers';
import { ModuleCall, WebAuthnModuleConfig, WebAuthnSignature } from './core.types';

// NOTE: This file is a bridge. It prepares calldata for the on-chain WebAuthn validator module and
// organizes calls that should be sent via the Safe SDK by the app layer. We do not bundle Safe SDK here.

export interface LinkPasskeyParams {
  config: WebAuthnModuleConfig;
  credentialId: string;   // base64url
  publicKeyUncompressed: string; // 0x04 + X + Y (65 bytes)
}

export interface ExecuteWithPasskeyParams {
  config: WebAuthnModuleConfig;
  signature: WebAuthnSignature;
  target: string;     // to
  data: string;       // calldata
  value?: bigint;     // value
}

export function installWebAuthnModule(config: WebAuthnModuleConfig): ModuleCall {
  // Placeholder selector; replace with real module install selector/params when available
  const selector = '0x00000000';
  const data = selector; // ABI-encode install args when defined
  return { to: config.safeAddress, data, value: 0n };
}

export function linkPasskeyToSafe(params: LinkPasskeyParams): ModuleCall {
  const { config, credentialId, publicKeyUncompressed } = params;
  // Placeholder ABI; replace with real function signature of the validator module
  // e.g., function linkCredential(bytes credentialId, bytes uncompressedPubKey)
  const iface = new ethers.Interface(['function linkCredential(bytes,bytes)']);
  const data = iface.encodeFunctionData('linkCredential', [
    base64UrlToBytes(credentialId),
    ethers.getBytes(publicKeyUncompressed),
  ]);
  return { to: config.moduleAddress, data, value: 0n };
}

export function executeWithPasskey(params: ExecuteWithPasskeyParams): ModuleCall {
  const { config, signature, target, data: callData, value } = params;
  // Placeholder ABI; replace with real function signature of the validator-enabled executor
  // e.g., function executeWithPasskey(address to,uint256 value,bytes data,bytes sig)
  const iface = new ethers.Interface([
    'function executeWithPasskey(address,uint256,bytes,bytes)',
  ]);
  // naive packing of signature parts into a single bytes blob (placeholder)
  const sigBlob = ethers.concat([
    base64UrlToBytes(signature.credentialId),
    base64UrlToBytes(signature.clientDataJSON),
    base64UrlToBytes(signature.authenticatorData),
    base64UrlToBytes(signature.signature),
    signature.userHandle ? base64UrlToBytes(signature.userHandle) : new Uint8Array(),
  ]);
  const encoded = iface.encodeFunctionData('executeWithPasskey', [
    target,
    value ?? 0n,
    callData,
    sigBlob,
  ]);
  return { to: config.moduleAddress, data: encoded, value: 0n };
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const normalized = base64 + pad;
  const str = typeof atob !== 'undefined' ? atob(normalized) : Buffer.from(normalized, 'base64').toString('binary');
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export type { WebAuthnModuleConfig };


