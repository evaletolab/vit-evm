/**
 * Queue of claim links opened before the user has a wallet.
 * Multiple links can be clicked; first triggers wallet creation, then all are processed.
 */
export interface PendingClaim {
  id: string;
  secret: string;
  fromName?: string;
  contactEncoded?: string;
  addedAt: number;
  /** Full return path for router (query string without ?). */
  returnQuery: string;
}

const STORAGE_KEY = 'vit-pending-claims';
const MAX_PENDING = 20;

export function listPendingClaims(): PendingClaim[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingClaim[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingClaim(claim: Omit<PendingClaim, 'addedAt'>): PendingClaim[] {
  const list = [
    { ...claim, addedAt: Date.now() },
    ...listPendingClaims().filter((c) => c.id !== claim.id),
  ].slice(0, MAX_PENDING);
  persist(list);
  return list;
}

export function removePendingClaim(id: string): void {
  persist(listPendingClaims().filter((c) => c.id !== id));
}

export function clearPendingClaims(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function persist(list: PendingClaim[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
