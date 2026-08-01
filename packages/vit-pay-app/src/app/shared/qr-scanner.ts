/**
 * Scanner QR réutilisable : `BarcodeDetector` natif quand il existe, sinon jsQR.
 *
 * Le callback est appelé hors de la zone Angular (rAF / promesse native) :
 * l'appelant doit le réentrer via `NgZone.run` s'il met à jour la vue.
 */
import jsQR from 'jsqr';

type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

export class QrScanner {
  private stream?: MediaStream;
  private detector?: BarcodeDetectorLike;
  private rafId?: number;
  private canvas?: HTMLCanvasElement;
  private video?: HTMLVideoElement;
  private onResult?: (value: string) => void;
  private running = false;

  async start(video: HTMLVideoElement, onResult: (value: string) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('La caméra n\'est pas disponible sur ce navigateur.');
    }

    this.video = video;
    this.onResult = onResult;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    video.srcObject = this.stream;
    await video.play();

    const Ctor = (globalThis as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
    }).BarcodeDetector;
    if (typeof Ctor === 'function') {
      try {
        this.detector = new Ctor({ formats: ['qr_code'] });
      } catch {
        this.detector = undefined; // format non supporté → jsQR
      }
    }

    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    if (this.video) this.video.srcObject = null;
    this.video = undefined;
  }

  private tick(): void {
    if (!this.running) return;
    const video = this.video;
    if (!video || video.readyState < 2) {
      this.rafId = requestAnimationFrame(() => this.tick());
      return;
    }

    if (this.detector) {
      this.detector
        .detect(video)
        .then((codes) => {
          if (!this.running) return;
          if (codes.length > 0) this.emit(codes[0].rawValue);
          else this.rafId = requestAnimationFrame(() => this.tick());
        })
        .catch(() => {
          this.detector = undefined; // bascule définitive sur jsQR
          this.rafId = requestAnimationFrame(() => this.tick());
        });
      return;
    }

    if (!this.canvas) this.canvas = document.createElement('canvas');
    const canvas = this.canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) {
      this.emit(code.data);
      return;
    }
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private emit(value: string): void {
    const cb = this.onResult;
    this.stop();
    cb?.(value);
  }
}
