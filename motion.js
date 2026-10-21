/* =========================================================
   Carl Tampus — Portfolio motion (GSAP + ScrollTrigger + SplitText)
   Quiet, continuous scrolling: the page opens inside a window, the work
   lives in a 3D studio the camera flies through, sections slide up over
   each other on curved edges, text arrives blurred and slowly sharpens,
   and a strip of cards drifts sideways.
   Reduced motion keeps the fades and the sharpening and moves nothing.
   ========================================================= */
(() => {
  const { gsap, ScrollTrigger, SplitText } = window;
  if (!gsap || !ScrollTrigger) return; // main.js shows the page without GSAP

  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const root = document.documentElement;
  const full = root.dataset.motion !== 'reduced';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1200)]);
  const BLUR = full ? 16 : 10;

  root.classList.add('motion-ready');

  /* ---------- Blur reveals ----------
     Text is split ahead of time while the page is idle (so scrolling never waits on it), split again
     if the page width changes before it shows, and put back together once it is sharp. */
  function splitText(el, type) {
    if (!SplitText) return { pieces: [el], revert() {} };
    const result = SplitText.create(el, { type, aria: 'none', wordsClass: 'blur-word', linesClass: 'blur-line' });
    return { pieces: type === 'lines' ? result.lines : result.words, revert: () => result.revert() };
  }

  const hiddenState = words => ({ opacity: 0, filter: `blur(${BLUR}px)`, yPercent: full && words ? 38 : 0, y: full && !words ? 22 : 0 });

  // Headings split into words; paragraph groups split into lines, with short labels kept whole.
  // play() sharpens the pieces in reading order and returns the timeline.
  function prepare(el, kind) {
    let parts = [];
    let played = false;
    const build = () => {
      parts.forEach(part => part.revert());
      const blocks = kind === 'words' || el.matches('p') ? [el] : qsa(':scope > *', el);
      parts = blocks.map(block => {
        const whole = kind === 'lines' && (block.matches('h3, .eyebrow, span') || block.textContent.trim().length < 28);
        const part = whole
          ? { pieces: [block], words: false, revert: () => gsap.set(block, { clearProps: 'opacity,filter,transform' }) }
          : { ...splitText(block, kind), words: kind === 'words' };
        gsap.set(part.pieces, hiddenState(part.words));
        return part;
      });
      gsap.set(el, { opacity: 1 });
    };
    build();
    return {
      rebuild() { if (!played) build(); },
      play({ stagger, duration } = {}) {
        played = true;
        const tl = gsap.timeline({ onComplete: () => parts.forEach(part => part.revert()) });
        let at = 0;
        parts.forEach(part => {
          const gap = stagger ?? (part.words ? .055 : .14);
          tl.to(part.pieces, { opacity: 1, filter: 'blur(0px)', yPercent: 0, y: 0, duration: duration ?? (full ? 1.5 : 1), ease: 'power3.out', stagger: gap }, at);
          at += Math.min(.5, gap * part.pieces.length);
        });
        return tl;
      }
    };
  }

  // Every revealable text gets its trigger now; splitting happens in idle time, or on the spot if the reader gets there first.
  const entries = [];
  function reveal(el, kind, start = 'top 88%') {
    const entry = { ready: null, get() { return this.ready || (this.ready = prepare(el, kind)); } };
    entries.push(entry);
    ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => entry.get().play() });
  }
  const idle = window.requestIdleCallback
    ? callback => requestIdleCallback(callback, { timeout: 1500 })
    : callback => setTimeout(() => callback({ timeRemaining: () => 8 }), 60);
  function prepareWhenIdle() {
    const pending = entries.filter(entry => !entry.ready);
    if (!pending.length) return;
    idle(deadline => {
      do pending.shift().get(); while (pending.length && deadline.timeRemaining() > 3);
      prepareWhenIdle();
    });
  }
  let pageWidth = innerWidth;
  let resizeTimer = 0;
  addEventListener('resize', () => {
    if (innerWidth === pageWidth) return;
    pageWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => entries.forEach(entry => entry.ready?.rebuild()), 150);
  });

  /* ---------- Hero: the window rises, its lights come on, then the words sharpen ---------- */
  function hero() {
    const win = qs('[data-hero]');
    const nav = qs('#nav');
    if (full && nav) gsap.set(nav, { opacity: 0 });
    root.classList.remove('intro-pending');
    if (!win) {
      if (nav) gsap.to(nav, { opacity: 1, duration: .6 });
      return;
    }
    const body = qs('.hero-body', win);
    const status = qs('.status', body);
    const extras = qsa('.case-meta, .tags, .hero-actions, .hero-cue', body);
    gsap.set([status, ...extras].filter(Boolean), { opacity: 0 });

    const start = performance.now();
    if (full) {
      gsap.timeline()
        .fromTo(win, { opacity: 0, y: 70, scale: .94, filter: 'blur(12px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.7, ease: 'expo.out', clearProps: 'filter' })
        .from(qsa('.window-dots i', win), { scale: 0, duration: .55, stagger: .09, ease: 'back.out(3)' }, .5)
        // Opacity only: a transform on the header would carry the phone dock (fixed inside it) to the top.
        .to(nav, { opacity: 1, duration: 1.1, ease: 'power2.out' }, .8);
    } else {
      gsap.fromTo(win, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power1.out' });
    }

    fontsReady.then(() => {
      const elapsed = (performance.now() - start) / 1000;
      const tl = gsap.timeline({ delay: Math.max(0, (full ? .55 : .1) - elapsed) });
      if (status) tl.fromTo(status, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out', clearProps: 'filter' }, 0);
      const title = qs('[data-blur]', body);
      if (title) tl.add(prepare(title, 'words').play({ stagger: full ? .07 : .04, duration: full ? 1.6 : 1 }), .1);
      const sub = qs('[data-blur-lines]', body);
      if (sub) tl.add(prepare(sub, 'lines').play(), full ? .7 : .35);
      if (extras.length) tl.fromTo(extras, { opacity: 0, filter: 'blur(8px)', y: full ? 16 : 0 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1, stagger: .1, ease: 'power3.out', clearProps: 'filter,transform' }, full ? 1.05 : .5);
      const cue = qs('.hero-cue svg', body);
      if (cue && full) tl.to(cue, { y: 7, duration: .9, ease: 'sine.inOut', repeat: 5, yoyo: true }, '>');
    });

    // Scrolling on, the hero window settles back and dims while the work comes forward.
    if (full) {
      gsap.to('.hero', {
        scale: .92, opacity: .25, transformOrigin: '50% 100%', ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ---------- Horizontal gallery (case pages): pinned while the screens slide past ---------- */
  function gallery() {
    const section = qs('[data-gallery]');
    const track = section && qs('.gallery-track', section);
    if (!track || !full) return;
    gsap.matchMedia().add('(min-width: 901px)', () => {
      root.classList.add('has-pin');
      const distance = () => Math.max(0, track.scrollWidth - root.clientWidth);
      const slide = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      qsa('.gallery-item', track).forEach(item => {
        gsap.fromTo(item, { opacity: .3, scale: .9 }, {
          opacity: 1, scale: 1, ease: 'none',
          scrollTrigger: { trigger: item, containerAnimation: slide, start: 'left 96%', end: 'left 50%', scrub: true }
        });
      });
      return () => root.classList.remove('has-pin');
    });
  }

  /* ---------- Work: the studio ----------
     Large screens with full motion: the studio holds still while scrolling flies the camera in from a
     wide shot, turns the turntable to each project, then pulls back as the next section slides over.
     Elsewhere the camera glides in once and the list turns the turntable (style.css does the turning). */
  const THETA = 48, RADIUS = 1.4; // the same turn and radius as --theta and --r in style.css
  function studio() {
    const section = qs('[data-studio]');
    const stage = section && qs('.studio-stage', section);
    if (!stage) return;
    const items = qsa('.orbit-item', section);
    const show = window.site?.showProject || (() => {});

    // The window facing you leans a little toward the mouse.
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    if (full) {
      const tilts = items.map(item => {
        const el = qs('.orbit-tilt', item);
        return { item, x: gsap.quickTo(el, 'rotationY', { duration: .9, ease: 'power3.out' }), y: gsap.quickTo(el, 'rotationX', { duration: .9, ease: 'power3.out' }) };
      });
      let box = null;
      stage.addEventListener('pointermove', event => {
        if (!fine.matches || event.pointerType !== 'mouse') return;
        box ||= stage.getBoundingClientRect();
        const nx = (event.clientX - box.left) / box.width * 2 - 1;
        const ny = (event.clientY - box.top) / box.height * 2 - 1;
        tilts.forEach(tilt => {
          const on = tilt.item.classList.contains('is-front');
          tilt.x(on ? nx * 7 : 0);
          tilt.y(on ? -ny * 5 : 0);
        });
      });
      stage.addEventListener('pointerleave', () => { box = null; tilts.forEach(tilt => { tilt.x(0); tilt.y(0); }); });
      addEventListener('scroll', () => { box = null; }, { passive: true });
    }
    if (!full) return; // reduced motion: the list switches projects in place and nothing flies

    const mm = gsap.matchMedia();
    mm.add('(max-width: 900px)', () => {
      ScrollTrigger.create({ trigger: stage, start: 'top 78%', once: true, onEnter: () => stage.classList.add('is-in') });
    });
    mm.add('(min-width: 901px)', () => {
      root.classList.add('has-studio-pin');
      const frame = qs('.studio-frame', section);
      const dolly = qs('.studio-dolly', section);
      const camera = qs('.studio-camera', section);
      const ring = qs('.studio-ring', section);
      const wall = qs('.studio-wall', section);
      const word = qs('.studio-word', section);
      const beam = qs('.studio-beam', section);
      const hint = qs('.studio-hint', section);
      const panel = qs('.studio-panel', section);
      const shade = qs('.studio-shade', section);

      // Sizes come from the CSS (window width) and are measured again whenever ScrollTrigger refreshes.
      const w = () => items[0].offsetWidth;
      const r = () => w() * RADIUS;
      // The window facing you sits in the space left of the list.
      const shift = () => -(panel.offsetWidth + parseFloat(getComputedStyle(panel).right)) / 2;
      // The wall slides a little the other way as the turntable turns, so the room seems to turn around you.
      const wallX = angle => -(angle + THETA) * 2.4;

      // Timeline time is measured in screens of scrolling.
      const FLY = 1, HOLD = .55, TURN = .85, EXIT = 1;
      const holds = [], switches = [];
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.fromTo(camera, { z: () => -(r() + w() * 2.2), y: () => w() * .05, rotationX: -15 }, { z: () => -r(), y: 0, rotationX: -2, duration: FLY, ease: 'power2.inOut' }, 0)
        .fromTo(ring, { rotationY: -THETA }, { rotationY: 0, duration: FLY, ease: 'power2.inOut' }, 0)
        .fromTo(wall, { x: wallX(-THETA) }, { x: wallX(0), duration: FLY, ease: 'power2.inOut' }, 0)
        // Up close the window stands at a slight angle, its far edge turned toward the list.
        .fromTo(dolly, { x: 0, rotationY: 0 }, { x: shift, rotationY: 12, duration: FLY, ease: 'power2.inOut' }, 0)
        .fromTo(word, { y: 0, scale: 1, opacity: 1 }, { y: () => -innerHeight * .16, scale: 1.06, opacity: 0, duration: FLY * .5, ease: 'power1.in' }, 0)
        .fromTo(hint, { opacity: 1 }, { opacity: 0, duration: .2 }, 0)
        .fromTo(beam, { opacity: 1 }, { opacity: 0, duration: .45 }, .3)
        .fromTo(panel, { opacity: 0, x: 48 }, { opacity: 1, x: 0, duration: .45, ease: 'power2.out' }, FLY - .45);
      let at = FLY;
      items.forEach((item, index) => {
        holds.push(at + HOLD / 2);
        // Never quite still: the camera keeps drifting in while you read.
        tl.to(camera, { z: () => -r() + w() * .05, duration: HOLD }, at);
        at += HOLD;
        if (index === items.length - 1) return;
        const angle = -(index + 1) * THETA;
        tl.to(ring, { rotationY: angle, duration: TURN, ease: 'power2.inOut' }, at)
          .to(wall, { x: wallX(angle), duration: TURN, ease: 'power2.inOut' }, at)
          // The camera eases back while the turntable turns, then comes in on the next window.
          .to(camera, { z: () => -r() - w() * .24, duration: TURN / 2, ease: 'sine.inOut' }, at)
          .to(camera, { z: () => -r(), duration: TURN / 2, ease: 'sine.inOut' }, at + TURN / 2);
        switches.push(at + TURN / 2);
        at += TURN;
      });
      // On the way out the camera pulls back and the room dims while the next section slides over it.
      tl.to(camera, { z: () => -r() - w() * .9, rotationX: -9, duration: EXIT, ease: 'power1.in' }, at)
        .to(panel, { opacity: 0, x: 32, duration: EXIT * .4, ease: 'power1.in' }, at)
        .to(shade, { opacity: .7, duration: EXIT, ease: 'power1.in' }, at);
      const total = at + EXIT;

      tl.eventCallback('onUpdate', () => {
        const time = tl.time();
        show(switches.filter(point => time >= point).length);
        stage.classList.toggle('is-wide', time < FLY * .45);
      });

      const st = ScrollTrigger.create({
        trigger: section, start: 'top top', end: () => `+=${innerHeight * total}`,
        pin: frame, scrub: .6, animation: tl, invalidateOnRefresh: true, anticipatePin: 1
      });

      // The light comes down onto the turntable while the studio rises into view.
      gsap.fromTo(beam, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 10%', scrub: true } });

      // Picking from the list (or a side window) glides the page to that project's stop.
      const toHold = index => st.start + (st.end - st.start) * holds[index] / total;
      const onPick = event => {
        event.preventDefault();
        window.site?.glideTo(toHold(event.detail.index), 1.4);
      };
      // Tabbing into the list while the camera is out (before the fly-in, or after the exit) flies it to that project.
      const tabs = qsa('[role="tab"]', section);
      const onFocus = event => {
        if (scrollY >= toHold(0) - 4 && scrollY <= st.end - innerHeight * EXIT) return;
        const host = event.target.closest('[role="tab"], [role="tabpanel"]');
        const index = host ? tabs.findIndex(tab => tab === host || tab.getAttribute('aria-controls') === host.id) : 0;
        window.site?.glideTo(toHold(Math.max(0, index)), 1.4);
      };
      section.addEventListener('studio:pick', onPick);
      panel.addEventListener('focusin', onFocus);
      return () => {
        root.classList.remove('has-studio-pin');
        section.removeEventListener('studio:pick', onPick);
        panel.removeEventListener('focusin', onFocus);
      };
    });
  }

  /* ---------- Case-page showcases: the screen inside lifts out of its frame as you scroll ---------- */
  function parallax() {
    if (!full) return;
    qsa('[data-parallax]').forEach(box => {
      const inner = box.firstElementChild;
      if (!inner) return;
      gsap.fromTo(inner, { y: 130 }, { y: 0, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'top 30%', scrub: true } });
    });
  }

  /* ---------- Sheets: the curved top edge of a section flattens as it slides up into place ---------- */
  function sheets() {
    if (!full) return;
    qsa('.sheet-cap').forEach(cap => {
      gsap.fromTo(cap, { scaleY: 1 }, { scaleY: 0, ease: 'power2.in', scrollTrigger: { trigger: cap.parentElement, start: 'top bottom', end: 'top top', scrub: true } });
    });
  }

  /* ---------- Stacked cards: each card shrinks back a little as the next one slides over it ---------- */
  function stack() {
    if (!full) return;
    qsa('[data-stack]').forEach(list => {
      const cards = qsa(':scope > li', list);
      cards.slice(0, -1).forEach((card, index) => {
        gsap.to(card, {
          scale: .94, opacity: .55, ease: 'none',
          scrollTrigger: { trigger: cards[index + 1], start: 'top bottom', end: () => `top ${parseFloat(getComputedStyle(cards[index + 1]).top) || 0}px`, scrub: true, invalidateOnRefresh: true }
        });
      });
    });
  }

  /* ---------- Lines that draw themselves once as they come into view ---------- */
  function draw() {
    qsa('[data-draw] path').forEach(path => {
      if (!full) return; // reduced motion: the line is simply there
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(path, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', scrollTrigger: { trigger: path.ownerSVGElement, start: 'top 85%', once: true } });
    });
  }

  /* ---------- Theater: the intro window grows to full size while the two words part around it ---------- */
  function theater() {
    const dialog = qs('#theater');
    if (!dialog) return;
    const screen = qs('.theater-screen', dialog);
    const words = qsa('.theater-words span', dialog);
    dialog.addEventListener('theater:open', event => {
      gsap.killTweensOf([screen, ...words]);
      if (!full) {
        gsap.fromTo([screen, ...words], { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power1.out', clearProps: 'opacity' });
        return;
      }
      const to = screen.getBoundingClientRect();
      const from = event.detail?.from;
      const seen = from && from.width > 40 && from.bottom > 0 && from.top < innerHeight;
      const start = seen
        ? { x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height }
        : { x: to.width * .3, y: to.height * .3, scaleX: .4, scaleY: .4, opacity: 0 };
      gsap.fromTo(screen, { ...start, transformOrigin: '0 0' }, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 1.1, ease: 'expo.inOut', clearProps: 'transform,opacity' });
      gsap.fromTo(words[0], { xPercent: 70, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.4, delay: .3, ease: 'expo.out' });
      gsap.fromTo(words[1], { xPercent: -70, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.4, delay: .3, ease: 'expo.out' });
    });
  }

  /* ---------- The moving strip: drifts on its own, follows the scroll, pauses on request ---------- */
  function marquee() {
    const box = qs('[data-marquee]');
    const track = box && qs('.marquee-track', box);
    const set = track && qs('.marquee-set', track);
    const toggle = qs('#marqueeToggle');
    if (!set || !full) return;

    const copy = set.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.removeAttribute('aria-label');
    qsa('img', copy).forEach(img => { img.alt = ''; });
    track.appendChild(copy);

    let width = set.offsetWidth;
    let x = 0, speed = 1, extra = 0, direction = -1;
    let paused = false, hovering = false, visible = false;

    const setX = gsap.quickSetter(track, 'x', 'px');
    ScrollTrigger.create({
      trigger: box, start: 'top bottom', end: 'bottom top',
      onToggle: self => { visible = self.isActive; },
      onUpdate: self => {
        const velocity = self.getVelocity();
        if (Math.abs(velocity) > 20) direction = velocity > 0 ? -1 : 1;
        extra = Math.max(extra, Math.min(Math.abs(velocity) * .35, 1400));
      },
      onRefresh: () => { width = set.offsetWidth; }
    });

    gsap.ticker.add((time, deltaTime) => {
      if (!visible || !width) return;
      const dt = Math.min(deltaTime, 60) / 1000;
      speed += ((paused || hovering ? 0 : 1) - speed) * Math.min(1, dt * 5);
      extra *= Math.pow(.05, dt);
      x += direction * (46 + extra) * speed * dt;
      if (x <= -width) x += width;
      if (x > 0) x -= width;
      setX(x);
    });

    box.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
    box.addEventListener('pointerleave', () => { hovering = false; });
    toggle?.addEventListener('click', () => {
      paused = !paused;
      toggle.textContent = paused ? 'Play the moving strip' : 'Pause the moving strip';
    });
  }

  /* ---------- Case-study details ---------- */
  function pipeline() {
    const list = qs('[data-pipeline]');
    if (!list) return;
    const steps = qsa('li', list);
    gsap.fromTo(steps, { opacity: 0, filter: `blur(${BLUR / 2}px)`, y: full ? 30 : 0 }, {
      opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.1, stagger: .12, ease: 'power3.out', clearProps: 'filter,transform',
      scrollTrigger: { trigger: list, start: 'top 86%', once: true }
    });
    if (!full) return; // the line is drawn complete in reduced motion
    ScrollTrigger.create({
      trigger: list, start: 'top 72%', end: 'bottom 52%',
      onUpdate: self => {
        list.style.setProperty('--progress', self.progress.toFixed(4));
        steps.forEach((step, index) => step.classList.toggle('is-reached', self.progress >= index / steps.length + .02));
      }
    });
  }

  function chat() {
    const body = qs('[data-chat]');
    if (!body) return;
    gsap.fromTo(body.children, { opacity: 0, filter: 'blur(6px)', y: full ? 16 : 0 }, {
      opacity: 1, filter: 'blur(0px)', y: 0, duration: .8, stagger: full ? .55 : .2, ease: 'power3.out', clearProps: 'filter,transform',
      scrollTrigger: { trigger: body, start: 'top 80%', once: true }
    });
  }

  // A signal travels from the assistant to Google Flow, lighting each piece on the way.
  function chain() {
    const list = qs('[data-chain]');
    if (!list || !full) return;
    const nodes = qsa('li', list);
    gsap.set(nodes, { '--link': 0, opacity: 0, y: 20 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 84%', once: true } });
    nodes.forEach((node, index) => {
      if (index) tl.to(node, { '--link': 1, duration: .3, ease: 'power1.inOut' });
      tl.to(node, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, index ? '<.15' : 0)
        .add(() => nodes.forEach(item => item.classList.toggle('is-lit', item === node)), '<');
    });
    tl.add(() => nodes.forEach(item => item.classList.remove('is-lit')), '+=1.2');
  }

  // Plain counts tick up; values with a unit, like 1080p, simply arrive.
  function countUp(el) {
    const value = el.textContent.trim();
    if (!/^\d+$/.test(value) || !full) return;
    const state = { value: 0 };
    gsap.to(state, {
      value: Number(value), duration: 1.2, ease: 'power2.out',
      onUpdate: () => { el.textContent = String(Math.round(state.value)); }
    });
  }

  // Everything marked data-reveal fades up in reading order as it arrives; large frames skip the blur.
  function reveals() {
    const items = qsa('[data-reveal]');
    if (!items.length) return;
    items.forEach(el => {
      const large = el.matches('.window, .contact-form, .project-card, .next-card');
      gsap.set(el, { opacity: 0, y: full ? (large ? 80 : 40) : 0, filter: large ? 'none' : `blur(${BLUR / 2}px)` });
    });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: batch => {
        gsap.to(batch, { opacity: 1, y: 0, filter: 'blur(0px)', duration: full ? 1.4 : .9, stagger: .1, ease: 'expo.out', clearProps: 'filter,transform' });
        batch.forEach(el => qsa('[data-count]', el).forEach(countUp));
      }
    });
  }

  /* ---------- Text ---------- */
  function text() {
    const inHero = el => el.closest('[data-hero]');
    qsa('[data-blur]').filter(el => !inHero(el)).forEach(el => reveal(el, 'words'));
    qsa('[data-blur-lines]').filter(el => !inHero(el)).forEach(el => reveal(el, 'lines', 'top 90%'));
    // The about statement sharpens word by word as you read down through it.
    qsa('[data-blur-scrub]').forEach(el => {
      const { pieces } = splitText(el, 'words');
      gsap.set(el, { opacity: 1 });
      gsap.fromTo(pieces, { opacity: .14, filter: 'blur(6px)' }, {
        opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: .08,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true }
      });
    });
    prepareWhenIdle();
  }

  /* ---------- Between pages: the current page softly fades before the next one opens ---------- */
  function pageLeave() {
    const parts = [qs('main'), qs('.footer')].filter(Boolean);
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      const page = path => path.replace(/index\.html$/, '');
      if (url.origin !== location.origin || page(url.pathname) === page(location.pathname) || !/(\.html|\/)$/.test(url.pathname)) return;
      event.preventDefault();
      let gone = false;
      const go = () => { if (!gone) { gone = true; location.href = url.href; } };
      // From the studio, the camera first flies into the window you picked.
      const dolly = link.matches('[data-studio-open]') && full && qs('.studio-dolly');
      if (dolly) {
        const w = qs('.orbit-item')?.offsetWidth || 600;
        gsap.to(dolly, { z: w * .75, duration: .7, ease: 'power3.in' });
        gsap.to(parts, { opacity: 0, duration: .35, delay: .4, ease: 'power1.in', onComplete: go });
        setTimeout(go, 1000);
        return;
      }
      gsap.to(parts, { opacity: 0, y: full ? -24 : 0, filter: 'blur(6px)', duration: .45, ease: 'power2.in', onComplete: go });
      setTimeout(go, 700);
    });
    // Coming back with the browser's Back button shows the page as it was left.
    addEventListener('pageshow', event => {
      if (!event.persisted) return;
      gsap.set(parts, { clearProps: 'opacity,transform,filter' });
      gsap.set('.studio-dolly', { z: 0 });
    });
  }

  // Pinned scenes first, so everything measured after them accounts for the space they take.
  gallery();
  studio();
  sheets();
  hero();
  parallax();
  theater();
  marquee();
  pipeline();
  chat();
  chain();
  stack();
  draw();
  reveals();
  pageLeave();
  fontsReady.then(() => {
    text();
    ScrollTrigger.refresh();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
