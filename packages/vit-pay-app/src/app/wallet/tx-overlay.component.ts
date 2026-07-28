import { Component } from '@angular/core';
import { TxOverlayService } from './tx-overlay.service';

@Component({
  selector: 'vit-tx-overlay',
  template: `
    <div class="tx-overlay" *ngIf="tx.visible" role="alertdialog" aria-modal="true">
      <div class="tx-overlay__card">
        <div class="tx-overlay__spinner" *ngIf="tx.state.phase === 'pending'"></div>
        <div class="tx-overlay__icon" *ngIf="tx.state.phase === 'success'">✓</div>
        <div class="tx-overlay__icon tx-overlay__icon--err" *ngIf="tx.state.phase === 'error'">✕</div>
        <h2>{{ tx.state.title }}</h2>
        <p *ngIf="tx.state.detail">{{ tx.state.detail }}</p>
        <button *ngIf="tx.state.phase === 'error'" type="button" (click)="tx.hide()">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    .tx-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(6,7,13,.72);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(6px);
    }
    .tx-overlay__card {
      background: var(--surface-1, #0C0E1A);
      color: var(--text, #ECEDF5);
      border-radius: 20px;
      padding: 2rem 1.5rem;
      width: min(320px, 90vw);
      text-align: center;
      box-shadow: none;
      border: none;
    }
    .tx-overlay__spinner {
      width: 40px; height: 40px; margin: 0 auto 1rem;
      border: 3px solid rgba(255,255,255,.15);
      border-top-color: var(--violet, #7C5CFF);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    .tx-overlay__icon { font-size: 2rem; margin-bottom: .5rem; color: var(--positive, #4ADE9B); }
    .tx-overlay__icon--err { color: var(--negative, #FF6B85); }
    h2 { margin: 0 0 .5rem; font-size: 1.1rem; font-weight: 600; }
    p { margin: 0; color: var(--text-muted, #8A8FA6); font-size: .9rem; }
    button {
      margin-top: 1rem; border: none; border-radius: 12px;
      padding: .6rem 1.2rem; background: var(--violet, #7C5CFF); color: #fff;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class TxOverlayComponent {
  constructor(public tx: TxOverlayService) {}
}
