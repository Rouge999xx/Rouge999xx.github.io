/* =========================================================
   Carl Tampus — Portfolio motion (GSAP + ScrollTrigger + SplitText)
   Quiet, continuous scrolling: the page opens inside a window, projects
   rise into view with their screenshots lifting out of the frame, text
   arrives blurred and slowly sharpens, and a strip of cards drifts sideways.
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
  const journey = root.classList.contains('journey'); // the 3D world of journey.js is behind this page
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
  // Text inside a chapter is triggered by the chapter itself: the chapter never moves, while its held frame does.
  const entries = [];
  const held = el => el.closest('.chapter');
  function reveal(el, kind, start = 'top 88%') {
    const entry = { ready: null, get() { return this.ready || (this.ready = prepare(el, kind)); } };
    entries.push(entry);
    const chapter = held(el);
    ScrollTrigger.create({ trigger: chapter || el, start: chapter ? 'top 66%' : start, once: true, onEnter: () => entry.get().play() });
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

  const onEnter = (el, play, start = 'top 88%') => ScrollTrigger.create({ trigger: el, start, once: true, onEnter: play });

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

    // Scrolling on, the hero window settles back and dims while the work comes forward. In the journey it
    // holds the screen instead, grows past its edges and fades, so the camera flies through it into the world.
    if (!full) return;
    const settle = () => gsap.to('.hero', {
      scale: .92, opacity: .25, transformOrigin: '50% 100%', ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    if (!journey || !qs('.hero-stage')) {
      settle();
      return;
    }
    gsap.matchMedia().add({ wide: '(min-width: 901px)', narrow: '(max-width: 900px)' }, context => {
      if (context.conditions.narrow) {
        settle();
        return;
      }
      gsap.timeline({ scrollTrigger: { trigger: '.hero-stage', start: 'top top', end: 'bottom bottom', scrub: true } })
        .to('.hero', { scale: 1.4, transformOrigin: '50% 50%', ease: 'power2.in', duration: 1 }, 0)
        .to('.hero', { opacity: 0, ease: 'power1.in', duration: .62 }, .38);
    });
  }

  /* ---------- Chapters: while a chapter holds the screen, its steps light up one after another ---------- */
  function chapters() {
    if (!full || !journey) return; // otherwise every step stays lit
    qsa('.chapter').forEach(chapter => {
      const steps = qsa('[data-steps] > li', chapter);
      if (!steps.length) return;
      gsap.matchMedia().add('(min-width: 901px)', () => {
        let now = -1;
        const light = progress => {
          const next = Math.min(steps.length - 1, Math.floor(progress * steps.length * 1.08));
          if (next === now) return;
          now = next;
          steps.forEach((step, index) => {
            step.classList.toggle('is-on', index <= now);
            step.classList.toggle('is-now', index === now);
          });
        };
        light(0);
        ScrollTrigger.create({ trigger: chapter, start: 'top top', end: 'bottom bottom', onUpdate: self => light(self.progress), onRefresh: self => light(self.progress) });
        return () => steps.forEach(step => step.classList.remove('is-on', 'is-now'));
      });
    });
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

  /* ---------- Projects: each card rises, then its screenshot lifts out of the frame ---------- */
  function projects() {
    qsa('[data-project]').forEach(project => {
      const head = qs('.project-head', project);
      const tl = gsap.timeline({ paused: true });
      if (full) tl.fromTo(project, { opacity: 0, y: 120, scale: .93 }, { opacity: 1, y: 0, scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' });
      else tl.fromTo(project, { opacity: 0 }, { opacity: 1, duration: .8, ease: 'power1.out' });
      if (head) tl.fromTo(head, { opacity: 0, filter: `blur(${BLUR}px)` }, { opacity: 1, filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', clearProps: 'filter' }, full ? .25 : .1);
      onEnter(project, () => tl.play(), 'top 94%');
    });

    if (!full) return;
    qsa('[data-parallax]').forEach(box => {
      const inner = box.firstElementChild;
      if (!inner) return;
      gsap.fromTo(inner, { y: 130 }, { y: 0, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'top 30%', scrub: true } });
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
    const show = batch => {
      gsap.to(batch, { opacity: 1, y: 0, filter: 'blur(0px)', duration: full ? 1.4 : .9, stagger: .1, ease: 'expo.out', clearProps: 'filter,transform' });
      batch.forEach(el => qsa('[data-count]', el).forEach(countUp));
    };
    const inChapters = items.filter(held);
    inChapters.forEach(el => onEnter(held(el), () => show([el]), 'top 60%'));
    ScrollTrigger.batch(items.filter(el => !held(el)), { start: 'top 90%', once: true, onEnter: show });
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
      gsap.to(parts, { opacity: 0, y: full ? -24 : 0, filter: 'blur(6px)', duration: .45, ease: 'power2.in', onComplete: go });
      setTimeout(go, 700);
    });
    // Coming back with the browser's Back button shows the page as it was left.
    addEventListener('pageshow', event => {
      if (event.persisted) gsap.set(parts, { clearProps: 'opacity,transform,filter' });
    });
  }

  // Pinned scenes first, so everything measured after them accounts for the space they take.
  gallery();
  hero();
  chapters();
  projects();
  marquee();
  pipeline();
  chat();
  chain();
  reveals();
  pageLeave();
  fontsReady.then(() => {
    text();
    ScrollTrigger.refresh();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
