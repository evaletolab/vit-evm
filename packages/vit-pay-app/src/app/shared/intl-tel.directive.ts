/**
 * Champ téléphone international (indicatif pays + formatage à la frappe).
 *
 * On monte la librairie vanille `intl-tel-input` plutôt que son wrapper
 * `@intl-tel-input/angular` : celui-ci est publié compilé pour Angular 20
 * (instructions Ivy `ɵɵdomElementStart` / `ɵɵdomListener`) et casse au rendu
 * sur Angular 18.
 */
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import intlTelInput from 'intl-tel-input';
import type { Iso2, Iti } from 'intl-tel-input';

@Directive({
  selector: 'input[vitTel]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IntlTelDirective),
      multi: true,
    },
  ],
})
export class IntlTelDirective implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() initialCountry: Iso2 = 'ch';
  @Input() countryOrder: Iso2[] = ['ch', 'fr', 'de', 'it', 'at'];
  /** Émet la validité du numéro courant (nécessite les utils). */
  @Output() telValidityChange = new EventEmitter<boolean>();

  private iti?: Iti;
  private pending = '';
  private utilsReady = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private host: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.host.nativeElement, {
      initialCountry: this.initialCountry,
      countryOrder: this.countryOrder,
      countryNameLocale: 'fr',
      formatAsYouType: true,
      strictMode: true,
      // ~260 kB de libphonenumber, chunk séparé — attendre `iti.promise`
      // avant getNumber() sinon throw « utils is required ».
      loadUtils: () => import('intl-tel-input/utils'),
    });

    const input = this.host.nativeElement;
    input.addEventListener('input', this.emit);
    input.addEventListener('countrychange', this.emit);
    input.addEventListener('blur', this.touch);

    void this.iti.promise
      .then(() => {
        this.utilsReady = true;
        if (this.pending) this.iti?.setNumber(this.pending);
        this.emit();
      })
      .catch((err: unknown) => {
        console.error('intl-tel-input utils failed to load', err);
      });
  }

  ngOnDestroy(): void {
    const input = this.host.nativeElement;
    input.removeEventListener('input', this.emit);
    input.removeEventListener('countrychange', this.emit);
    input.removeEventListener('blur', this.touch);
    this.iti?.destroy();
  }

  writeValue(value: string | null): void {
    this.pending = value ?? '';
    if (this.iti && this.utilsReady) this.iti.setNumber(this.pending);
    else this.host.nativeElement.value = this.pending;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.nativeElement.disabled = isDisabled;
  }

  /** Stocke l'E.164 dès que les utils sont prêts, sinon la saisie brute. */
  private readonly emit = (): void => {
    const raw = this.host.nativeElement.value.trim();
    let e164 = '';
    if (this.utilsReady && this.iti) {
      try {
        e164 = this.iti.getNumber() ?? '';
      } catch {
        // Utils pas encore attachés — on garde le brut.
      }
    }
    this.onChange(e164 || raw);
    const valid =
      raw.length === 0 ||
      (this.utilsReady ? !!this.iti?.isValidNumber() : true);
    this.telValidityChange.emit(valid);
  };

  private readonly touch = (): void => this.onTouched();
}
