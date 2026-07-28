import { Injectable } from '@angular/core';

export type TxOverlayPhase = 'idle' | 'pending' | 'success' | 'error';

export interface TxOverlayState {
  phase: TxOverlayPhase;
  title: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class TxOverlayService {
  state: TxOverlayState = { phase: 'idle', title: '' };

  show(title: string, detail?: string): void {
    this.state = { phase: 'pending', title, detail };
  }

  succeed(title = 'Confirmé', detail?: string): void {
    this.state = { phase: 'success', title, detail };
    setTimeout(() => this.hide(), 1200);
  }

  fail(title: string, detail?: string): void {
    this.state = { phase: 'error', title, detail };
  }

  hide(): void {
    this.state = { phase: 'idle', title: '' };
  }

  get visible(): boolean {
    return this.state.phase !== 'idle';
  }

  async run<T>(
    title: string,
    work: () => Promise<T>,
    opts?: { successTitle?: string; mapError?: (e: unknown) => string },
  ): Promise<T> {
    this.show(title);
    try {
      const result = await work();
      this.succeed(opts?.successTitle ?? 'Confirmé');
      return result;
    } catch (err) {
      const msg = opts?.mapError?.(err)
        ?? (err instanceof Error ? err.message : String(err));
      this.fail('Échec', msg);
      throw err;
    }
  }
}
