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
import { WalletService } from '../../wallet/wallet.service';
import {
  RecoveryRequest,
  UserOperationDebug,
  UserOperationResult,
  WalletState,
} from '../../wallet/wallet.types';
import {
  formatZchfAmount,
  isValidEvmAddress,
  mapPaymasterError,
  parseZchfAmount,
  shortAddress,
} from '../../wallet/wallet.utils';

type ViewState = 'no-wallet' | 'loading' | 'ready';

@Component({
  selector: 'vit-page-wallet',
  templateUrl: './page-wallet.component.html',
  styleUrl: './page-wallet.component.scss',
})
export class PageWalletComponent implements OnInit, AfterViewInit, OnDestroy {
  view: ViewState = 'no-wallet';
  activeCardIndex = 0;
  readonly cardTabs = [
    { title: 'Compte',    icon: 'account_balance_wallet' },
    { title: 'Recevoir',  icon: 'download' },
    { title: 'Envoyer',   icon: 'send' },
    { title: 'Appareils', icon: 'devices' },
    { title: 'Recovery',  icon: 'shield_lock' },
  ];
  get cardTitles(): string[] { return this.cardTabs.map((t) => t.title); }

  @ViewChild('deck') deckRef?: ElementRef<HTMLElement>;
  @ViewChildren('deckCard') deckCards?: QueryList<ElementRef<HTMLElement>>;
  private cardObserver?: IntersectionObserver;
  state: WalletState | null = null;
  balance: string = '—';
  error?: string;
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

  // recovery
  guardiansInput = '';
  guardianThreshold = 1;
  recoveryRequest: RecoveryRequest | null = null;
  lastRecoveryOp?: UserOperationResult;

  // exported for template
  readonly shortAddress = shortAddress;

  constructor(private wallet: WalletService) {}

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
        await this.refreshBalance();
        await this.refreshRecoveryRequest();
      } else {
        this.view = 'no-wallet';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.view = 'no-wallet';
    }
  }

  async createWallet(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      this.state = await this.wallet.createWalletWithPasskey();
      this.view = 'ready';
      await this.refreshBalance();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
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
      this.error = err instanceof Error ? err.message : String(err);
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
}
