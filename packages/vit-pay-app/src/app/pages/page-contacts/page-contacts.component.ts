import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ethers } from 'ethers';
import * as QRCode from 'qrcode';
import { WalletService } from '../../wallet/wallet.service';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import { ContactAccessService, DirectoryMatch } from '../../contacts/contact-access.service';
import {
  ContactCardPayload,
  buildContactShareUrl,
  encodeContactCard,
  decodeContactCard,
  extractCardParam,
} from '../../contacts/contact-share';
import { QrScanner } from '../../shared/qr-scanner';
import { shortAddress } from '../../wallet/wallet.utils';
import { environment } from '../../../environments/environment';

type View = 'list' | 'form' | 'card' | 'scan';

@Component({
  selector: 'vit-page-contacts',
  templateUrl: './page-contacts.component.html',
  styleUrl: './page-contacts.component.scss',
})
export class PageContactsComponent implements OnInit, OnDestroy {
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('scanVideo') scanVideo?: ElementRef<HTMLVideoElement>;

  view: View = 'list';
  contacts: Contact[] = [];
  owner = '';
  hasWallet = false;
  error = '';
  notice = '';
  busy = false;

  phonePickerSupported = false;
  /** Au moins un carnet distant autorisé — pilote l'icône d'état. */
  accessActive = false;

  prefillFromPhone: Array<{ name: string; hint?: string }> = [];

  /** Recherche : filtre le carnet local et interroge les carnets distants. */
  query = '';
  filtered: Contact[] = [];
  suggestions: DirectoryMatch[] = [];

  // form
  formId: string | undefined;
  formName = '';
  formAddress = '';
  formTel = '';
  formEmail = '';
  formNote = '';
  formSource: Contact['source'] = 'manual';

  // carte partagée (la mienne ou celle d'un contact)
  cardTitle = '';
  cardSubtitle = '';
  cardUrl = '';
  cardIsMine = false;
  copied = false;

  private profile: ContactCardPayload | null = null;
  private readonly scanner = new QrScanner();

  short = shortAddress;

  contactMeta(c: Contact): string {
    if (c.tel) return c.tel;
    if (c.email) return c.email;
    if (c.address) return shortAddress(c.address);
    return 'Sans coordonnées';
  }

  constructor(
    private wallet: WalletService,
    private contactsSvc: ContactsService,
    private access: ContactAccessService,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
  ) {}

  async ngOnInit(): Promise<void> {
    this.phonePickerSupported = this.contactsSvc.isPhonePickerSupported();

    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.accessActive = this.access.hasAnyConnected(this.owner);
      this.reloadContacts();
      this.profile = {
        n: state.displayName || shortAddress(state.accountAddress),
        a: state.accountAddress,
        t: state.profileTel,
        e: state.profileEmail,
        w: state.walletName,
      };
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
      return;
    }

    const params = this.route.snapshot.queryParamMap;
    const add = params.get('add');
    if (add) {
      this.acceptCard(add);
      return;
    }
    if (params.get('me') !== null) this.showMyCard();
  }

  ngOnDestroy(): void {
    this.scanner.stop();
  }

  /**
   * Recalculé à la frappe seulement : un getter re-filtrerait la liste à chaque
   * cycle de détection de changements.
   */
  onSearch(): void {
    const q = this.query.trim().toLowerCase();
    this.filtered = q
      ? this.contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            !!c.email?.toLowerCase().includes(q) ||
            !!c.tel?.includes(q) ||
            c.address.toLowerCase().includes(q),
        )
      : this.contacts;

    // Carnets distants : on masque ceux déjà présents localement.
    const known = new Set(
      this.contacts.flatMap((c) => [
        c.name.toLowerCase(),
        ...(c.email ? [c.email.toLowerCase()] : []),
        ...(c.tel ? [c.tel] : []),
      ]),
    );
    this.suggestions = this.access
      .search(this.owner, q)
      .filter(
        (s) =>
          !known.has(s.name.toLowerCase()) &&
          !(s.email && known.has(s.email.toLowerCase())) &&
          !(s.tel && known.has(s.tel)),
      );
  }

  private reloadContacts(): void {
    this.contacts = this.contactsSvc.list(this.owner);
    this.onSearch();
  }

  /** Une fiche distante devient un contact local (sans address). */
  addSuggestion(s: DirectoryMatch): void {
    this.resetForm();
    this.formName = s.name;
    this.formTel = s.tel || '';
    this.formEmail = s.email || '';
    this.formSource = 'phone';
    this.view = 'form';
  }

  // === Formulaire ===========================================================

  openAdd(): void {
    this.resetForm();
    this.view = 'form';
  }

  openEdit(c: Contact): void {
    this.resetForm();
    this.formId = c.id;
    this.formName = c.name;
    this.formAddress = c.address;
    this.formTel = c.tel || '';
    this.formEmail = c.email || '';
    this.formNote = c.note || '';
    this.formSource = c.source;
    this.view = 'form';
  }

  cancel(): void {
    this.view = 'list';
    this.error = '';
    this.prefillFromPhone = [];
  }

  /** Retour générique du topbar : coupe la caméra si le scan tournait. */
  back(): void {
    this.scanner.stop();
    this.notice = '';
    this.cancel();
  }

  save(): void {
    this.error = '';
    try {
      // L'address est facultative : un contact peut n'être qu'un nom + tel/e-mail
      // tant qu'on n'a pas scanné sa carte ViT.
      const address = this.formAddress.trim();
      if (address && !ethers.isAddress(address)) {
        throw new Error('Address Ethereum invalide');
      }
      this.contactsSvc.upsert(this.owner, {
        id: this.formId,
        name: this.formName,
        address,
        tel: this.formTel,
        email: this.formEmail,
        note: this.formNote,
        source: this.formSource,
        status: address ? 'confirmed' : 'pending',
      });
      this.reloadContacts();
      this.view = 'list';
      this.prefillFromPhone = [];
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    }
  }

  remove(c: Contact): void {
    if (!confirm(`Supprimer « ${c.name} » ?`)) return;
    this.contactsSvc.remove(this.owner, c.id);
    this.reloadContacts();
  }

  // === Carte QR =============================================================

  showMyCard(): void {
    if (!this.profile) return;
    this.openCard(this.profile, true);
  }

  shareContact(c: Contact): void {
    this.openCard({ n: c.name, a: c.address, t: c.tel, e: c.email }, false);
  }

  private openCard(card: ContactCardPayload, mine: boolean): void {
    this.error = '';
    this.copied = false;
    this.cardIsMine = mine;
    this.cardTitle = card.n;
    this.cardSubtitle = card.w ? `${card.w}@3vit.ch` : shortAddress(card.a || '');
    try {
      this.cardUrl = buildContactShareUrl(encodeContactCard(card), environment.hashRoute);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
      return;
    }
    this.view = 'card';
    setTimeout(() => this.renderCardQr());
  }

  private async renderCardQr(): Promise<void> {
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas || !this.cardUrl) return;
    try {
      await QRCode.toCanvas(canvas, this.cardUrl, {
        width: 232,
        margin: 1,
        color: { dark: '#1D1D1D', light: '#FFFFFF' },
      });
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'QR illisible';
    }
  }

  async copyCardUrl(): Promise<void> {
    if (!this.cardUrl) return;
    try {
      await navigator.clipboard.writeText(this.cardUrl);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      window.prompt('Copier le lien :', this.cardUrl);
    }
  }

  async shareCardUrl(): Promise<void> {
    if (!this.cardUrl) return;
    if (!navigator.share) {
      await this.copyCardUrl();
      return;
    }
    try {
      await navigator.share({ title: `Contact ViT — ${this.cardTitle}`, url: this.cardUrl });
    } catch {
      // partage annulé par l'utilisateur
    }
  }

  // === Scan =================================================================

  async startScan(): Promise<void> {
    this.error = '';
    this.notice = '';
    this.view = 'scan';
    // laisse le *ngIf rendre la <video> avant de brancher le flux
    await new Promise((r) => setTimeout(r, 80));
    let video = this.scanVideo?.nativeElement;
    for (let i = 0; !video && i < 10; i++) {
      await new Promise((r) => setTimeout(r, 40));
      video = this.scanVideo?.nativeElement;
    }
    if (!video) {
      this.error = 'Élément vidéo introuvable.';
      this.view = 'list';
      return;
    }
    try {
      await this.scanner.start(video, (value) =>
        this.zone.run(() => this.onScanned(value)),
      );
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Caméra indisponible';
      this.view = 'list';
    }
  }

  stopScan(): void {
    this.scanner.stop();
    this.view = 'list';
  }

  private onScanned(value: string): boolean {
    const raw = extractCardParam(value);
    if (!raw) return false; // ignore, continue le scan
    this.acceptCard(raw);
    return true;
  }

  /** Enregistre automatiquement une carte reçue (URL `?add=` ou QR) — sans doublon. */
  private acceptCard(raw: string): void {
    const card = decodeContactCard(raw);
    if (!card) {
      this.error = 'Carte de contact illisible.';
      this.view = 'list';
      return;
    }
    if (card.a && card.a.toLowerCase() === this.owner.toLowerCase()) {
      this.error = 'Cette carte est la tienne.';
      this.view = 'list';
      return;
    }
    try {
      const saved = this.contactsSvc.upsertFromShare(this.owner, {
        name: card.n,
        address: card.a,
        tel: card.t,
        email: card.e,
      });
      this.reloadContacts();
      this.notice = `« ${saved.name} » ajouté au carnet.`;
      this.view = 'list';
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Impossible d\'ajouter le contact';
      this.view = 'list';
    }
    // Évite de re-déclencher l'ajout au refresh / retour arrière.
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  // === Imports ==============================================================

  async importFromPhone(): Promise<void> {
    this.error = '';
    const picked = await this.contactsSvc.pickFromPhone();
    if (!picked) {
      this.error = "Ton appareil ne permet pas l'accès aux contacts (iOS, ou navigateur non compatible).";
      return;
    }
    this.handlePrefill(picked);
  }

  private handlePrefill(picked: Array<{ name: string; hint?: string; tel?: string; email?: string }>): void {
    this.prefillFromPhone = picked;
    if (picked.length === 1) {
      this.resetForm();
      this.formName = picked[0].name;
      this.formTel = picked[0].tel || '';
      this.formEmail = picked[0].email || '';
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

  private resetForm(): void {
    this.formId = undefined;
    this.formName = '';
    this.formAddress = '';
    this.formTel = '';
    this.formEmail = '';
    this.formNote = '';
    this.formSource = 'manual';
    this.error = '';
    this.notice = '';
  }
}
