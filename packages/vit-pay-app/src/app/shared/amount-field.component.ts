import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Montant principal partagé entre Envoyer et Recevoir.
 * Gros chiffre + devise — style Cash-App, contraste solide (pas de clip gradient).
 */
@Component({
  selector: 'vit-amount-field',
  template: `
    <label class="amount-field">
      <span class="amount-field__label" *ngIf="label">{{ label }}</span>
      <div class="amount-field__row">
        <input
          type="text"
          inputmode="decimal"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          aria-label="Montant en xCHF" />
        <span class="amount-field__unit">{{ currency }}</span>
      </div>
    </label>
  `,
  styles: [`
    :host { display: block; }

    .amount-field {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .amount-field__label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--text-muted);
      font-weight: 700;
    }

    .amount-field__row {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      padding: 0.35rem 0;
    }

    .amount-field__row input {
      flex: 1;
      min-width: 0;
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-family: 'Inter', sans-serif;
      font-size: 3.4rem;
      font-weight: 700;
      letter-spacing: -0.06em;
      line-height: 1.05;
      color: var(--text);
      caret-color: var(--violet);

      &::placeholder {
        color: var(--text-dim);
        opacity: 1;
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    .amount-field__unit {
      flex-shrink: 0;
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--text-muted);
      padding-bottom: 0.35rem;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AmountFieldComponent),
      multi: true,
    },
  ],
})
export class AmountFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '0.00';
  @Input() currency = 'xCHF';

  value = '';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value = next;
    this.onChange(next);
  }
}
