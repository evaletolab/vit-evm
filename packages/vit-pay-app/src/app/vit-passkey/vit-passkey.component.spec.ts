import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitPasskeyComponent } from './vit-passkey.component';

describe('VitPasskeyComponent', () => {
  let component: VitPasskeyComponent;
  let fixture: ComponentFixture<VitPasskeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VitPasskeyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VitPasskeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
