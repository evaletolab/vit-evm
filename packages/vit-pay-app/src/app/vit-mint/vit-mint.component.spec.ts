import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitMintComponent } from './vit-mint.component';

describe('VitMintComponent', () => {
  let component: VitMintComponent;
  let fixture: ComponentFixture<VitMintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VitMintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VitMintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
