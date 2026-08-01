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
import { ContactAccessService } from '../../contacts/contact-access.service';
import { ClaimLinkService } from '../../claimlink/claimlink.service';
import { TxOverlayService } from '../../wallet/tx-overlay.service';

type Step = 'scanning' | 'confirm' | 'sending' | 'done' | 'error';
type RecipientKind = 'address' | 'email' | 'phone' | 'unknown';

/** Proposition de destinataire : carnet local ou carnet distant autorisé. */
interface RecipientSuggestion {
  name: string;
  /** Ce qui est injecté dans le champ : adresse 0x…, e-mail ou téléphone. */
  value: string;
  meta: string;
  remote: boolean;
}

@Component({
  selector: 'vit-page-buy',
  templateUrl: './page-buy.component.html',
  styleUrl: './page-buy.component.scss',
})
export class PageBuyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  step: Step = 'confirm';
  to = '';
  amount = '';
  errorMessage = '';
  lastResult?: UserOperationResult;

  // Envoi par lien (claim link) quand le destinataire est un e-mail ou un téléphone
  sentViaLink = false;
  claimUrl = '';
  claimKind: RecipientKind = 'unknown';
  claimRecipient = '';
  copied = false;

  contactsOpen = false;
  contacts: Contact[] = [];
  matchedContact?: Contact;
  suggestions: RecipientSuggestion[] = [];

  private stream?: MediaStream;
  private detector?: any;
  private rafId?: number;
  private scanCanvas?: HTMLCanvasElement;
  private ownerAddress = '';

  constructor(
    private wallet: WalletService,
    private zone: NgZone,
    private contactsSvc: ContactsService,
    private contactAccess: ContactAccessService,
    private route: ActivatedRoute,
    private claimLink: ClaimLinkService,
    private txOverlay: TxOverlayService,
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

    const params = this.route.snapshot.queryParamMap;
    const to = params.get('to');
    const amount = params.get('amount');
    if (to && isValidEvmAddress(to)) {
      this.to = ethers.getAddress(to);
      this.onToChange();
      if (amount) this.amount = amount;
      this.step = 'confirm';
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
    this.step = 'confirm';
  }

  onToChange(): void {
    if (!this.ownerAddress || !this.to) {
      this.matchedContact = undefined;
      this.suggestions = [];
      return;
    }
    this.matchedContact = this.contactsSvc.findByAddress(this.ownerAddress, this.to);
    this.suggestions = this.matchedContact ? [] : this.buildSuggestions(this.to);
  }

  pickSuggestion(s: RecipientSuggestion): void {
    this.to = s.value;
    this.suggestions = [];
    this.onToChange();
  }

  /**
   * Carnet local d'abord, puis les carnets Google / Microsoft autorisés depuis
   * `/contacts/access` — l'annuaire est déjà en cache, aucune requête réseau.
   */
  private buildSuggestions(query: string): RecipientSuggestion[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || isValidEvmAddress(query.trim())) return [];

    const out: RecipientSuggestion[] = [];
    const seen = new Set<string>();

    for (const c of this.contacts) {
      if (!c.name.toLowerCase().includes(q)) continue;
      const value = c.address || c.email || c.tel;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({
        name: c.name,
        value,
        meta: c.address ? shortAddress(c.address) : (c.email || c.tel || ''),
        remote: false,
      });
      if (out.length >= 5) return out;
    }

    for (const s of this.contactAccess.search(this.ownerAddress, q)) {
      // Sans e-mail ni téléphone on ne saurait pas où envoyer le lien.
      const value = s.email || s.tel;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({ name: s.name, value, meta: value, remote: true });
      if (out.length >= 5) break;
    }

    return out;
  }

  /** Type de destinataire saisi, pour adapter le libellé du bouton / les indices. */
  get recipientMode(): RecipientKind {
    return recipientKind(this.to);
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

  async send(): Promise<void> {
    this.errorMessage = '';
    const recipient = this.to.trim();
    const kind = recipientKind(recipient);
    if (kind === 'unknown') {
      this.errorMessage = 'Entrez une adresse 0x…, un e-mail ou un numéro de téléphone.';
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

    if (kind === 'email' || kind === 'phone') {
      await this.sendViaClaimLink(recipient, kind, amountWei);
      return;
    }

    // Adresse EVM → paiement direct on-chain
    this.sentViaLink = false;
    this.step = 'sending';
    // Blocking overlay: signing + bundler inclusion can take a few seconds and
    // must not look like a dead screen, nor allow a second submit.
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

  /**
   * Destinataire e-mail / téléphone : on bloque les fonds dans un claim link,
   * puis on ouvre un brouillon e-mail (mailto:) ou SMS (sms:) contenant le lien.
   */
  private async sendViaClaimLink(recipient: string, kind: 'email' | 'phone', amountWei: bigint): Promise<void> {
    if (!this.claimLink.contractAddress()) {
      this.errorMessage = 'Envoi par lien indisponible : contrat claim link non configuré.';
      this.step = 'error';
      return;
    }
    this.step = 'sending';
    this.txOverlay.show(`Blocage de ${this.amount} xCHF…`);
    try {
      const state = await this.wallet.loadWallet();
      const { link, url } = await this.claimLink.create(amountWei, 0n);
      if (state) {
        this.contactsSvc.upsertPending(state.accountAddress, {
          name: recipient,
          tel: kind === 'phone' ? recipient : undefined,
          email: kind === 'email' ? recipient : undefined,
          claimId: link.id,
          note: `${this.amount} xCHF en attente`,
        });
      }
      this.sentViaLink = true;
      this.claimUrl = url;
      this.claimKind = kind;
      this.claimRecipient = recipient;
      this.txOverlay.succeed('Lien prêt');
      this.openDraft(recipient, kind, url);
      this.step = 'done';
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail('Envoi impossible', this.errorMessage);
      this.step = 'error';
    }
  }

  /** (Re)ouvre le brouillon e-mail / SMS pré-rempli avec le claim link. */
  openDraft(recipient = this.claimRecipient, kind = this.claimKind, url = this.claimUrl): void {
    if (!url) return;
    const body = `Je t'envoie ${this.amount} xCHF via ViTpay. Récupère-les avec ce lien : ${url}`;
    if (kind === 'email') {
      const subject = 'Tu as reçu des xCHF';
      window.location.href =
        `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (kind === 'phone') {
      // Numéro nettoyé (l'utilisateur peut saisir espaces / () / - qui cassent l'URI sms:).
      const number = recipient.replace(/[^\d+]/g, '');
      // iOS attend le séparateur « & » pour le corps du SMS ; Android (et les autres)
      // attendent « ? ». Sans ce distinguo, le message pré-rempli est perdu sur l'un des deux.
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

  reset(): void {
    this.stopScan();
    this.step = 'confirm';
    this.to = '';
    this.amount = '';
    this.errorMessage = '';
    this.lastResult = undefined;
    this.sentViaLink = false;
    this.claimUrl = '';
    this.claimKind = 'unknown';
    this.claimRecipient = '';
    this.copied = false;
  }
}

/** Détecte iOS/iPadOS (l'iPad récent se présente comme « MacIntel » tactile). */
function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
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
