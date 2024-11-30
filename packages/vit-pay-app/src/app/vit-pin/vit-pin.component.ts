import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'vit-pin',
  templateUrl: './vit-pin.component.html',
  styleUrl: './vit-pin.component.scss'
})
export class VitPinComponent {
  @Output() pin = new EventEmitter<string>();

  pinCode: string = '';
  wait:boolean = false;

  onPinChange(event: any): void {
    this.pinCode = event.target.value;
  }

  onPinCompleted(event: any): void {
    console.log('Pin completed:', event);
    this.wait = true;
    this.pin.emit(this.pinCode);

  }

  onRestore(): void {
    console.log('Pin restoring:');
  }
}
