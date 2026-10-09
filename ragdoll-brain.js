/* Wall-clock inactivity and curiosity scheduling, independent of rendering speed. */
(function (root) {
  'use strict';
  class RagdollBrain {
    constructor(now = 0, random = Math.random) {
      this.random = random;
      this.lastInteraction = now;
      this.nextDecision = now + 5000;
      this.recent = [];
      this.lastKind = null;
    }
    interact(now) {
      this.lastInteraction = now;
      this.nextDecision = now + 5000;
    }
    ready(now, {enabled = true, held = false, hidden = false, locked = false, busy = false} = {}) {
      return enabled && !held && !hidden && !locked && !busy &&
        now - this.lastInteraction >= 5000 && now >= this.nextDecision;
    }
    choose(targets, now) {
      const fresh = targets.filter(target => !this.recent.includes(target.id));
      const candidates = fresh.length ? fresh : targets;
      const varied = candidates.filter(target => target.kind && target.kind !== this.lastKind);
      const pool = varied.length ? varied : candidates;
      const target = pool.length ? pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))] : null;
      if (target) {
        this.lastKind = target.kind || null;
        this.recent.push(target.id);
        this.recent = this.recent.slice(-4);
      }
      this.nextDecision = now + 5000;
      return target;
    }
    rest(now, delay = 1800) { this.nextDecision = now + delay; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = RagdollBrain;
  else root.RagdollBrain = RagdollBrain;
})(typeof window !== 'undefined' ? window : globalThis);
