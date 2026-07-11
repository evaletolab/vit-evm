// src/app/components/theme-switcher.component.ts
import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ThemeService, Theme } from './app.theme.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kng-theme',
  template: `
    <sl-button-group hidden>
      <sl-button
        [variant]="currentTheme === 'light' ? 'primary' : 'default'"
        (click)="setTheme('light')"
        size="small">
        <sl-icon name="sun" slot="prefix"></sl-icon>
        Clair
      </sl-button>

      <sl-button
        [variant]="currentTheme === 'auto' ? 'primary' : 'default'"
        (click)="setTheme('auto')"
        size="small">
        <sl-icon name="circle-half" slot="prefix"></sl-icon>
        Auto
      </sl-button>

      <sl-button
        [variant]="currentTheme === 'dark' ? 'primary' : 'default'"
        (click)="setTheme('dark')"
        size="small">
        <sl-icon name="moon" slot="prefix"></sl-icon>
        Sombre
      </sl-button>
    </sl-button-group>


    <!-- Alternative: Simple toggle -->
    <sl-button-group>
      <sl-button
        variant="default"
        size="medium" (click)="onZoomPlus()" circle>
        <sl-icon name="plus-lg" label="Settings"></sl-icon>
      </sl-button>
      <sl-button
        variant="default"
        size="medium" (click)="onZoomMinus()" circle>
        <sl-icon name="dash-lg" label="Settings"></sl-icon>
      </sl-button>

    </sl-button-group>

    <sl-button class="theme-toggle"
      variant="default"
      size="medium" (click)="toggleTheme()" circle>
      <sl-icon [name]="icon" label="Settings"></sl-icon>
    </sl-button>
  `,
  standalone: true,
  imports: [CommonModule],
  providers: [ThemeService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [`
    :host {
      display: block;
      display: flex;
      gap: .5rem;
    }
    .theme-toggle {
      --sl-spacing-medium: 0.75rem;
    }
  `]
})
export class AppThemeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentTheme: Theme = 'auto';

  constructor(private themeService: ThemeService) {}

  get icon(): string {
    return this.currentTheme !== 'dark' ? 'moon' : 'sun';
  }

  onZoomPlus(): void {
    this.themeService.zoomIn();
  }

  onZoomMinus(): void {
    this.themeService.zoomOut();
  }

  ngOnInit(): void {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
