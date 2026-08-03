import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { WalletService } from '../../wallet/wallet.service';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import {
  ContactCardPayload,
  buildReceiveShareUrl,
  decodeContactCard,
} from '../../contacts/contact-share';
import { parseZchfAmount, shortAddress } from '../../wallet/wallet.utils';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'vit-page-sent',
  templateUrl: './page-sent.component.html',
  styleUrl: './page-sent.component.scss',
})
export class PageSentComponent implements OnInit, AfterViewInit {
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  address = '';
  shortAddr = '';
  amount = '';
  copied = false;
  loading = true;
  error?: string;

  /** Contrepartie d'une demande ciblée (via query) — masque le QR. */
  counterpart?: Contact;
  saveError = '';
  private myCard: ContactCardPayload | null = null;
  private ownerAddress = '';

  constructor(
    private wallet: WalletService,
    private contactsSvc: ContactsService,
    private route: ActivatedRoute,
  ) {}

  get counterpartWhitelisted(): boolean {
    const c = this.counterpart;
    if (!c?.id || c.id === 'incoming') return false;
    return c.source !== 'pending';
  }

  get counterpartMeta(): string {
    const c = this.counterpart;
    if (!c) return '';
    if (c.tel) return c.tel;
    if (c.email) return c.email;
    if (c.address) return shortAddress(c.address);
    return '';
  }

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) {
        this.error = 'Aucun wallet trouvé. Crée-en un d\'abord.';
      } else {
        this.address = state.accountAddress;
        this.shortAddr = shortAddress(state.accountAddress);
        this.ownerAddress = state.accountAddress;
        this.myCard = {
          n: state.displayName || shortAddress(state.accountAddress),
          a: state.accountAddress,
          t: state.profileTel,
          e: state.profileEmail,
          w: state.walletName,
        };
        this.resolveCounterpart(state.accountAddress);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
      setTimeout(() => this.renderQR(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.address && !this.counterpart) setTimeout(() => this.renderQR(), 0);
  }

  /** QR reste EIP-681 (interop wallets) — le bouton Copier emporte le lien ViT. */
  get payload(): string {
    if (!this.address) return '';
    if (this.amount && Number(this.amount) > 0) {
      try {
        const wei = parseZchfAmount(this.amount);
        return `ethereum:${this.address}?value=${wei.toString()}`;
      } catch {
        return this.address;
      }
    }
    return this.address;
  }

  async renderQR(): Promise<void> {
    if (this.counterpart) return;
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas || !this.payload) return;
    try {
      await QRCode.toCanvas(canvas, this.payload, {
        width: 220,
        margin: 1,
        color: { dark: '#1D1D1D', light: '#FFFFFF' },
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  onAmountChange(): void {
    this.renderQR();
  }

  /** Copie le lien ViT : Safe + montant + carte de contact complète. */
  async copy(): Promise<void> {
    if (!this.address || !this.myCard) return;
    const url = buildReceiveShareUrl({
      address: this.address,
      amount: this.amount,
      contact: this.myCard,
      hashRoute: environment.hashRoute,
    });
    try {
      await navigator.clipboard.writeText(url);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      window.prompt('Copier le lien :', url);
    }
  }

  /**
   * Contrepartie depuis l'URL (`?to=` / `?name=` / `?c=`).
   * Avec contact → chip, sans → QR à partager.
   * Lien `c=` → ajout auto au carnet (sans doublon).
   */
  private resolveCounterpart(owner: string): void {
    const params = this.route.snapshot.queryParamMap;
    const to = params.get('to')?.trim() || '';
    const name = params.get('name')?.trim() || '';
    const cardRaw = params.get('c');
    const amount = params.get('amount');
    if (amount) this.amount = amount;
    if (!to && !name && !cardRaw) return;

    if (to && to.startsWith('0x')) {
      const fromBook = this.contactsSvc.findByAddress(owner, to);
      if (fromBook) {
        this.counterpart = fromBook;
        return;
      }
    }

    if (cardRaw) {
      const card = decodeContactCard(cardRaw);
      if (card?.n) {
        const address = card.a || (to.startsWith('0x') ? to : '');
        this.counterpart = this.contactsSvc.upsertFromShare(owner, {
          name: card.n,
          address: address || undefined,
          tel: card.t,
          email: card.e,
        });
        return;
      }
    }

    const list = this.contactsSvc.list(owner);
    const byMailOrTel = to
      ? list.find(
          (c) =>
            (!!c.email && c.email.toLowerCase() === to.toLowerCase()) ||
            (!!c.tel && c.tel.replace(/[\s().-]/g, '') === to.replace(/[\s().-]/g, '')),
        )
      : undefined;
    if (byMailOrTel) {
      this.counterpart = byMailOrTel;
      return;
    }

    if (name || to) {
      this.counterpart = {
        id: '',
        name: name || (to.startsWith('0x') ? shortAddress(to) : to),
        address: to.startsWith('0x') ? to : '',
        email: to.includes('@') ? to : undefined,
        tel: !to.includes('@') && to && !to.startsWith('0x') ? to : undefined,
        source: 'pending',
        status: 'pending',
        addedAt: Date.now(),
      };
    }
  }

  saveCounterpart(): void {
    this.saveError = '';
    if (!this.ownerAddress || !this.counterpart) {
      this.saveError = 'Wallet requis pour enregistrer le contact.';
      return;
    }
    try {
      this.counterpart = this.contactsSvc.upsertFromShare(this.ownerAddress, {
        name: this.counterpart.name,
        address: this.counterpart.address || undefined,
        tel: this.counterpart.tel,
        email: this.counterpart.email,
      });
    } catch (err) {
      this.saveError = err instanceof Error ? err.message : 'Impossible d\'enregistrer';
    }
  }
}
