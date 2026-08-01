import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Iso2 } from 'intl-tel-input';
import { WalletService } from '../../wallet/wallet.service';
import { WalletUnlockService } from '../../wallet/wallet-unlock.service';
import { ThemeService } from '../../theme/theme.service';
import {
  RecoveryRequest,
  UserOperationDebug,
  UserOperationResult,
  WalletState,
} from '../../wallet/wallet.types';
import {
  formatZchfAmount,
  isValidEvmAddress,
  isWebAuthnAvailable,
  mapPasskeyError,
  mapPaymasterError,
  parseZchfAmount,
  shortAddress,
} from '../../wallet/wallet.utils';
import {
  isValidWalletName,
  normalizeWalletName,
  WALLET_NAME_DOMAIN,
} from '../../wallet/wallet-name';

type ViewState = 'no-wallet' | 'loading' | 'ready';

@Component({
  selector: 'vit-page-wallet',
  templateUrl: './page-wallet.component.html',
  styleUrl: './page-wallet.component.scss',
})
export class PageWalletComponent implements OnInit, AfterViewInit, OnDestroy {
  view: ViewState = 'no-wallet';
  activeCardIndex = 0;
  private readonly allCardTabs = [
    { title: 'Compte',    icon: 'account_balance_wallet', dev: false },
    { title: 'Recevoir',  icon: 'download',               dev: true  },
  ];
  get cardTabs(): { title: string; icon: string }[] {
    const dev = this.theme.isDevMode();
    return this.allCardTabs.filter((t) => dev || !t.dev);
  }
  get cardTitles(): string[] { return this.cardTabs.map((t) => t.title); }
  get devMode(): boolean { return this.theme.isDevMode(); }
  get nameValid(): boolean {
    return isValidWalletName(this.walletName);
  }
  get showContactFields(): boolean {
    return this.nameValid;
  }
  /** Création active une fois le nom valide et le pseudo de contact renseigné. */
  get canCreate(): boolean {
    return this.nameValid && this.displayName.trim().length >= 2;
  }
  readonly nameDomain = WALLET_NAME_DOMAIN;

  // --- Onboarding contact : un champ par étape (pseudo → tél → e-mail) ---
  readonly contactStepLabels = ['Pseudo', 'Téléphone', 'E-mail', 'Créer'];
  readonly contactStepCount = this.contactStepLabels.length;
  contactStep = 0;
  dragging = false;
  private dragStartX = 0;
  private dragDx = 0;
  /** Au-delà de ce déplacement horizontal, on change d'étape. */
  private static readonly SWIPE_THRESHOLD_PX = 48;
  /** Suisse en tête, puis les pays frontaliers. */
  readonly telCountryOrder: Iso2[] = ['ch', 'fr', 'de', 'it', 'at'];

  get trackTransform(): string {
    return `translateX(calc(${this.contactStep * -100}% + ${this.dragDx}px))`;
  }


  @ViewChild('deck') deckRef?: ElementRef<HTMLElement>;
  @ViewChildren('deckCard') deckCards?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stepFocus') stepFocusEls?: QueryList<ElementRef<HTMLElement>>;
  private cardObserver?: IntersectionObserver;
  state: WalletState | null = null;
  balance: string = '—';
  error?: string;
  /** Non-blocking informational message (e.g. post-restore advice). */
  notice?: string;
  busy = false;

  // faucet (MockZCHF)
  faucetAmount = '100';
  lastFaucet?: UserOperationResult;

  // payment form
  paymentTo = '';
  paymentAmount = '';
  lastPayment?: UserOperationResult;
  dailySpending: {
    spentToday: bigint;
    limit?: bigint;
    remaining?: bigint;
    date: string;
  } = { spentToday: 0n, date: '' };

  // add device
  addDeviceResult?: { address: string; op: UserOperationResult };
  externalOwnerAddress = '';

  // recovery request (dev / account card)
  guardiansInput = '';
  guardianThreshold = 1;
  recoveryRequest: RecoveryRequest | null = null;
  lastRecoveryOp?: UserOperationResult;

  readonly shortAddress = shortAddress;

  iban: string | null = null;
  /** Identité locale <nom>@3vit.ch */
  walletName = '';
  /** Pseudo affiché (contact). */
  displayName = '';
  profileTel = '';
  profileEmail = '';

  /** Codes not armed, or vault skipped. */
  backupKitPending = false;

  constructor(
    private wallet: WalletService,
    private unlock: WalletUnlockService,
    private theme: ThemeService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    try {
      this.iban = localStorage.getItem('vit-iban');
    } catch {
      this.iban = null;
    }
  }

  formatIban(iban: string): string {
    return iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  }

  async ngOnInit(): Promise<void> {
    this.view = 'loading';
    // Pre-fill recovery request from local cache so the UI shows the last known
    // state immediately, even before the on-chain refresh completes.
    this.recoveryRequest = this.wallet.getCachedRecoveryRequest();
    try {
      const state = await this.wallet.loadWallet();
      if (state) {
        this.state = state;
        this.view = 'ready';
        // The kit material cannot be re-derived from storage, so we can only
        // warn: the user has to generate a new recovery code to fix this.
        this.backupKitPending =
          state.backupKitConfirmed === false ||
          (!!state.walletName && !state.recoveryEnabled);
        await this.refreshBalance();
        await this.refreshRecoveryRequest();
        this.redirectAfterCreate();
      } else {
        this.view = 'no-wallet';
        if (!isWebAuthnAvailable()) {
          this.error = mapPasskeyError(new Error('WebAuthn is not available in this browser'));
        }
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.view = 'no-wallet';
    }
  }

  onNameInput(value: string): void {
    this.walletName = normalizeWalletName(value).replace(/[^a-z0-9-]/g, '');
  }

  nextStep(): void {
    this.goToStep(this.contactStep + 1);
  }

  onDragStart(event: PointerEvent): void {
    if (this.busy) return;
    this.dragStartX = event.clientX;
    this.dragDx = 0;
    this.dragging = true;
  }

  onDragMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.dragStartX;
    // Pas de rebond au-delà de la première et de la dernière étape.
    const atStart = this.contactStep === 0 && dx > 0;
    const atEnd = this.contactStep === this.contactStepCount - 1 && dx < 0;
    this.dragDx = atStart || atEnd ? dx / 4 : dx;
  }

  onDragEnd(): void {
    if (!this.dragging) return;
    const dx = this.dragDx;
    this.dragging = false;
    this.dragDx = 0;
    if (Math.abs(dx) < PageWalletComponent.SWIPE_THRESHOLD_PX) return;
    this.goToStep(this.contactStep + (dx < 0 ? 1 : -1));
  }

  goToStep(index: number): void {
    const next = Math.min(Math.max(index, 0), this.contactStepCount - 1);
    if (next === this.contactStep) return;
    this.contactStep = next;
    // Le focus suit l'étape active (input ou CTA).
    setTimeout(() => {
      this.stepFocusEls?.get(next)?.nativeElement.focus({ preventScroll: true });
    });
  }

  openVault(): void {
    const n = this.state?.walletName;
    if (n) void this.router.navigate(['/', n, 'vault']);
  }

  async createWallet(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      if (!isWebAuthnAvailable()) {
        throw new Error('WebAuthn is not available in this browser');
      }
      if (!isValidWalletName(this.walletName)) {
        throw new Error('Choisissez un nom valide (3–20 caractères, a-z 0-9 -)');
      }
      const state = await this.wallet.createWalletWithPasskey(this.walletName, {
        displayName: this.displayName || this.walletName,
        tel: this.profileTel,
        email: this.profileEmail,
      });
      this.state = state;
      await this.router.navigate(['/', state.walletName!, 'vault']);
    } catch (err) {
      this.wallet.abortUnconfirmedWallet();
      const msg = err instanceof Error ? err.message : String(err);
      this.error = /nom|caractères|réservé/i.test(msg) ? msg : mapPasskeyError(err);
    } finally {
      this.busy = false;
    }
  }

  async refreshBalance(): Promise<void> {
    try {
      const raw = await this.wallet.getZchfBalance();
      this.balance = formatZchfAmount(raw);
    } catch {
      this.balance = '—';
    }
    this.dailySpending = this.wallet.getDailySpending();
  }

  formatWei(amount: bigint): string {
    return formatZchfAmount(amount);
  }

  async refreshRecoveryRequest(): Promise<void> {
    try {
      this.recoveryRequest = await this.wallet.getRecoveryRequest();
    } catch {
      this.recoveryRequest = null;
    }
  }

  async mintTestZchf(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.lastFaucet = undefined;
    try {
      const amount = parseZchfAmount(this.faucetAmount);
      const result = await this.wallet.mintTestZchf(amount);
      this.lastFaucet = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshBalance();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async sendPayment(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.lastPayment = undefined;
    try {
      if (!isValidEvmAddress(this.paymentTo)) {
        throw new Error('Adresse destinataire invalide');
      }
      const amount = parseZchfAmount(this.paymentAmount);
      const result = await this.wallet.sendZchfPayment(this.paymentTo, amount);
      this.lastPayment = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshBalance();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async addDevice(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const out = await this.wallet.addDeviceWithPasskey();
      this.addDeviceResult = { address: out.newOwnerAddress, op: out.operation };
      if (!out.operation.success && out.operation.error) {
        this.error = mapPaymasterError(new Error(out.operation.error));
      }
    } catch (err) {
      this.error = mapPasskeyError(err);
    } finally {
      this.busy = false;
    }
  }

  async addOwnerByAddress(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      if (!isValidEvmAddress(this.externalOwnerAddress)) {
        throw new Error('Address EVM invalide');
      }
      const op = await this.wallet.addOwnerByAddress(this.externalOwnerAddress);
      this.addDeviceResult = { address: this.externalOwnerAddress, op };
      if (!op.success && op.error) {
        this.error = mapPaymasterError(new Error(op.error));
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async enableRecovery(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.lastRecoveryOp = undefined;
    try {
      const guardians = this.guardiansInput
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const result = await this.wallet.enableRecovery(
        guardians,
        this.guardianThreshold,
      );
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshRecoveryRequest();
      const reloaded = await this.wallet.loadWallet();
      if (reloaded) this.state = reloaded;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  formatDebug(debug: UserOperationDebug): string {
    return JSON.stringify(debug, null, 2);
  }

  async copyDebug(debug: UserOperationDebug): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formatDebug(debug));
    } catch {
      // clipboard API may be unavailable on non-HTTPS — surface the JSON via prompt
      // so the user can still copy manually.
      window.prompt('Copier le JSON ci-dessous :', this.formatDebug(debug));
    }
  }

  ngAfterViewInit(): void {
    this.deckCards?.changes.subscribe(() => this.setupCardObserver());
    this.setupCardObserver();
  }

  ngOnDestroy(): void {
    this.cardObserver?.disconnect();
  }

  private setupCardObserver(): void {
    this.cardObserver?.disconnect();
    const root = this.deckRef?.nativeElement;
    const cards = this.deckCards?.toArray() ?? [];
    if (!root || cards.length === 0) return;

    this.cardObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = cards.findIndex((c) => c.nativeElement === visible.target);
        if (idx >= 0 && idx !== this.activeCardIndex) {
          this.activeCardIndex = idx;
        }
      },
      { root, threshold: [0.55, 0.75] },
    );

    cards.forEach((c) => this.cardObserver!.observe(c.nativeElement));
  }

  goToCard(index: number): void {
    const cards = this.deckCards?.toArray() ?? [];
    const target = cards[index]?.nativeElement;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  prevCard(): void {
    this.goToCard(Math.max(0, this.activeCardIndex - 1));
  }

  nextCard(): void {
    const cards = this.deckCards?.toArray() ?? [];
    this.goToCard(Math.min(cards.length - 1, this.activeCardIndex + 1));
  }

  async finalizeRecovery(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const result = await this.wallet.finalizeRecovery();
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = result.error;
      }
      await this.refreshRecoveryRequest();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async cancelOnChainRecovery(): Promise<void> {
    if (!confirm('Annuler la recovery en cours ? Cette action est irréversible sur cette requête.')) return;
    this.busy = true;
    this.error = undefined;
    try {
      const result = await this.wallet.cancelRecoveryOnChain();
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshRecoveryRequest();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  get canFinalizeRecovery(): boolean {
    if (!this.recoveryRequest) return false;
    return BigInt(Math.floor(Date.now() / 1000)) >= BigInt(this.recoveryRequest.executeAfter);
  }

  /** After onboarding, return to claim (or other) URL if present. */
  private redirectAfterCreate(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!returnUrl || !returnUrl.startsWith('/')) return;
    void this.router.navigateByUrl(returnUrl);
  }
}
