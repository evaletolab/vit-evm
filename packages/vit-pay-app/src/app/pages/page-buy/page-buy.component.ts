import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ethers } from 'ethers';
import jsQR from 'jsqr';
import { WalletService } from '../../wallet/wallet.service';
import {
  formatZchfAmount,
  isValidEvmAddress,
  mapPaymasterError,
  parseZchfAmount,
  shortAddress,
} from '../../wallet/wallet.utils';
import { UserOperationResult } from '../../wallet/wallet.types';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import { decodeContactCard, extractCardParam } from '../../contacts/contact-share';
import { ClaimLinkService } from '../../claimlink/claimlink.service';
import { TxOverlayService } from '../../wallet/tx-overlay.service';

type Step = 'scanning' | 'confirm' | 'sending' | 'done' | 'error';
type RecipientKind = 'address' | 'email' | 'phone' | 'unknown';

/**
 * Envoyer : le destinataire arrive par l'URL (depuis l'accueil).
 * Sans contact → QR à scanner. Plus de saisie libre ici.
 */
@Component({
  selector: 'vit-page-buy',
  templateUrl: './page-buy.component.html',
  styleUrl: './page-buy.component.scss',
})
export class PageBuyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  step: Step = 'scanning';
  to = '';
  amount = '';
  errorMessage = '';
  lastResult?: UserOperationResult;

  sentViaLink = false;
  claimUrl = '';
  claimKind: RecipientKind = 'unknown';
  claimRecipient = '';
  copied = false;

  matchedContact?: Contact;
  /** Contact issu d'un lien/carte partagée (`c=`) — bouton save dans counterpart. */
  fromSharedCard = false;
  saveError = '';

  private stream?: MediaStream;
  private detector?: any;
  private rafId?: number;
  private scanCanvas?: HTMLCanvasElement;
  private ownerAddress = '';

  constructor(
    private wallet: WalletService,
    private zone: NgZone,
    private contactsSvc: ContactsService,
    private route: ActivatedRoute,
    private claimLink: ClaimLinkService,
    private txOverlay: TxOverlayService,
  ) {}

  get isWhitelisted(): boolean {
    const c = this.matchedContact;
    if (!c?.id || c.id === 'incoming') return false;
    return c.source !== 'pending';
  }

  get counterpartMeta(): string {
    const c = this.matchedContact;
    if (!c) return '';
    if (c.tel) return c.tel;
    if (c.email) return c.email;
    if (c.address) return shortAddress(c.address);
    return this.to || '';
  }

  /** Adresse on-chain du destinataire, si connue. */
  get resolvedAddress(): string {
    const fromContact = this.matchedContact?.address?.trim() || '';
    if (fromContact && isValidEvmAddress(fromContact)) return ethers.getAddress(fromContact);
    const fromTo = this.to.trim();
    if (fromTo && isValidEvmAddress(fromTo)) return ethers.getAddress(fromTo);
    return '';
  }

  /** Sans adresse → claim link (e-mail / SMS / partage). */
  get recipientMode(): RecipientKind {
    if (this.resolvedAddress) return 'address';
    const email = this.matchedContact?.email?.trim() || '';
    if (email || recipientKind(this.to) === 'email') return 'email';
    const tel = this.matchedContact?.tel?.trim() || '';
    if (tel || recipientKind(this.to) === 'phone') return 'phone';
    // Contact sans adresse ni canal : claim link à partager manuellement.
    if (this.matchedContact) return 'unknown';
    return recipientKind(this.to);
  }

  get canSend(): boolean {
    if (!this.amount.trim()) return false;
    if (this.resolvedAddress) return true;
    // Claim link : contact sans adresse (ou email/tel dans `to`).
    return !!this.matchedContact || this.recipientMode === 'email' || this.recipientMode === 'phone';
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (state) this.ownerAddress = state.accountAddress;
    } catch {
      /* no wallet */
    }

    const params = this.route.snapshot.queryParamMap;
    const to = params.get('to')?.trim() || '';
    const name = params.get('name')?.trim() || '';
    const amount = params.get('amount');
    const cardRaw = params.get('c');

    if (to || name || cardRaw) {
      this.applyCounterpart({ to, name, cardRaw });
      if (amount) this.amount = amount;
      this.step = 'confirm';
      return;
    }

    // Aucun contact → QR à scanner.
    await this.startScan();
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  /** Résout le destinataire depuis l'URL (carnet local, carte `c=`, ou fiche temporaire). */
  private applyCounterpart(opts: { to: string; name: string; cardRaw: string | null }): void {
    const { to, name, cardRaw } = opts;
    const list = this.ownerAddress ? this.contactsSvc.list(this.ownerAddress) : [];
    this.fromSharedCard = !!cardRaw;
    this.saveError = '';

    if (to && isValidEvmAddress(to)) {
      this.to = ethers.getAddress(to);
      this.matchedContact = this.contactsSvc.findByAddress(this.ownerAddress, this.to);
    } else if (to) {
      this.to = to;
      this.matchedContact = list.find(
        (c) =>
          (!!c.email && c.email.toLowerCase() === to.toLowerCase()) ||
          (!!c.tel && c.tel.replace(/[\s().-]/g, '') === to.replace(/[\s().-]/g, '')),
      );
    }

    if (!this.matchedContact && cardRaw) {
      const card = decodeContactCard(cardRaw);
      if (card?.n) {
        const address =
          (card.a && isValidEvmAddress(card.a) ? ethers.getAddress(card.a) : '')
          || (this.to && isValidEvmAddress(this.to) ? this.to : '');
        if (!this.to && address) this.to = address;

        // Lien de contact ouvert → whitelist auto (sans doublon).
        if (this.ownerAddress) {
          this.matchedContact = this.contactsSvc.upsertFromShare(this.ownerAddress, {
            name: card.n,
            address: address || undefined,
            tel: card.t,
            email: card.e,
          });
        } else {
          this.matchedContact = {
            id: 'incoming',
            name: card.n,
            address,
            tel: card.t,
            email: card.e,
            source: 'manual',
            status: 'unconfirmed',
            addedAt: Date.now(),
          };
        }
      }
    }

    if (!this.matchedContact && (name || to)) {
      this.matchedContact = {
        id: '',
        name: name || (isValidEvmAddress(to) ? shortAddress(to) : to),
        address: to && isValidEvmAddress(to) ? ethers.getAddress(to) : '',
        email: to.includes('@') ? to : undefined,
        tel: !to.includes('@') && to && !isValidEvmAddress(to) ? to : undefined,
        source: 'pending',
        status: 'pending',
        addedAt: Date.now(),
      };
      if (!this.to) this.to = to || name;
    }
  }

  /** Enregistre le counterpart dans le carnet (dédupliqué). */
  saveCounterpart(): void {
    this.saveError = '';
    if (!this.ownerAddress || !this.matchedContact) {
      this.saveError = 'Wallet requis pour enregistrer le contact.';
      return;
    }
    try {
      this.matchedContact = this.contactsSvc.upsertFromShare(this.ownerAddress, {
        name: this.matchedContact.name,
        address: this.matchedContact.address || undefined,
        tel: this.matchedContact.tel,
        email: this.matchedContact.email,
      });
      this.fromSharedCard = true;
    } catch (err) {
      this.saveError = err instanceof Error ? err.message : 'Impossible d\'enregistrer';
    }
  }

  async startScan(): Promise<void> {
    this.errorMessage = '';
    this.step = 'scanning';
    this.stopScan();
    // Laisse le *ngIf monter la <video> avant getUserMedia.
    await new Promise((r) => setTimeout(r, 80));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia non disponible sur ce navigateur.');
      }

      let video = this.videoRef?.nativeElement;
      for (let i = 0; !video && i < 10; i++) {
        await new Promise((r) => setTimeout(r, 40));
        video = this.videoRef?.nativeElement;
      }
      if (!video) throw new Error('Élément vidéo introuvable.');

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      video.srcObject = this.stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();

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
      this.step = 'confirm';
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
          // BarcodeDetector instable → bascule jsQR sans redémarrer la caméra.
          this.detector = undefined;
          this.rafId = requestAnimationFrame(() => this.tickScan());
        });
      return;
    }

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
    const raw = value.trim();
    if (!raw) {
      this.continueScan();
      return;
    }

    // Lien ViT (/#/buy?… ou /buy?…) — params souvent dans le hash.
    const params = queryFromScanned(raw);
    const to = params.get('to')?.trim() || '';
    const name = params.get('name')?.trim() || '';
    const amount = params.get('amount');
    const c = params.get('c');
    if (to || c || name) {
      this.applyCounterpart({ to, name, cardRaw: c });
      if (amount) this.amount = amount;
      this.step = 'confirm';
      this.stopScan();
      return;
    }

    // Carte de contact partagée (?add=…).
    const add = extractCardParam(raw);
    if (add) {
      const card = decodeContactCard(add);
      if (card?.n) {
        this.applyCounterpart({
          to: card.a || '',
          name: card.n,
          cardRaw: add,
        });
        this.step = 'confirm';
        this.stopScan();
        return;
      }
    }

    const parsed = parseEip681(raw);
    if (!parsed.address) {
      // QR non pertinent : on ignore et on continue sans couper la caméra (évite le blink).
      this.continueScan();
      return;
    }
    this.applyCounterpart({ to: parsed.address, name: '', cardRaw: null });
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

  /** Reprend la boucle de scan sans redémarrer getUserMedia. */
  private continueScan(): void {
    if (this.step !== 'scanning') return;
    this.rafId = requestAnimationFrame(() => this.tickScan());
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

  async send(): Promise<void> {
    this.errorMessage = '';
    let amountWei: bigint;
    try {
      amountWei = parseZchfAmount(this.amount);
      if (amountWei <= 0n) throw new Error('Montant invalide');
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Montant invalide';
      return;
    }

    const address = this.resolvedAddress;
    if (address) {
      await this.sendOnChain(address, amountWei);
      return;
    }

    // Pas d'adresse Safe/EOA → claim link (e-mail, SMS, ou partage manuel).
    const mode = this.recipientMode;
    const email = this.matchedContact?.email?.trim()
      || (recipientKind(this.to) === 'email' ? this.to.trim() : '');
    const phone = this.matchedContact?.tel?.trim()
      || (recipientKind(this.to) === 'phone' ? this.to.trim() : '');
    const kind: RecipientKind = email ? 'email' : phone ? 'phone' : mode === 'unknown' ? 'unknown' : mode;
    const recipient = email || phone || this.matchedContact?.name || this.to.trim();
    if (!recipient) {
      this.errorMessage = 'Destinataire invalide.';
      return;
    }
    await this.sendViaClaimLink(recipient, kind, amountWei);
  }

  private async sendOnChain(recipient: string, amountWei: bigint): Promise<void> {
    this.sentViaLink = false;
    this.step = 'sending';
    this.txOverlay.show(`Envoi de ${this.amount} xCHF…`);
    try {
      const result = await this.wallet.sendZchfPayment(recipient, amountWei);
      this.lastResult = result;
      if (result.success) {
        this.txOverlay.succeed('Paiement envoyé');
        this.step = 'done';
      } else {
        this.errorMessage = mapPaymasterError(new Error(result.error ?? 'Erreur inconnue'));
        this.txOverlay.fail('Paiement refusé', this.errorMessage);
        this.step = 'error';
      }
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail('Paiement refusé', this.errorMessage);
      this.step = 'error';
    }
  }

  private async sendViaClaimLink(
    recipient: string,
    kind: RecipientKind,
    amountWei: bigint,
  ): Promise<void> {
    if (!this.claimLink.contractAddress()) {
      this.errorMessage = 'Envoi par lien indisponible : contrat claim link non configuré.';
      this.step = 'error';
      return;
    }
    this.step = 'sending';
    this.txOverlay.show(`Blocage de ${this.amount} xCHF…`);
    try {
      const state = await this.wallet.loadWallet();
      const { link, url } = await this.claimLink.create(amountWei, 0n, {
        contact: this.matchedContact?.name
          ? {
              n: this.matchedContact.name,
              ...(this.matchedContact.tel ? { t: this.matchedContact.tel } : {}),
              ...(this.matchedContact.email ? { e: this.matchedContact.email } : {}),
            }
          : undefined,
      });
      if (state) {
        this.contactsSvc.upsertPending(state.accountAddress, {
          name: this.matchedContact?.name || recipient,
          tel: kind === 'phone' ? recipient : this.matchedContact?.tel,
          email: kind === 'email' ? recipient : this.matchedContact?.email,
          claimId: link.id,
          note: `${this.amount} xCHF en attente`,
        });
      }
      this.sentViaLink = true;
      this.claimUrl = url;
      this.claimKind = kind;
      this.claimRecipient = recipient;
      this.txOverlay.succeed('Lien prêt');
      if (kind === 'email' || kind === 'phone') {
        this.openDraft(recipient, kind, url);
      }
      this.step = 'done';
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail('Envoi impossible', this.errorMessage);
      this.step = 'error';
    }
  }

  openDraft(recipient = this.claimRecipient, kind = this.claimKind, url = this.claimUrl): void {
    if (!url) return;
    const body = `Je t'envoie ${this.amount} xCHF via ViTpay. Récupère-les avec ce lien : ${url}`;
    if (kind === 'email') {
      const subject = 'Tu as reçu des xCHF';
      window.location.href =
        `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (kind === 'phone') {
      const number = recipient.replace(/[^\d+]/g, '');
      const sep = isIOS() ? '&' : '?';
      window.location.href = `sms:${number}${sep}body=${encodeURIComponent(body)}`;
    }
  }

  async copyClaimUrl(): Promise<void> {
    if (!this.claimUrl) return;
    try {
      await navigator.clipboard.writeText(this.claimUrl);
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 1500);
    } catch {
      /* ignore */
    }
  }
}

function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function queryFromScanned(value: string): URLSearchParams {
  try {
    const url = new URL(value, window.location.origin);
    if ([...url.searchParams.keys()].length > 0) return url.searchParams;
    // hashRoute : params après `#/buy?to=…`
    const hash = url.hash;
    const qi = hash.indexOf('?');
    if (qi >= 0) return new URLSearchParams(hash.slice(qi + 1));
    return url.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function recipientKind(value: string): RecipientKind {
  const v = value.trim();
  if (!v) return 'unknown';
  if (isValidEvmAddress(v)) return 'address';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  const digits = v.replace(/[\s().-]/g, '');
  if (/^\+?[0-9]{6,15}$/.test(digits)) return 'phone';
  return 'unknown';
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
