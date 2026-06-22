import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject, filter, interval, takeUntil } from 'rxjs';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'ViTpay';
  showInstallPrompt = false;

  private deferredPrompt: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    theme: ThemeService,
    private update: SwUpdate,
    private cdr: ChangeDetectorRef,
  ) {
    theme.init();
  }

  ngOnInit(): void {
    this.initServiceWorkerUpdates();
    this.setupPWAInstallPrompt();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async installPWA(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    try { await this.deferredPrompt.userChoice; } catch {}
    this.deferredPrompt = null;
    this.showInstallPrompt = false;
    this.cdr.markForCheck();
  }

  dismissInstallPrompt(): void {
    this.showInstallPrompt = false;
    try { sessionStorage.setItem('vit-install-dismissed', '1'); } catch {}
    this.cdr.markForCheck();
  }

  private initServiceWorkerUpdates(): void {
    if (!this.update.isEnabled) return;

    // Onglets inactifs throttle les timers — utilise Date.now() pour le delta réel
    const checkInterval = 5 * 60 * 1000;
    const updateInterval = 6 * 60 * 60 * 1000;
    let lastCheck = Date.now();

    interval(checkInterval).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const now = Date.now();
      if (now - lastCheck >= updateInterval) {
        lastCheck = now;
        this.update.checkForUpdate();
      }
    });

    this.update.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.update.activateUpdate().then(() => window.location.reload());
    });

    this.update.unrecoverable.pipe(takeUntil(this.destroy$)).subscribe(() => {
      window.location.reload();
    });
  }

  private setupPWAInstallPrompt(): void {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('vit-install-dismissed') === '1') return;

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      setTimeout(() => {
        this.showInstallPrompt = true;
        this.cdr.markForCheck();
      }, 3000);
    });

    window.addEventListener('appinstalled', () => {
      this.showInstallPrompt = false;
      this.deferredPrompt = null;
      this.cdr.markForCheck();
    });
  }
}
