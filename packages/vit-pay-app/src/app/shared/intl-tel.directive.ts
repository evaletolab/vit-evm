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
      // ~260 kB de libphonenumber, servis dans un chunk séparé.
      loadUtils: () => import('intl-tel-input/utils'),
    });
    if (this.pending) this.iti.setNumber(this.pending);

    const input = this.host.nativeElement;
    input.addEventListener('input', this.emit);
    input.addEventListener('countrychange', this.emit);
    input.addEventListener('blur', this.touch);
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
    if (this.iti) this.iti.setNumber(this.pending);
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

  /** Stocke l'E.164 dès qu'il est disponible, sinon la saisie brute. */
  private readonly emit = (): void => {
    const raw = this.host.nativeElement.value.trim();
    const e164 = this.iti?.getNumber() ?? '';
    this.onChange(e164 || raw);
    this.telValidityChange.emit(raw.length === 0 || !!this.iti?.isValidNumber());
  };

  private readonly touch = (): void => this.onTouched();
}
