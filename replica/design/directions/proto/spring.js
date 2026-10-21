/* Minimal interruptible spring (apple-design §3-§6): damping ratio + response, starts from the
   presentation value, carries velocity through re-targets, momentum projection for flicks. */
(function () {
  const project = (v, rate = 0.998) => (v / 1000) * rate / (1 - rate);
  function rubberband(over, dim, c = 0.55) { return (over * dim * c) / (dim + c * Math.abs(over)); }
  // rAF normally; a 16ms timer when the tab is hidden (background panes get no frames)
  const raf = cb => document.hidden ? setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame(cb);
  const caf = id => { cancelAnimationFrame(id); clearTimeout(id); };
  class Spring {
    constructor(value, onUpdate) { this.x = value; this.v = 0; this.target = value; this.onUpdate = onUpdate; this.raf = 0; }
    set(value) { caf(this.raf); this.raf = 0; this.x = value; this.v = 0; this.target = value; this.onUpdate(value); }
    to(target, { damping = 1, response = 0.35, velocity } = {}) {
      this.target = target;
      if (velocity !== undefined) this.v = velocity;
      const k = Math.pow((2 * Math.PI) / response, 2), c = (4 * Math.PI * damping) / response;
      let last = performance.now();
      caf(this.raf);
      const step = (now) => {
        let dt = Math.min((now - last) / 1000, 1 / 30); last = now;
        for (let i = 0; i < 4; i++) {           // 4 sub-steps for stability
          const h = dt / 4, a = -k * (this.x - this.target) - c * this.v;
          this.v += a * h; this.x += this.v * h;
        }
        this.onUpdate(this.x);
        if (Math.abs(this.v) < 0.5 && Math.abs(this.x - this.target) < 0.5) { this.x = this.target; this.v = 0; this.onUpdate(this.x); this.raf = 0; return; }
        this.raf = raf(step);
      };
      this.raf = raf(step);
    }
    get moving() { return this.raf !== 0; }
  }
  window.Spring = Spring; window.springProject = project; window.rubberband = rubberband;
})();
