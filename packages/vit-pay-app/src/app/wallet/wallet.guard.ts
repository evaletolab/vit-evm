import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletStorageService } from './wallet-storage.service';
import { ThemeService } from '../theme/theme.service';

export const requireWalletGuard: CanActivateFn = () => {
  const storage = inject(WalletStorageService);
  const router = inject(Router);
  return storage.load() != null ? true : router.createUrlTree(['/wallet']);
};

// La page /wallet reste toujours accessible pour l'onboarding (tant qu'aucun
// wallet n'existe) — sinon `requireWalletGuard` renverrait ici en boucle. Une
// fois le wallet créé, elle n'est accessible que si le « Mode dev » est actif.
export const devOnlyGuard: CanActivateFn = () => {
  const storage = inject(WalletStorageService);
  const theme = inject(ThemeService);
  const router = inject(Router);
  if (storage.load() == null) return true; // onboarding : création du wallet
  return theme.isDevMode() ? true : router.createUrlTree(['/']);
};
