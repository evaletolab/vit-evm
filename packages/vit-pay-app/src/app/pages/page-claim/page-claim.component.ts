import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ethers } from 'ethers';
import { ClaimLinkService } from '../../claimlink/claimlink.service';
import { ContactsService } from '../../contacts/contacts.service';
import { WalletService } from '../../wallet/wallet.service';
import { formatZchfAmount, shortAddress } from '../../wallet/wallet.utils';

type Step = 'loading' | 'ready' | 'claiming' | 'done' | 'error';

@Component({
  selector: 'vit-page-claim',
  templateUrl: './page-claim.component.html',
  styleUrl: './page-claim.component.scss',
})
export class PageClaimComponent implements OnInit {
  step: Step = 'loading';
  error = '';
  id = '';
  secret = '';
  fromName = '';

  amount = '';
  senderAddress = '';
  senderShort = '';
  expiry = 0;
  status = 0;

  walletAddress = '';
  hasWallet = false;
  txHash = '';
  short = shortAddress;

  contactSaved = false;
  contactHint = '';

  constructor(
    private route: ActivatedRoute,
    private cl: ClaimLinkService,
    private wallet: WalletService,
    private contacts: ContactsService,
  ) {}

  /** After wallet creation, return to this claim URL (preserve optional from). */
  get walletReturnParams(): { returnUrl: string } {
    const params = new URLSearchParams({ id: this.id, s: this.secret });
    if (this.fromName) params.set('from', this.fromName);
    return { returnUrl: `/claim?${params.toString()}` };
  }

  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.queryParamMap.get('id') || '';
    this.secret = this.route.snapshot.queryParamMap.get('s') || '';
    this.fromName = (this.route.snapshot.queryParamMap.get('from') || '').trim();

    if (!this.id || !this.secret) {
      this.fail('Lien invalide (paramètres manquants)');
      return;
    }
    if (!this.cl.contractAddress()) {
      this.fail('Contrat ClaimLink non configuré');
      return;
    }

    try {
      const link = await this.cl.readOnChain(this.id);
      if (link.sender === ethers.ZeroAddress) {
        this.fail('Lien introuvable');
        return;
      }
      this.amount = formatZchfAmount(link.amount);
      this.senderAddress = link.sender;
      this.senderShort = shortAddress(link.sender);
      this.expiry = Number(link.expiry);
      this.status = link.status;

      if (link.status === 1) { this.fail('Ce lien a déjà été réclamé.'); return; }
      if (link.status === 2) { this.fail('Ce lien a été annulé.'); return; }
      if (link.expiry !== 0n && Number(link.expiry) * 1000 < Date.now()) {
        this.fail('Ce lien est expiré.'); return;
      }

      const expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [this.secret]),
      );
      if (expectedHash.toLowerCase() !== link.secretHash.toLowerCase()) {
        this.fail('Secret invalide pour ce lien.'); return;
      }

      try {
        const state = await this.wallet.loadWallet();
        if (state) {
          this.hasWallet = true;
          this.walletAddress = state.accountAddress;
          this.maybeOfferContact(state.accountAddress);
        }
      } catch { /* no wallet yet */ }

      this.step = 'ready';
    } catch (e: unknown) {
      this.fail(e instanceof Error ? e.message : 'Erreur de lecture du lien');
    }
  }

  saveSenderContact(): void {
    if (!this.hasWallet || !this.fromName || !this.senderAddress) return;
    try {
      this.contacts.upsert(this.walletAddress, {
        name: this.fromName,
        address: this.senderAddress,
        source: 'manual',
        note: 'Via claim link',
      });
      this.contactSaved = true;
      this.contactHint = `${this.fromName} ajouté au carnet.`;
    } catch (e: unknown) {
      this.contactHint = e instanceof Error ? e.message : 'Impossible d\'ajouter le contact';
    }
  }

  async claim(): Promise<void> {
    if (!this.hasWallet || !this.walletAddress) {
      this.error = 'Créez d\'abord un compte pour recevoir les fonds.';
      return;
    }
    this.step = 'claiming';
    this.error = '';
    try {
      const op = await this.cl.claim(this.id, this.secret, this.walletAddress);
      if (!op.success) throw new Error(op.error || 'Échec du claim');
      this.txHash = op.transactionHash || '';
      if (this.fromName && !this.contactSaved) {
        this.saveSenderContact();
      }
      this.step = 'done';
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
      this.step = 'ready';
    }
  }

  private maybeOfferContact(owner: string): void {
    if (!this.fromName || !this.senderAddress) return;
    const existing = this.contacts.findByAddress(owner, this.senderAddress);
    if (existing) {
      this.contactSaved = true;
      this.contactHint = `Déjà dans le carnet : ${existing.name}`;
    }
  }

  private fail(msg: string): void {
    this.error = msg;
    this.step = 'error';
  }
}
