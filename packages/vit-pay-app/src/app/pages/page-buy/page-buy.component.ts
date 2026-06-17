import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ethers } from 'ethers';
import jsQR from 'jsqr';
import { WalletService } from '../../wallet/wallet.service';
import {
  formatZchfAmount,
  isValidEvmAddress,
  mapPaymasterError,
  parseZchfAmount,
} from '../../wallet/wallet.utils';
import { UserOperationResult } from '../../wallet/wallet.types';
import { ContactsService, Contact } from '../../contacts/contacts.service';

type Step = 'idle' | 'scanning' | 'confirm' | 'sending' | 'done' | 'error';

@Component({
  selector: 'vit-page-buy',
  templateUrl: './page-buy.component.html',
  styleUrl: './page-buy.component.scss',
})
export class PageBuyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  step: Step = 'idle';
  to = '';
  amount = '';
  errorMessage = '';
  lastResult?: UserOperationResult;

  contactsOpen = false;
  contacts: Contact[] = [];
  matchedContact?: Contact;

  private stream?: MediaStream;
  private detector?: any;
  private rafId?: number;
  private scanCanvas?: HTMLCanvasElement;
  private ownerAddress = '';

  constructor(
    private wallet: WalletService,
    private zone: NgZone,
    private contactsSvc: ContactsService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (state) {
        this.ownerAddress = state.accountAddress;
        this.contacts = this.contactsSvc.list(this.ownerAddress);
      }
    } catch {
      /* no wallet — fine, contact picker stays empty */
    }
  }

  openContacts(): void {
    if (this.ownerAddress) {
      this.contacts = this.contactsSvc.list(this.ownerAddress);
    }
    this.contactsOpen = true;
  }
  closeContacts(): void { this.contactsOpen = false; }

  pickContact(c: Contact): void {
    this.to = c.address;
    this.matchedContact = c;
    this.contactsOpen = false;
  }

  onToChange(): void {
    if (!this.ownerAddress || !this.to) { this.matchedContact = undefined; return; }
    this.matchedContact = this.contactsSvc.findByAddress(this.ownerAddress, this.to);
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  async startScan(): Promise<void> {
    this.errorMessage = '';
    this.step = 'scanning';

    // wait for *ngIf="step === 'scanning'" to render the <video> in DOM
    await new Promise((r) => setTimeout(r, 50));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia non disponible sur ce navigateur.');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const video = this.videoRef?.nativeElement;
      if (!video) throw new Error('Élément vidéo introuvable.');
      video.srcObject = this.stream;
      await video.play();

      // prefer native BarcodeDetector, fall back to jsQR
      if (typeof (globalThis as any).BarcodeDetector === 'function') {
        try {
          this.detector = new (globalThis as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          this.detector = undefined;
        }
      }

      this.zone.runOutsideAngular(() => this.tickScan());
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.step = 'error';
      this.stopScan();
    }
  }

  private tickScan(): void {
    if (this.step !== 'scanning') return;
    const video = this.videoRef?.nativeElement;
    if (!video || video.readyState < 2) {
      this.rafId = requestAnimationFrame(() => this.tickScan());
      return;
    }

    if (this.detector) {
      this.detector
        .detect(video)
        .then((codes: any[]) => {
          if (codes.length > 0) {
            this.zone.run(() => this.handleScanned(codes[0].rawValue));
            return;
          }
          this.rafId = requestAnimationFrame(() => this.tickScan());
        })
        .catch(() => {
          this.rafId = requestAnimationFrame(() => this.tickScan());
        });
      return;
    }

    // jsQR fallback
    if (!this.scanCanvas) this.scanCanvas = document.createElement('canvas');
    const canvas = this.scanCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) {
      this.zone.run(() => this.handleScanned(code.data));
      return;
    }
    this.rafId = requestAnimationFrame(() => this.tickScan());
  }

  private handleScanned(value: string): void {
    const parsed = parseEip681(value);
    if (!parsed.address) {
      this.errorMessage = 'QR invalide : aucune adresse Ethereum détectée.';
      this.step = 'error';
      this.stopScan();
      return;
    }
    this.to = parsed.address;
    if (parsed.amountWei !== undefined) {
      try {
        this.amount = formatZchfAmount(parsed.amountWei);
      } catch {
        this.amount = '';
      }
    }
    this.step = 'confirm';
    this.stopScan();
  }

  stopScan(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = undefined;
    }
    const video = this.videoRef?.nativeElement;
    if (video) video.srcObject = null;
  }

  manualEntry(): void {
    this.step = 'confirm';
  }

  async send(): Promise<void> {
    this.errorMessage = '';
    if (!isValidEvmAddress(this.to)) {
      this.errorMessage = 'Adresse destinataire invalide.';
      return;
    }
    let amountWei: bigint;
    try {
      amountWei = parseZchfAmount(this.amount);
      if (amountWei <= 0n) throw new Error('Montant invalide');
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Montant invalide';
      return;
    }
    this.step = 'sending';
    try {
      const result = await this.wallet.sendZchfPayment(this.to, amountWei);
      this.lastResult = result;
      if (result.success) {
        this.step = 'done';
      } else {
        this.errorMessage = mapPaymasterError(new Error(result.error ?? 'Erreur inconnue'));
        this.step = 'error';
      }
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.step = 'error';
    }
  }

  reset(): void {
    this.stopScan();
    this.step = 'idle';
    this.to = '';
    this.amount = '';
    this.errorMessage = '';
    this.lastResult = undefined;
  }
}

function parseEip681(raw: string): { address?: string; amountWei?: bigint } {
  const trimmed = raw.trim();

  if (trimmed.startsWith('ethereum:')) {
    const rest = trimmed.slice('ethereum:'.length);
    const [target, query] = rest.split('?');

    let address: string | undefined;
    let amountWei: bigint | undefined;

    if (target.includes('/transfer')) {
      const params = new URLSearchParams(query ?? '');
      const to = params.get('address') ?? undefined;
      if (to && ethers.isAddress(to)) address = ethers.getAddress(to);
      const uint = params.get('uint256');
      if (uint) {
        try { amountWei = BigInt(uint); } catch { /* ignore */ }
      }
    } else {
      const addrCandidate = target.split('@')[0];
      if (ethers.isAddress(addrCandidate)) address = ethers.getAddress(addrCandidate);
      const params = new URLSearchParams(query ?? '');
      const value = params.get('value');
      if (value) {
        try { amountWei = BigInt(value); } catch { /* ignore */ }
      }
    }
    return { address, amountWei };
  }

  if (ethers.isAddress(trimmed)) {
    return { address: ethers.getAddress(trimmed) };
  }

  return {};
}
