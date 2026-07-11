import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KngDesktopComponent } from './kng-desktop.component';

describe('KngDesktopComponent', () => {
  let component: KngDesktopComponent;
  let fixture: ComponentFixture<KngDesktopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [KngDesktopComponent],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KngDesktopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
