import { ethers } from 'ethers';
import { ModuleCall } from './core.types';

/**
 * Module: core.safe.adapter
 *
 * Role
 * - Placeholder helpers to interact with a Safe 7579 adapter (register modules, set permissions, execute).
 *
 * Workflow
 * - After enabling a module on the Safe, some adapters require an additional registration step.
 * - These helpers encode adapter calls; replace ABIs with the real adapter contract ABI when available.
 *
 * Relations
 * - core.safe.modules: enabling/disabling modules
 * - core.safe.execute: execute ModuleCall encodings
 */

export interface AdapterConfig {
  adapterAddress: string;
}

export function adapterRegisterModule(config: AdapterConfig, moduleAddress: string): ModuleCall {
  // Placeholder ABI; replace with real adapter interface
  const iface = new ethers.Interface(['function registerModule(address)']);
  const data = iface.encodeFunctionData('registerModule', [moduleAddress]);
  return { to: config.adapterAddress, data, value: 0n };
}

export function adapterSetPermission(
  config: AdapterConfig,
  moduleAddress: string,
  selector: string,
  allowed: boolean,
): ModuleCall {
  // Placeholder ABI; replace with real permission API
  const iface = new ethers.Interface(['function setPermission(address,bytes4,bool)']);
  const data = iface.encodeFunctionData('setPermission', [moduleAddress, selector as unknown as `0x${string}`, allowed]);
  return { to: config.adapterAddress, data, value: 0n };
}


