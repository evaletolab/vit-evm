import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WalletService } from '../../wallet/wallet.service';
import { WalletUnlockService } from '../../wallet/wallet-unlock.service';
import { TxOverlayService } from '../../wallet/tx-overlay.service';
import { isValidWalletName, walletHandle } from '../../wallet/wallet-name';
import { decodeCodePayload } from '../../wallet/recovery-codes';

@Component({
  selector: 'vit-page-restore',
  templateUrl: './page-restore.component.html',
  styleUrl: './page-restore.component.scss',
})
export class PageRestoreComponent implements OnInit, AfterViewInit {
  name = '';
  handle = '';
  code1 = '';
  code2 = '';
  busy = false;
  error?: string;
  progress = '';
  softOk = false;

  @ViewChild('userField') userField?: ElementRef<HTMLInputElement>;
  @ViewChild('passField') passField?: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallet: WalletService,
    private unlock: WalletUnlockService,
    private txOverlay: TxOverlayService,
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('name') ?? '';
    if (!isValidWalletName(param)) {
      this.error = 'Nom invalide';
      return;
    }
    this.name = param.toLowerCase();
    this.handle = walletHandle(this.name);

    // Préremplit depuis le fragment / query (?c= ou #c=)
    const fromQuery = this.route.snapshot.queryParamMap.get('c');
    const hash = typeof location !== 'undefined' ? location.hash : '';
    let fromHash: string | null = null;
    if (hash.includes('c=')) {
      const qs = hash.startsWith('#') ? hash.slice(1) : hash;
      fromHash = new URLSearchParams(qs.startsWith('c=') || qs.includes('=') ? qs : `c=${qs}`).get('c');
    }
    const seeded = fromQuery ?? fromHash;
    if (seeded) {
      this.code1 = seeded;
      try {
        const p = decodeCodePayload(seeded);
        if (p.cid && p.x && p.y) this.softOk = true;
      } catch {
        /* ignore until submit */
      }
    }
  }

  ngAfterViewInit(): void {
    // Champ username visible au chargement → déclenche l'autofill iOS/Chrome.
    queueMicrotask(() => this.userField?.nativeElement?.focus());
  }

  onVaultAutofill(): void {
    const pass = this.passField?.nativeElement?.value?.trim();
    if (pass) {
      this.code1 = pass;
      try {
        const p = decodeCodePayload(pass);
        this.softOk = !!(p.cid && p.x && p.y);
      } catch {
        this.softOk = false;
      }
    }
  }

  async softRestore(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const raw = this.code1.trim();
      await this.wallet.importFromCodePayload(raw);
      this.unlock.markUnlocked();
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async hardRestore(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.txOverlay.show('Restauration du compte…');
    try {
      const payloads = [this.code1.trim(), this.code2.trim()].filter(Boolean);
      const out = await this.wallet.restoreWithRecoveryCodes(this.name, payloads, {
        onProgress: (step, ratio) => {
          const pct = ratio != null ? ` ${Math.round(ratio * 100)} %` : '';
          this.progress = `${step}${pct}`;
        },
      });
      this.txOverlay.succeed('Compte restauré');
      this.unlock.markUnlocked();
      await this.router.navigate(['/', out.state.walletName ?? this.name, 'vault'], {
        queryParams: { rotate: '1' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail(msg);
      this.error = msg;
    } finally {
      this.busy = false;
    }
  }
}
