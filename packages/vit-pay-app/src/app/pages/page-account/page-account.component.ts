import { Component } from '@angular/core';
import { ColorDef, ColorKey, ColorPreset, COLOR_PRESETS, ThemeService } from '../../theme/theme.service';

type Tab = 'menu' | 'settings';

@Component({
  selector: 'vit-page-account',
  templateUrl: './page-account.component.html',
  styleUrl: './page-account.component.scss'
})
export class PageAccountComponent {
  tab: Tab = 'menu';
  colorDefs: ColorDef[];
  colors: Record<ColorKey, string>;
  presets: ColorPreset[] = COLOR_PRESETS;
  devMode = false;

  constructor(private theme: ThemeService) {
    this.colorDefs = this.theme.defs.filter((d) => d.visible);
    this.colors = this.theme.getEffective();
    this.devMode = this.theme.isDevMode();
  }

  openSettings(): void {
    this.colors = this.theme.getEffective();
    this.devMode = this.theme.isDevMode();
    this.tab = 'settings';
  }

  closeSettings(): void {
    this.tab = 'menu';
  }

  onColorChange(key: ColorKey, value: string): void {
    this.colors = { ...this.colors, [key]: value };
    this.theme.setColor(key, value);
  }

  resetColors(): void {
    this.theme.reset();
    this.colors = this.theme.getEffective();
  }

  applyPreset(preset: ColorPreset): void {
    this.theme.applyPreset(preset);
    this.colors = this.theme.getEffective();
  }

  toggleDevMode(): void {
    this.devMode = !this.devMode;
    this.theme.setDevMode(this.devMode);
  }
}
