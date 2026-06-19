import { Injectable } from '@angular/core';

const STORAGE_KEY = 'vit-settings';

export type ColorKey =
  | 'bg' | 'surface1' | 'surface2'
  | 'glass' | 'glassStrong' | 'hairline' | 'hairlineSoft'
  | 'text' | 'text2' | 'textMuted' | 'textDim'
  | 'violet' | 'violetDeep' | 'cyan'
  | 'positive' | 'negative' | 'warning';

export interface ColorDef {
  key: ColorKey;
  cssVar: string;
  label: string;
  default: string;
  alpha?: number;
  visible?: boolean;
}

export const COLOR_DEFS: ColorDef[] = [
  { key: 'bg',           cssVar: '--bg',            label: 'Fond',              default: '#06070D' },
  { key: 'surface1',     cssVar: '--surface-1',     label: 'Fond droit',        default: '#0C0E1A', visible: true },
  { key: 'surface2',     cssVar: '--surface-2',     label: 'Fond gauche',       default: '#08090F', visible: true },
  { key: 'glass',        cssVar: '--glass',         label: 'Verre',             default: '#FFFFFF', alpha: 0.06 },
  { key: 'glassStrong',  cssVar: '--glass-strong',  label: 'Verre fort',        default: '#121420', alpha: 0.72 },
  { key: 'hairline',     cssVar: '--hairline',      label: 'Trait',             default: '#FFFFFF', alpha: 0.12 },
  { key: 'hairlineSoft', cssVar: '--hairline-soft', label: 'Trait doux',        default: '#FFFFFF', alpha: 0.08 },
  { key: 'text',         cssVar: '--text',          label: 'Texte',             default: '#ECEDF5', visible: true },
  { key: 'text2',        cssVar: '--text-2',        label: 'Texte 2',           default: '#C4C7D6' },
  { key: 'textMuted',    cssVar: '--text-muted',    label: 'Texte estompé',     default: '#8A8FA6' },
  { key: 'textDim',      cssVar: '--text-dim',      label: 'Texte sombre',      default: '#6E7392' },
  { key: 'violet',       cssVar: '--violet',        label: 'Bouton gauche',     default: '#7C5CFF', visible: true },
  { key: 'violetDeep',   cssVar: '--violet-deep',   label: 'Bouton droit',      default: '#5B3FE0', visible: true },
  { key: 'cyan',         cssVar: '--cyan',          label: 'Cyan',              default: '#3FD0F0' },
  { key: 'positive',     cssVar: '--positive',      label: 'Positif',           default: '#4ADE9B' },
  { key: 'negative',     cssVar: '--negative',      label: 'Négatif',           default: '#FF6B85' },
  { key: 'warning',      cssVar: '--warning',       label: 'Alerte',            default: '#FFB454' },
];

export type ColorMap = Partial<Record<ColorKey, string>>;

export interface ColorPreset {
  id: string;
  label: string;
  colors: ColorMap;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'lumen',
    label: 'Lumen',
    colors: { surface1: '#0C0E1A', surface2: '#08090F', text: '#ECEDF5', violet: '#7C5CFF', violetDeep: '#5B3FE0' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    colors: { surface1: '#2A0E1A', surface2: '#15060E', text: '#FFE8E1', violet: '#FF6B85', violetDeep: '#FFB454' },
  },
  {
    id: 'forest',
    label: 'Forêt',
    colors: { surface1: '#0B1A12', surface2: '#06100A', text: '#E6F4EA', violet: '#4ADE9B', violetDeep: '#1F8A55' },
  },
  {
    id: 'ocean',
    label: 'Océan',
    colors: { surface1: '#0A1A2A', surface2: '#04101C', text: '#E1F0FF', violet: '#3FD0F0', violetDeep: '#1E6FBF' },
  },
  {
    id: 'mono',
    label: 'Mono',
    colors: { surface1: '#1A1A1A', surface2: '#0A0A0A', text: '#FFFFFF', violet: '#FFFFFF', violetDeep: '#888888' },
  },
];

type Stored = {
  colors?: ColorMap;
  devMode?: boolean;
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16) || 0;
  const g = parseInt(m.substring(2, 4), 16) || 0;
  const b = parseInt(m.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly defs = COLOR_DEFS;
  private colors: ColorMap = {};
  private devMode = false;

  init(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed && typeof parsed === 'object') {
          this.colors = parsed.colors ?? {};
          this.devMode = parsed.devMode === true;
        }
      }
    } catch {
      this.colors = {};
      this.devMode = false;
    }
    this.apply();
  }

  getEffective(): Record<ColorKey, string> {
    const out = {} as Record<ColorKey, string>;
    for (const def of COLOR_DEFS) {
      out[def.key] = this.colors[def.key] ?? def.default;
    }
    return out;
  }

  setColor(key: ColorKey, hex: string): void {
    this.colors = { ...this.colors, [key]: hex };
    this.persist();
    this.apply();
  }

  applyPreset(preset: ColorPreset): void {
    this.colors = { ...this.colors, ...preset.colors };
    this.persist();
    this.apply();
  }

  reset(): void {
    this.colors = {};
    this.persist();
    this.apply();
  }

  isDevMode(): boolean {
    return this.devMode;
  }

  setDevMode(value: boolean): void {
    this.devMode = value;
    this.persist();
  }

  private persist(): void {
    const payload: Stored = { colors: this.colors, devMode: this.devMode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private apply(): void {
    const root = document.documentElement;
    const eff = this.getEffective();
    for (const def of COLOR_DEFS) {
      const hex = eff[def.key];
      const value = def.alpha !== undefined ? hexToRgba(hex, def.alpha) : hex;
      root.style.setProperty(def.cssVar, value);
    }
    root.style.setProperty('--grad', `linear-gradient(135deg, ${eff.violet}, ${eff.violetDeep})`);
    root.style.setProperty('--grad-neon', `linear-gradient(135deg, ${eff.violet}, ${eff.cyan})`);
    root.style.setProperty('--grad-text', `linear-gradient(120deg, ${eff.text}, ${eff.violet} 60%, ${eff.cyan})`);
  }
}
