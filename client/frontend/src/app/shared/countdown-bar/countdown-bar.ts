import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-countdown-bar',
  templateUrl: './countdown-bar.html',
  styleUrl: './countdown-bar.scss',
})
export class CountdownBarComponent {
  readonly duration = input(30);
  readonly running = input(false);
  readonly resetKey = input<unknown>(0);
  readonly expired = output<void>();

  private readonly now = signal(0);
  private startedAt = 0;
  private emitted = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly remaining = computed(() => {
    const d = this.duration();
    if (d <= 0) {
      return 0;
    }
    return Math.max(d - (this.now() - this.startedAt) / 1000, 0);
  });

  protected readonly percent = computed(() => {
    const d = this.duration();
    if (d <= 0) {
      return 0;
    }
    return Math.max((this.remaining() / d) * 100, 0);
  });

  protected readonly warn = computed(() => this.remaining() <= 5);

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      this.resetKey();
      if (this.running()) {
        this.start();
      } else {
        this.stop();
      }
    });
    destroyRef.onDestroy(() => this.stop());
  }

  private start(): void {
    this.stop();
    this.startedAt = Date.now();
    this.now.set(Date.now());
    this.emitted = false;
    this.timer = setInterval(() => {
      this.now.set(Date.now());
      if (this.running() && this.remaining() <= 0 && !this.emitted) {
        this.emitted = true;
        this.expired.emit();
      }
    }, 250);
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  protected ceilRemaining(): number {
    return Math.ceil(this.remaining());
  }
}
