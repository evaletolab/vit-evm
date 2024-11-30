import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageTransactionsComponent } from './page-transactions.component';

describe('PageTransactionsComponent', () => {
  let component: PageTransactionsComponent;
  let fixture: ComponentFixture<PageTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
