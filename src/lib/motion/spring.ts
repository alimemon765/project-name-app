// Interruptible spring (apple-design §3–§6), ported from the tested prototype (replica/design/directions/proto/spring.js).
// Damping ratio + response (s); starts from the presentation value; carries velocity through re-targets.
export interface SpringConfig { damping: number; response: number; velocity?: number }

export const projectMomentum = (velocityPxPerS: number, rate = 0.998) => (velocityPxPerS / 1000) * rate / (1 - rate);
export const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

export class Spring {
  x: number; v = 0; private target: number; private raf = 0;
  constructor(value: number, private onUpdate: (x: number) => void) { this.x = value; this.target = value; }
  set(value: number) { this.stop(); this.x = value; this.v = 0; this.target = value; this.onUpdate(value); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  get moving() { return this.raf !== 0; }
  to(target: number, { damping, response, velocity }: SpringConfig, onRest?: () => void) {
    this.target = target;
    if (velocity !== undefined) this.v = velocity;
    const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response;
    let last = performance.now();
    this.stop();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      for (let i = 0; i < 4; i++) { const h = dt / 4; const a = -k * (this.x - this.target) - c * this.v; this.v += a * h; this.x += this.v * h; }
      this.onUpdate(this.x);
      if (Math.abs(this.v) < 0.5 && Math.abs(this.x - this.target) < 0.5) { this.x = this.target; this.v = 0; this.onUpdate(this.x); this.raf = 0; onRest?.(); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}
