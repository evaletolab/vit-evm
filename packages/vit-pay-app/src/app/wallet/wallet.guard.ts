import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletStorageService } from './wallet-storage.service';

export const requireWalletGuard: CanActivateFn = () => {
  const storage = inject(WalletStorageService);
  const router = inject(Router);
  return storage.load() != null ? true : router.createUrlTree(['/wallet']);
};
