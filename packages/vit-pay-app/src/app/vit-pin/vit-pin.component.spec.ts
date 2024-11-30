import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitPinComponent } from './vit-pin.component';

describe('VitPinComponent', () => {
  let component: VitPinComponent;
  let fixture: ComponentFixture<VitPinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VitPinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VitPinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
