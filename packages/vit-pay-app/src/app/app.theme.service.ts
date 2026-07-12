// src/app/services/theme.service.ts
import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'shoelace-theme';
  private readonly MIN_ZOOM = 0.7;
  private readonly MAX_ZOOM = 1.3;
  private readonly ZOOM_STEP = 0.1;
  private readonly DEFAULT_ZOOM = 0.9;

  private _currentZoom$ = new BehaviorSubject<number>(this.DEFAULT_ZOOM);
  public readonly currentZoom$ = this._currentZoom$.asObservable();

  private _currentTheme$ = new BehaviorSubject<Theme>('auto');
  public readonly currentTheme$ = this._currentTheme$.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.initializeTheme();
    this.watchSystemTheme();
  }

  private initializeTheme(): void {
    // Récupérer le thème sauvegardé ou utiliser 'auto' par défaut
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme || 'auto';
    this.setTheme(savedTheme);

    const savedZoom = localStorage.getItem(this.STORAGE_KEY+'-zoom');
    const zoom = savedZoom ? parseFloat(savedZoom) : this.DEFAULT_ZOOM;
    this.setZoom(zoom);

  }

  private watchSystemTheme(): void {
    // Écouter les changements de préférence système
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this._currentTheme$.value === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  setTheme(theme: Theme): void {
    this._currentTheme$.next(theme);
    this.applyTheme(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    const body = this.document.body;

    // Supprimer les classes existantes
    body.classList.remove('sl-theme-light', 'sl-theme-dark');

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'auto') {
      // Détecter la préférence système
      effectiveTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      effectiveTheme = theme;
    }

    // Appliquer la classe Shoelace correspondante
    body.classList.add(`sl-theme-${effectiveTheme}`);

    console.log(`🎨 Theme applied: ${theme} (effective: ${effectiveTheme})`);
  }

  getCurrentTheme(): Theme {
    return this._currentTheme$.value;
  }

  toggleTheme(): void {
    const current = this.getCurrentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }


  setZoom(zoom: number): void {
    const clampedZoom =  Math.round(Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoom))*100)/100;
    this._currentZoom$.next(clampedZoom);
    this.applyZoom(clampedZoom);
  }

  private applyZoom(zoom: number): void {
    this.document.documentElement.style.setProperty('--size-factor', zoom.toString());
    localStorage.setItem(this.STORAGE_KEY+'-zoom', zoom.toString());
  }

  zoomIn(): void {
    const current = this._currentZoom$.value;
    this.setZoom(current + this.ZOOM_STEP);
  }

  zoomOut(): void {
    const current = this._currentZoom$.value;
    this.setZoom(current - this.ZOOM_STEP);
  }

}