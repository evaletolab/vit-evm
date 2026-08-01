import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ethers } from 'ethers';
import * as QRCode from 'qrcode';
import { WalletService } from '../../wallet/wallet.service';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import { ContactProviderId, ImportedContact } from '../../contacts/contact-providers';
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

type View = 'list' | 'form' | 'card' | 'scan' | 'import';

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
  googlePickerSupported = false;
  microsoftPickerSupported = false;

  prefillFromPhone: Array<{ name: string; hint?: string }> = [];

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

  // import distant
  imported: ImportedContact[] = [];
  /** Recalculé à la frappe seulement : un getter re-rendrait la liste à chaque cycle. */
  importedFiltered: ImportedContact[] = [];
  importFilter = '';
  importProvider: ContactProviderId = 'google';

  private profile: ContactCardPayload | null = null;
  private readonly scanner = new QrScanner();

  short = shortAddress;

  constructor(
    private wallet: WalletService,
    private contactsSvc: ContactsService,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
  ) {}

  async ngOnInit(): Promise<void> {
    this.phonePickerSupported = this.contactsSvc.isPhonePickerSupported();
    this.googlePickerSupported = this.contactsSvc.isGooglePickerSupported();
    this.microsoftPickerSupported = this.contactsSvc.isMicrosoftPickerSupported();

    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.contacts = this.contactsSvc.list(this.owner);
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

  applyImportFilter(): void {
    const q = this.importFilter.trim().toLowerCase();
    this.importedFiltered = q
      ? this.imported.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            !!c.email?.toLowerCase().includes(q) ||
            !!c.tel?.includes(q),
        )
      : this.imported;
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
    this.view = 'scan';
    // laisse le *ngIf rendre la <video> avant de brancher le flux
    await new Promise((r) => setTimeout(r, 50));
    const video = this.scanVideo?.nativeElement;
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

  private onScanned(value: string): void {
    const raw = extractCardParam(value);
    if (!raw) {
      this.error = "Ce QR n'est pas une carte de contact ViT.";
      this.view = 'list';
      return;
    }
    this.acceptCard(raw);
  }

  /** Pré-remplit le formulaire depuis une carte reçue (URL `?add=` ou QR). */
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
    this.resetForm();
    this.formName = card.n;
    this.formAddress = card.a || '';
    this.formTel = card.t || '';
    this.formEmail = card.e || '';
    this.notice = `Carte reçue de « ${card.n} ». Vérifie puis enregistre.`;
    this.view = 'form';
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

  async importFrom(provider: ContactProviderId): Promise<void> {
    this.error = '';
    this.notice = '';
    this.busy = true;
    this.importProvider = provider;
    try {
      const list = await this.contactsSvc.importFromProvider(provider);
      if (!list.length) {
        this.error = 'Aucun contact récupéré.';
        return;
      }
      this.imported = list;
      this.importFilter = '';
      this.applyImportFilter();
      this.view = 'import';
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Import impossible';
    } finally {
      this.busy = false;
    }
  }

  addImported(c: ImportedContact): void {
    this.resetForm();
    this.formName = c.name;
    this.formTel = c.tel || '';
    this.formEmail = c.email || '';
    this.formSource = 'phone';
    this.view = 'form';
  }

  addAllImported(): void {
    const added = this.contactsSvc.importMany(this.owner, this.importedFiltered);
    this.contacts = this.contactsSvc.list(this.owner);
    this.imported = [];
    this.importedFiltered = [];
    this.view = 'list';
    this.notice = added
      ? `${added} contact${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} sans address — scanne leur carte ViT pour les activer.`
      : 'Ces contacts sont déjà dans ton carnet.';
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
