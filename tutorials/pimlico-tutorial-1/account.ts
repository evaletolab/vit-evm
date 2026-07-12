// account.ts

// Import necessary modules
import { toSafeSmartAccount } from 'permissionless/accounts';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { PublicClient } from 'viem';
import { Account } from 'viem';
import {  entryPoint07Address } from "viem/account-abstraction"

// Function to generate a new smart account
export async function generateSmartAccount(publicClient: PublicClient): Promise<Account> {
  // Generate a random private key
  const privateKey = generatePrivateKey();

  // Convert private key to account
  const ownerAccount = privateKeyToAccount(privateKey);

  // Create a new smart account instance
  const account = await toSafeSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    }, // Global entrypoint
    version: '1.4.1',
  });

  // Return the account instance
  return account;
}

// Function to add an owner to the smart account
export async function addOwner(
  account: Account,
  publicClient: PublicClient,
  newOwnerPrivateKey: string
): Promise<void> {
  // Convert new owner's private key to account
  const newOwnerAccount = privateKeyToAccount(newOwnerPrivateKey);

  // NOTE: This function relies on Pimlico's permissionless.js API. Modify it to remove dependencies on third-party provider APIs.

  // Create a transaction to add the new owner
  const tx = await account..createAddOwnerTx(newOwnerAccount.address);

  // Sign and send the transaction
  const txHash = await account.sendUserOperation(tx);

  // Wait for the transaction receipt
  await publicClient.waitForTransactionReceipt({ hash: txHash });
}

// Function to remove an owner from the smart account
export async function removeOwner(
  account: Account,
  publicClient: PublicClient,
  ownerPrivateKey: string
): Promise<void> {
  // Convert owner's private key to account
  const ownerAccount = privateKeyToAccount(ownerPrivateKey);

  // NOTE: This function relies on Pimlico's permissionless.js API. Modify it to remove dependencies on third-party provider APIs.

  // Create a transaction to remove the owner
  const tx = await account.createRemoveOwnerTx(ownerAccount.address);

  // Sign and send the transaction
  const txHash = await account.sendUserOperation(tx);

  // Wait for the transaction receipt
  await publicClient.waitForTransactionReceipt({ hash: txHash });
}

// Function to change the owner of the smart account
export async function changeOwner(
  account: Account,
  publicClient: PublicClient,
  oldOwnerPrivateKey: string,
  newOwnerPrivateKey: string
): Promise<void> {
  // Remove the old owner
  await removeOwner(account, publicClient, oldOwnerPrivateKey);

  // Add the new owner
  await addOwner(account, publicClient, newOwnerPrivateKey);
}
