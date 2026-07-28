import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, tap, catchError, filter, take, switchMap, skip, debounceTime } from 'rxjs/operators';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import pkg from '../../package.json';
import { KngRagService } from './kng-rag/kng-rag.service';
import { RulesService } from './kng-rules/kng-rules.service';
import { AuthService, AuthState, Me, defaultMe, defaultAuthState } from './auth.service';
import { Rule, RulePullRequest } from './kng-rules/rules.types';
import { RAGListResponse } from './kng-rag/kng-rag.model';
import { ClientDiscussion } from './kng-model.assistant';
import { PinnedDiscussion, KngPinnedService } from './kng-pinned.service';
import { KngAssistantAiService } from './kng-assistant-ai.service';
import { KngMemoriesService, DiscussionMemory } from './kng-memories.service';

export interface AppNotification {
  message: string;
  variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger';
  icon: string;
  duration?: number;
  closable?: boolean;
  onAction?: () => void;
}



/**
 * État de chargement pour chaque élément
 */
export interface LoadingState {
  auth: boolean;
  me: boolean;
  memories: boolean;
  pinned: boolean;
  history: boolean;
  prs: boolean;
  rag: boolean;
}

export interface AppState {
  state: 'root' | 'rules' | 'assistant' | 'emails' | 'history' | 'minutes' | 'desktop' | 'prompt'|string;
  slug?: string;
  branch?: string;
  view?: string;
  format?: string;
  version?: string;
  updateAvailable?: boolean;
  loading?: LoadingState;
  maintenanceMessage?: string;  // Message affiché lors d'une erreur 504 (serveur en maintenance)
}

/**
 * Données minimales pour utiliser l'application
 * Charge: auth, me, memories, pinned discussions, et history
 */
export interface LoaderUserData {
  auth: AuthState;
  me: Me;
  memories: DiscussionMemory[];
  pinned: PinnedDiscussion[];
  history: ClientDiscussion;
}

/**
 * Données complètes pour l'éditeur de règles
 * Hérite de LoaderUserData + ajoute PRs + RAG
 */
export interface LoaderUserAndEditorData extends LoaderUserData {
  rules: Rule[];
  prs: RulePullRequest[];
  rag: RAGListResponse;
}

/**
 * @deprecated Utiliser LoaderUserData ou LoaderUserAndEditorData selon le contexte
 */
export type LoaderData = LoaderUserAndEditorData;


export const errorFormatMessage = (err:any) =>{
  let errorMessage = 'Erreur inconnue';
  if (err?.status === 403) {
    errorMessage = 'Accès non autorisé à cette règle';
  } else if (err?.error?.message) {
    errorMessage = err.error.message;
  } else if (err?.message) {
    errorMessage = err.message;
  }
  return errorMessage;
}

@Injectable({
  providedIn: 'root'
})
export class AppService {
  apVersion: string = pkg.version;

  private readonly defaultLoadingState: LoadingState = {
    auth: false,
    me: false,
    memories: false,
    pinned: false,
    history: false,
    prs: false,
    rag: false
  };

  private readonly defaultState: AppState = {
    state: 'root',
    version: pkg.version,
    updateAvailable: false,
    loading: this.defaultLoadingState
  };

  private readonly stateSubject = new BehaviorSubject<AppState>(this.defaultState);
  public readonly state$ = this.stateSubject.asObservable();

  // Cache pour stocker les données déjà chargées
  private userDataCache: LoaderUserData | null = null;
  private prsCache: RulePullRequest[] | null = null;
  private ragCache: RAGListResponse | null = null;

  private $rag: KngRagService = inject(KngRagService);
  private $rules: RulesService = inject(RulesService);
  private $auth: AuthService = inject(AuthService);
  private $agents: KngAssistantAiService = inject(KngAssistantAiService);
  private $pinned: KngPinnedService = inject(KngPinnedService);
  private $memories: KngMemoriesService = inject(KngMemoriesService);

  constructor(private swUpdate: SwUpdate) {
    this.initializeServiceWorkerUpdates();
  }

  /**
   * Met à jour l'état de chargement dans AppState
   */
  private updateLoadingState(partial: Partial<LoadingState>): void {
    const currentState = this.currentState;
    const currentLoading = currentState.loading || this.defaultLoadingState;
    const newLoading: LoadingState = {
      ...currentLoading,
      ...partial
    };
    this.updateState({ loading: newLoading });
  }

  /**
   * Charge les données minimales pour utiliser l'application
   * Charge: auth, me, memories, pinned discussions, et history
   * Utilise un cache pour éviter de recharger les données déjà disponibles
   *
   * @param agent - Agent pour charger history et pinned (vide défaut: '')
   * @param forceReload - Forcer le rechargement même si les données sont en cache (défaut: false)
   * @returns Observable qui émet les données utilisateur complètes
   */
  loaderUser(agent: string = '', forceReload: boolean = false): Observable<LoaderUserData> {
    // Si les données sont en cache et qu'on ne force pas le rechargement, retourner immédiatement
    if (this.userDataCache && !forceReload) {
      return of(this.userDataCache);
    }

    // Mettre à jour l'état de chargement
    this.updateLoadingState({ auth: true, me: true });

    // D'abord charger auth et me pour déterminer si l'utilisateur est authentifié
    return combineLatest([
      // Auth: attendre l'initialisation
      this.$auth.user$.pipe(
        filter(state => state.isInitialized),
        take(1),
        tap(state => {
          // Déclencher me() dès que l'utilisateur est authentifié
          if (state.isAuthenticated) {
            this.$auth.me();
          }
          this.updateLoadingState({ auth: false });
        }),
        catchError(err => {
          console.error('❌ LoaderUser: Erreur auth', err);
          this.updateLoadingState({ auth: false });
          return of(defaultAuthState);
        })
      ),
      // Me: attendre les données utilisateur (non-anonyme ou avec uid)
      this.$auth.me$.pipe(
        filter(me => !me.isAnonymous || me.uid !== undefined),
        take(1),
        tap(() => this.updateLoadingState({ me: false })),
        catchError(() => {
          this.updateLoadingState({ me: false });
          return of(defaultMe);
        })
      )
    ]).pipe(
      switchMap(([auth, me]) => {
        // Si l'utilisateur est anonyme, retourner immédiatement les valeurs par défaut
        // sans attendre les observables qui ne seront jamais déclenchés
        if (me.isAnonymous) {
          const anonymousData: LoaderUserData = {
            auth,
            me,
            memories: [] as DiscussionMemory[],
            pinned: [] as PinnedDiscussion[],
            history: {
              id: null,
              messages: [],
              usage: { prompt: 0, completion: 0, total: 0, cost: 0 },
              createdAt: new Date(),
              updatedAt: new Date()
            } as ClientDiscussion
          };
          this.userDataCache = anonymousData;
          return of(anonymousData);
        }

        // Si l'utilisateur est authentifié, déclencher les chargements et attendre les résultats
        this.updateLoadingState({ memories: true, pinned: true, history: true });
        this.$memories.list().subscribe();
        this.$pinned.list(agent).subscribe();
        this.$agents.history(false, agent).subscribe();

        // Combiner les observables pour les données agent
        return combineLatest([
          // Memories: skip la valeur initiale et prendre la première après le chargement
          this.$memories.memories$.pipe(
            skip(1),  // Ignorer la valeur initiale []
            take(1),  // Prendre la première valeur après les appels API
            tap(() => this.updateLoadingState({ memories: false })),
            catchError(() => {
              this.updateLoadingState({ memories: false });
              return of([] as DiscussionMemory[]);
            })
          ),
          // Pinned: skip la valeur initiale et prendre la première après le chargement
          this.$pinned.pinned$.pipe(
            skip(1),  // Ignorer la valeur initiale []
            take(1),  // Prendre la première valeur après les appels API
            tap(() => this.updateLoadingState({ pinned: false })),
            catchError(() => {
              this.updateLoadingState({ pinned: false });
              return of([] as PinnedDiscussion[]);
            })
          ),
          // History: skip la valeur initiale et prendre la première après le chargement
          this.$agents.discussion$.pipe(
            skip(1),  // Ignorer la valeur initiale
            take(1),  // Prendre la première valeur après les appels API
            tap(() => this.updateLoadingState({ history: false })),
            catchError(() => {
              this.updateLoadingState({ history: false });
              return of({
                id: null,
                messages: [],
                usage: { prompt: 0, completion: 0, total: 0, cost: 0 },
                createdAt: new Date(),
                updatedAt: new Date()
              } as ClientDiscussion);
            })
          )
        ]).pipe(
          map(([memories, pinned, history]) => {
            const userData: LoaderUserData = {
              auth,
              me,
              memories,
              pinned,
              history
            };
            // Mettre en cache les données chargées
            this.userDataCache = userData;
            return userData;
          })
        );
      })
    );
  }

  /**
   * Charge les données complètes pour l'éditeur de règles
   * Hérite de loaderUser() + ajoute PRs + RAG
   * Réutilise le cache pour éviter de recharger les données déjà disponibles
   *
   * ⚠️ Ne charge PAS les rules ici car on ne sait pas encore quel type (NEW, EDITING, PUBLISHED)
   * Les rules seront chargées par le composant selon la vue active
   *
   * @param agent - Agent pour charger history et pinned (défaut: 'current')
   * @param forceReload - Forcer le rechargement même si les données sont en cache (défaut: false)
   * @returns Observable qui émet les données combinées (auth, me, memories, pinned, history, PRs, RAG)
   */
  loaderUserAndEditor(agent: string = '', forceReload: boolean = false): Observable<LoaderUserAndEditorData> {
    // Déterminer si on doit charger les données utilisateur (si pas en cache ou forceReload)
    const shouldLoadUser = !this.userDataCache || forceReload;
    const shouldLoadPRs = !this.prsCache || forceReload;
    const shouldLoadRAG = !this.ragCache || forceReload;

    // Charger les données utilisateur uniquement si nécessaire
    const userData$ = shouldLoadUser
      ? this.loaderUser(agent, forceReload)
      : of(this.userDataCache!);

    // Charger PRs uniquement si nécessaire
    if (shouldLoadPRs) {
      this.updateLoadingState({ prs: true });
      this.$rules.listPullRequests().catch(err => {
        console.error('❌ LoaderUserAndEditor: Erreur de chargement des PRs', err);
        this.updateLoadingState({ prs: false });
      });
    }

    // Charger RAG uniquement si nécessaire
    if (shouldLoadRAG) {
      this.updateLoadingState({ rag: true });
      this.$rag.getRAGList().subscribe({
        error: (err) => {
          console.error('❌ LoaderUserAndEditor: Erreur RAG', err);
          this.updateLoadingState({ rag: false });
        }
      });
    }

    // Combiner les données
    return combineLatest([
      userData$,
      // PRs: utiliser le cache ou attendre le chargement
      shouldLoadPRs
        ? this.$rules.prsLoaded$.pipe(
            filter(prs => prs !== null && prs.length >= 0),
            take(1),
            tap(prs => {
              this.prsCache = prs;
              this.updateLoadingState({ prs: false });
            }),
            catchError(err => {
              console.error('❌ LoaderUserAndEditor: Erreur PRs', err);
              this.updateLoadingState({ prs: false });
              return of([] as RulePullRequest[]);
            })
          )
        : of(this.prsCache!),
      // RAG: utiliser le cache ou attendre le chargement
      shouldLoadRAG
        ? this.$rag.ragList$.pipe(
            filter(ragList => ragList !== null),
            take(1),
            tap(rag => {
              this.ragCache = rag;
              this.updateLoadingState({ rag: false });
            }),
            catchError(err => {
              console.error('❌ LoaderUserAndEditor: Erreur RAG', err);
              this.updateLoadingState({ rag: false });
              return of({ rags: [], default: '', loadedCount: 0 } as RAGListResponse);
            })
          )
        : of(this.ragCache!)
    ]).pipe(
      map(([userData, prs, rag]) => ({
        ...userData,  // ✅ Spread les données de loaderUser (auth, me, memories, pinned, history)
        rules: [],    // ✅ Vide - sera chargé par le composant selon la vue
        prs,          // ✅ Chargé depuis prsLoaded$ ou cache
        rag           // ✅ Chargé depuis ragList$ ou cache
      } as LoaderUserAndEditorData))
    );
  }

  /**
   * @deprecated Utiliser loaderUser() ou loaderUserAndEditor() selon le contexte
   */
  loader(): Observable<LoaderData> {
    return this.loaderUserAndEditor();
  }

  /**
   * Apply the available update and reload
   */
  applyUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return Promise.resolve();
    }

    return this.swUpdate.activateUpdate().then(() => {
      // Show loading notification
      this.notify('Mise à jour en cours...', 'neutral', 'arrow-clockwise', 2000);

      // Reload the page after a short delay
      setTimeout(() => {
        document.location.reload();
      }, 1000);
    });
  }



  get currentState(): AppState {
    return this.stateSubject.value;
  }



  //
  // FIXME (hardcoded values) this should be in a config file
  readonly validators = [
    { name: "Raphaël Delessert", email: "raphael.delessert@pilet-renaud.ch" },
    { name: "Anne Séret", email: "anne.seret@pilet-renaud.ch" },
    { name: "Thierry Perroud", email: "thierry.perroud@pilet-renaud.ch" },
    { name: "Philippe Mercier", email: "philippe.mercier@pilet-renaud.ch" },
    { name: "Laurent BORNATICI", email: "laurent.bornatici@pilet-renaud.ch" },
    { name: "Cédric Aeschlimann", email: "cedric.aeschlimann@pilet-renaud.ch" },
    { name: "Martine Lopez-Labre", email: "martine.lopez-labre@pilet-renaud.ch" },
    { name: "Emmanuel Fabrizio", email: "emmanuel.fabrizio@pilet-renaud.ch" },
    { name: "Joffrey Maglione", email: "joffrey.maglione@pilet-renaud.ch" },
    { name: "Shahvir Sattha", email: "shahvir.sattha@pilet-renaud.ch" },
  ];


  /**
   * Update application state with partial data
   */
  updateState(partial: Partial<AppState>): void {
    const currentState = this.currentState;
    const newState: AppState = {
      ...currentState,
      ...partial
    };

    this.stateSubject.next(newState);
  }

  /**
   * Show a notification using Shoelace components
   */
  notify(
    message: string,
    variant: AppNotification['variant'] = 'primary',
    icon = 'info-circle',
    duration = 9000,
    onAction?: () => void
  ): Promise<void> {

    const notification: AppNotification = {
      message,
      variant,
      icon,
      duration,
      closable: true,
      onAction
    };

    return this.createShoelaceAlert(notification);
  }

  /**
   * Get observable for specific state property
   */
  select<K extends keyof AppState>(key: K): Observable<AppState[K]> {
    return this.state$.pipe(
      map(state => state[key])
    );
  }


  /**
   * Create and display Shoelace alert component
   */
  private createShoelaceAlert(notification: AppNotification): Promise<void> {
    const escapeHtml = (html: string): string => {
      const div = document.createElement('div');
      div.textContent = html;
      return div.innerHTML;
    };

    // <sl-alert> is a custom element: the DOM lib types it as a plain
    // HTMLElement, so its Shoelace methods must be declared here.
    type SlAlert = HTMLElement & { hide(): void; toast(): Promise<void> };

    const alert = Object.assign(document.createElement('sl-alert') as SlAlert, {
      variant: notification.variant,
      closable: notification.closable,
      duration: notification.duration,
      innerHTML: `
        <sl-icon name="${notification.icon}" slot="icon"></sl-icon>
        ${escapeHtml(notification.message)}
        ${notification.onAction ? '<sl-button slot="action" variant="primary" size="small">Mettre à jour</sl-button>' : ''}
      `
    });

    // Handle action button click
    if (notification.onAction) {
      const actionButton = alert.querySelector('sl-button[slot="action"]');
      if (actionButton) {
        actionButton.addEventListener('click', () => {
          alert.hide();
          notification.onAction!();
        });
      }
    }

    // Remove notification from state when dismissed
    alert.addEventListener('sl-hide', () => {
      // TODO can weadd to state notifications ?
    });

    document.body.append(alert);
    return alert.toast();
  }


  /**
   * Initialize Service Worker update detection
   */
  private initializeServiceWorkerUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker updates are not enabled');
      return;
    }

    // Listen for available updates
    this.swUpdate.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') {
        this.handleVersionReady(event);
      }
    });
  }

  /**
   * Handle when a new version is ready
   */
  private handleVersionReady(event: VersionReadyEvent): void {
    console.log('New version available:', event.latestVersion.hash);
    this.updateState({ updateAvailable: true });
    this.showUpdateNotification();
  }

  /**
   * Show notification for available update
   */
  private showUpdateNotification(): void {
    const notification: AppNotification = {
      message: 'Une nouvelle version est disponible.',
      variant: 'primary',
      icon: 'arrow-clockwise',
      duration: 0, // Persistent notification
      closable: true,
      onAction: () => this.applyUpdate()
    };

    this.createShoelaceAlert(notification);
  }

  /**
   * Utilitaire pour replacer le scroll au centre (colonne center) sur mobile
   *
   * @param wrapperElement - L'élément HTML du wrapper mobile (mobile-columns-wrapper)
   * @param behavior - Comportement du scroll : 'auto' (instantané) ou 'smooth' (animé)
   * @returns true si le scroll a été effectué, false sinon
   */
  scrollToCenter(wrapperElement: HTMLElement | null | undefined, behavior: ScrollBehavior = 'auto'): boolean {
    if (!wrapperElement) {
      console.warn('scrollToCenter: wrapperElement is null or undefined');
      return false;
    }

    // Vérifier si on est sur mobile (max-width: 599px)
    if (window.innerWidth > 599) {
      // Pas sur mobile, ne rien faire
      return false;
    }

    // Calculer la position de la colonne center (index 1 = 100vw)
    const centerPosition = 0;//window.innerWidth;

    // Scroller vers la colonne center
    wrapperElement.scrollTo({
      left: centerPosition,
      behavior: behavior
    });

    return true;
  }

  /**
   * Utilitaire pour scroller vers une colonne spécifique sur mobile
   *
   * @param wrapperElement - L'élément HTML du wrapper mobile (mobile-columns-wrapper)
   * @param columnIndex - Index de la colonne (0: side, 1: center, 2: right)
   * @param behavior - Comportement du scroll : 'auto' (instantané) ou 'smooth' (animé)
   * @returns true si le scroll a été effectué, false sinon
   */
  scrollToColumn(wrapperElement: HTMLElement | null | undefined, columnIndex: 0 | 1 | 2, behavior: ScrollBehavior = 'auto'): boolean {
    if (!wrapperElement) {
      console.warn('scrollToColumn: wrapperElement is null or undefined');
      return false;
    }

    // Vérifier si on est sur mobile (max-width: 599px)
    if (window.innerWidth > 599) {
      // Pas sur mobile, ne rien faire
      return false;
    }

    // Valider l'index de colonne
    if (columnIndex < 0 || columnIndex > 2) {
      console.warn(`scrollToColumn: columnIndex ${columnIndex} is invalid. Must be 0, 1, or 2.`);
      return false;
    }

    // Calculer la position de la colonne (chaque colonne = 100vw)
    const columnPosition = window.innerWidth * columnIndex;

    // Scroller vers la colonne
    wrapperElement.scrollTo({
      left: columnPosition,
      behavior: behavior
    });

    return true;
  }

}
