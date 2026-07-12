import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppService, AppState } from '../../app.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-kng-desktop',
    templateUrl: './kng-desktop.component.html',
    styleUrls: ['./kng-desktop.component.scss'],
    standalone: false
})
export class KngDesktopComponent implements OnInit, OnDestroy {
    private readonly _destroying$ = new Subject<void>();
    private $app = inject(AppService);
    private $route = inject(ActivatedRoute);
    private $router = inject(Router);

    @ViewChild('centerView') centerView!: ElementRef;

    isLoggedIn = false;
    user: any | undefined = undefined;
    private wasLoggedIn = false;  // Pour détecter la transition de connexion


    state: AppState = {
      state: 'assistant',
      view: 'assistant'
    }

    ngOnInit(): void {

      this.$app.state$.pipe(
        takeUntil(this._destroying$)
      ).subscribe(async state => {
        this.state = state;
      });


    }

    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }

    login(): void {
    }

    async logout() {
    }

}
