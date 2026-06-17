import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../../wallet/wallet.service';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import { shortAddress } from '../../wallet/wallet.utils';

type View = 'list' | 'form';

@Component({
  selector: 'vit-page-contacts',
  templateUrl: './page-contacts.component.html',
  styleUrl: './page-contacts.component.scss',
})
export class PageContactsComponent implements OnInit {
  view: View = 'list';
  contacts: Contact[] = [];
  owner = '';
  hasWallet = false;
  error = '';
  phonePickerSupported = false;
  googlePickerSupported = false;
  prefillFromPhone: Array<{ name: string; hint?: string }> = [];

  // form
  formId: string | undefined;
  formName = '';
  formAddress = '';
  formNote = '';
  formSource: Contact['source'] = 'manual';

  short = shortAddress;

  constructor(private wallet: WalletService, private contactsSvc: ContactsService) {}

  async ngOnInit(): Promise<void> {
    this.phonePickerSupported = this.contactsSvc.isPhonePickerSupported();
    this.googlePickerSupported = this.contactsSvc.isGooglePickerSupported();
    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.contacts = this.contactsSvc.list(this.owner);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    }
  }

  openAdd(): void {
    this.formId = undefined;
    this.formName = '';
    this.formAddress = '';
    this.formNote = '';
    this.formSource = 'manual';
    this.error = '';
    this.view = 'form';
  }

  openEdit(c: Contact): void {
    this.formId = c.id;
    this.formName = c.name;
    this.formAddress = c.address;
    this.formNote = c.note || '';
    this.formSource = c.source;
    this.error = '';
    this.view = 'form';
  }

  cancel(): void {
    this.view = 'list';
    this.error = '';
    this.prefillFromPhone = [];
  }

  save(): void {
    this.error = '';
    try {
      if (!ethers.isAddress(this.formAddress)) {
        throw new Error('Address Ethereum invalide');
      }
      this.contactsSvc.upsert(this.owner, {
        id: this.formId,
        name: this.formName,
        address: this.formAddress,
        note: this.formNote,
        source: this.formSource,
      });
      this.contacts = this.contactsSvc.list(this.owner);
      this.view = 'list';
      this.prefillFromPhone = [];
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    }
  }

  remove(c: Contact): void {
    if (!confirm(`Supprimer « ${c.name} » ?`)) return;
    this.contactsSvc.remove(this.owner, c.id);
    this.contacts = this.contactsSvc.list(this.owner);
  }

  async importFromPhone(): Promise<void> {
    this.error = '';
    const picked = await this.contactsSvc.pickFromPhone();
    if (!picked) {
      this.error = "Ton appareil ne permet pas l'accès aux contacts (iOS, ou navigateur non compatible).";
      return;
    }
    this.handlePrefill(picked);
  }

  async importFromGoogle(): Promise<void> {
    this.error = '';
    try {
      const picked = await this.contactsSvc.pickFromGoogle();
      if (!picked || !picked.length) {
        this.error = 'Aucun contact récupéré depuis Google.';
        return;
      }
      this.handlePrefill(picked);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur Google';
    }
  }

  private handlePrefill(picked: Array<{ name: string; hint?: string }>): void {
    this.prefillFromPhone = picked;
    if (picked.length === 1) {
      this.formName = picked[0].name;
      this.formAddress = '';
      this.formSource = 'phone';
      this.view = 'form';
    } else if (picked.length > 1) {
      this.view = 'form';
      this.formSource = 'phone';
    }
  }

  selectPrefill(p: { name: string; hint?: string }): void {
    this.formName = p.name;
    this.prefillFromPhone = [];
  }
}
