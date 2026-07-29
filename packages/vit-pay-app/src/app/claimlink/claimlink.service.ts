import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../wallet/wallet.service';
import { environment } from '../../environments/environment';
import { UserOperationResult } from '../wallet/wallet.types';
import {
  ClaimContactPayload,
  contactMetaHash,
  decodeContactPayload,
  encodeContactPayload,
} from './claim-contact';

export type LinkStatus = 'pending' | 'claimed' | 'cancelled' | 'expired';

export interface StoredLink {
  id: string;
  secret: string;
  amount: string;
  amountWei: string;
  expiry: number;
  createdAt: number;
  txHash?: string;
  status: LinkStatus;
  /** base64url contact payload embedded in share URL (optional). */
  contactEncoded?: string;
  metaHash?: string;
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

  /**
   * Build the share URL. The contact travels in the fragment query (`c=`), so
   * it is never sent to the server — hence the hashRoute requirement.
   *
   * `contactEncoded` must be the very string the on-chain metaHash was computed
   * from: re-encoding a decoded payload could change a byte and make the claim
   * revert with MetaMismatch.
   */
  buildShareUrl(id: string, secret: string, contactEncoded?: string | null): string {
    const params = new URLSearchParams({ id, s: secret });
    if (contactEncoded) {
      if (!environment.hashRoute) {
        throw new Error(
          'Impossible de joindre un contact : hashRoute doit être activé (fragment URL).',
        );
      }
      params.set('c', contactEncoded);
    }
    const root = new URL(
      document.querySelector('base')?.getAttribute('href') || '/',
      window.location.origin,
    ).href.replace(/\/$/, '');
    const path = environment.hashRoute ? '/#/claim' : '/claim';
    return `${root}${path}?${params.toString()}`;
  }

  parseContactFromQuery(cParam: string | null, fromLegacy?: string | null): ClaimContactPayload | null {
    if (cParam) return decodeContactPayload(cParam);
    if (fromLegacy?.trim()) return { n: fromLegacy.trim() };
    return null;
  }

  async create(
    amountWei: bigint,
    expiry: bigint,
    opts?: { attachContact?: boolean; contact?: ClaimContactPayload | null },
  ): Promise<{
    link: StoredLink;
    op: UserOperationResult;
    url: string;
  }> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    const owner = await this.requireOwner();
    const { id, secret, secretHash } = this.newSecret();

    const attach =
      opts?.attachContact ??
      (this.wallet.getState()?.attachContactToClaims !== false);
    let contact = opts?.contact ?? null;
    if (attach && !contact) contact = this.wallet.getProfileContact();

    let contactEncoded: string | undefined;
    let metaHash = ethers.ZeroHash;
    if (contact?.n) {
      contactEncoded = encodeContactPayload(contact);
      metaHash = contactMetaHash(contactEncoded);
    }

    // Build the URL BEFORE locking the funds: buildShareUrl rejects a contact
    // payload when hashRoute is off, and failing after `create` would strand
    // the tokens in an escrow whose link we never showed.
    const url = this.buildShareUrl(id, secret, contactEncoded);

    const op = await this.wallet.createClaimLink(
      addr,
      id,
      amountWei,
      expiry,
      secretHash,
      metaHash,
    );
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
      contactEncoded,
      metaHash,
    };
    this.append(owner, link);
    return { link, op, url };
  }

  async cancel(id: string): Promise<UserOperationResult> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    const owner = await this.requireOwner();

    const onChain = await this.wallet.readClaimLink(addr, id);
    if (onChain.status === 1) {
      this.updateStatus(owner, id, 'claimed');
      throw new Error('Ce lien a déjà été réclamé par le destinataire — rien à annuler.');
    }
    if (onChain.status === 2) {
      this.updateStatus(owner, id, 'cancelled');
      throw new Error('Ce lien est déjà annulé.');
    }

    // Both paths refund the sender, so the local status is 'cancelled' either way.
    const now = Math.floor(Date.now() / 1000);
    const expired = onChain.expiry > 0n && now > Number(onChain.expiry);
    const op = expired
      ? await this.wallet.cancelExpiredClaimLink(addr, id)
      : await this.wallet.cancelClaimLink(addr, id);
    if (op.success) this.updateStatus(owner, id, 'cancelled');
    return op;
  }

  /** Contract custom errors → user-facing French messages (never raw JSON). */
  mapClaimError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    // MetaMismatch first: it is the only tampering signal and must not be
    // shadowed by the generic /cancel/ or /expir/ matches below.
    if (/MetaMismatch/i.test(msg)) {
      return 'Le contact joint au lien a été modifié — refusez ce claim.';
    }
    if (/NotPending|déjà été réclamé|already claimed/i.test(msg)) {
      return 'Ce lien a déjà été réclamé ou annulé.';
    }
    if (/\bExpired\b|expiré|expir/i.test(msg)) {
      return 'Ce lien a expiré.';
    }
    if (/Cancelled|annul/i.test(msg)) {
      return 'L’envoyeur a annulé ce lien.';
    }
    if (/WrongSecret|secret/i.test(msg)) {
      return 'Lien invalide (secret incorrect).';
    }
    return msg;
  }

  async claim(
    id: string,
    secret: string,
    recipient: string,
    contactEncoded?: string | null,
  ): Promise<UserOperationResult> {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    const metaHash = contactEncoded
      ? contactMetaHash(contactEncoded)
      : ethers.ZeroHash;
    try {
      return await this.wallet.claimClaimLink(
        addr,
        id,
        secret,
        recipient,
        metaHash,
      );
    } catch (err) {
      throw new Error(this.mapClaimError(err));
    }
  }

  async readOnChain(id: string) {
    const addr = this.contractAddress();
    if (!addr) throw new Error('ClaimLink contract address non configurée');
    return this.wallet.readClaimLink(addr, id);
  }

  /**
   * Refresh local statuses from chain (read-only by default).
   *
   * `autoCancelExpired` sends one sponsored UserOp per expired link, and each
   * one prompts the passkey. Only pass it from an explicit user action, never
   * on page load.
   */
  async refreshStatuses(
    owner: string,
    opts?: { autoCancelExpired?: boolean },
  ): Promise<StoredLink[]> {
    const addr = this.contractAddress();
    if (!addr) return this.list(owner);
    const list = this.list(owner);
    const pending = list.filter((l) => l.status === 'pending');
    if (pending.length === 0) return list;
    const now = Math.floor(Date.now() / 1000);

    for (const l of pending) {
      try {
        const oc = await this.wallet.readClaimLink(addr, l.id);
        if (oc.status === 1) this.updateStatus(owner, l.id, 'claimed');
        else if (oc.status === 2) this.updateStatus(owner, l.id, 'cancelled');
        else if (oc.expiry > 0n && now > Number(oc.expiry)) {
          this.updateStatus(owner, l.id, 'expired');
          if (opts?.autoCancelExpired) {
            const op = await this.wallet.cancelExpiredClaimLink(addr, l.id);
            if (op.success) this.updateStatus(owner, l.id, 'cancelled');
          }
        }
      } catch {
        // network glitch
      }
    }
    return this.list(owner);
  }

  list(owner: string): StoredLink[] {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + owner.toLowerCase());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as StoredLink[]) : [];
    } catch {
      return [];
    }
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
