import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../wallet/wallet.service';
import { environment } from '../../environments/environment';
import { UserOperationResult } from '../wallet/wallet.types';

export type LinkStatus = 'pending' | 'claimed' | 'cancelled';

export interface StoredLink {
  id: string;          // bytes32 hex (link id)
  secret: string;      // bytes32 hex (raw secret, kept locally for share+claim)
  amount: string;      // decimal string, displayed in xCHF
  amountWei: string;   // bigint as string
  expiry: number;      // unix seconds, 0 = no expiry
  createdAt: number;
  txHash?: string;
  status: LinkStatus;
}

const STORAGE_PREFIX = 'vit-claimlinks:';

@Injectable({ providedIn: 'root' })
export class ClaimLinkService {
  constructor(private wallet: WalletService) {}

  contractAddress(): string | null {
    return environment.claimLinkAddress || null;
  }

  newSecret(): { id: string; secret: string; secretHash: string } {
    const secretBytes = ethers.randomBytes(32);
    const secret = ethers.hexlify(secretBytes);
    const idBytes = ethers.randomBytes(32);
    const id = ethers.hexlify(idBytes);
    const secretHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [secret]),
    );
    return { id, secret, secretHash };
  }

  buildShareUrl(id: string, secret: string): string {
    const base = window.location.origin;
    const params = new URLSearchParams({ id, s: secret });
    return `${base}/claim?${params.toString()}`;
  }

  async create(amountWei: bigint, expiry: bigint): Promise<{
    link: StoredLink;
    op: UserOperationResult;
    url: string;
  }> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    const owner = await this.requireOwner();
    const { id, secret, secretHash } = this.newSecret();

    const op = await this.wallet.createClaimLink(addr, id, amountWei, expiry, secretHash);
    if (!op.success) throw new Error(op.error || 'Échec création link');

    const link: StoredLink = {
      id,
      secret,
      amount: ethers.formatUnits(amountWei, 18),
      amountWei: amountWei.toString(),
      expiry: Number(expiry),
      createdAt: Math.floor(Date.now() / 1000),
      txHash: op.transactionHash,
      status: 'pending',
    };
    this.append(owner, link);
    return { link, op, url: this.buildShareUrl(id, secret) };
  }

  async cancel(id: string): Promise<UserOperationResult> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    const op = await this.wallet.cancelClaimLink(addr, id);
    if (op.success) {
      const owner = await this.requireOwner();
      this.updateStatus(owner, id, 'cancelled');
    }
    return op;
  }

  async claim(id: string, secret: string, recipient: string): Promise<UserOperationResult> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    return this.wallet.claimClaimLink(addr, id, secret, recipient);
  }

  async readOnChain(id: string) {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    return this.wallet.readClaimLink(addr, id);
  }

  list(owner: string): StoredLink[] {
    const raw = localStorage.getItem(STORAGE_PREFIX + owner.toLowerCase());
    return raw ? (JSON.parse(raw) as StoredLink[]) : [];
  }

  private append(owner: string, link: StoredLink): void {
    const list = this.list(owner);
    list.unshift(link);
    localStorage.setItem(STORAGE_PREFIX + owner.toLowerCase(), JSON.stringify(list));
  }

  private updateStatus(owner: string, id: string, status: LinkStatus): void {
    const list = this.list(owner);
    const idx = list.findIndex((l) => l.id === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], status };
    localStorage.setItem(STORAGE_PREFIX + owner.toLowerCase(), JSON.stringify(list));
  }

  private async requireOwner(): Promise<string> {
    const state = await this.wallet.loadWallet();
    if (!state) throw new Error('Pas de wallet');
    return state.accountAddress;
  }
}
