import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageBuyComponent } from './page-buy.component';

describe('PageBuyComponent', () => {
  let component: PageBuyComponent;
  let fixture: ComponentFixture<PageBuyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageBuyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageBuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
