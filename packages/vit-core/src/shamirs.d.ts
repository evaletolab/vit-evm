declare module 'shamirs-secret-sharing' {
  // Déclare la classe Buffer (si elle n'est pas déjà déclarée globalement)
  export class Buffer {
    constructor(arg: any);
    toString(encoding: string): string;
    static from(array: Uint8Array | string, encoding?: string): Buffer;
    static alloc(size: number): Buffer;
  }

  type SplitOptions = { shares: number, threshold: number };

  // Déclare la fonction split
  export function split(secret: string|BufferLike, option:SplitOptions): Buffer[];

  // Déclare la fonction combine
  export function combine(shares: string[]): Buffer;
}
