/* Scroll storytelling: the page plays out in chapters, from "I build software that feels alive."
   to "Have something worth building?". Uses GSAP, ScrollTrigger and SplitText (loaded before this file).
   With reduced motion the same chapters simply fade in: no pinning, scrubbing, counting or movement. */
(() => {
  'use strict';
  const { gsap, ScrollTrigger, SplitText } = window;
  const root = document.documentElement;
  if (!gsap || !ScrollTrigger) { root.classList.remove('story-intro'); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  const reduced = root.dataset.motion === 'reduced';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const headerOffset = () => (qs('#siteHeader')?.offsetHeight || 64) + 24;
  const once = (trigger, start, onEnter) => trigger && ScrollTrigger.create({ trigger, start, once: true, onEnter });
  const split = (el, type) => (SplitText && !reduced ? SplitText.create(el, { type, mask: 'lines', linesClass: 'split-line' }) : null);
  const mm = gsap.matchMedia();

  // The hand-drawn underline under a key word ("alive.", "building?") draws itself in.
  function drawUnderline(em) {
    const path = em && qs('.alive-underline path', em);
    if (!path) return;
    gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, {
      strokeDashoffset: 0, duration: .9, ease: 'power2.inOut',
      onStart: () => em.classList.remove('is-undrawn')
    });
  }

  /* ---------- Chapter 0: the hook ---------- */
  function heroIntro() {
    const title = qs('.hero-title');
    const em = qs('em', title);
    const header = qs('#siteHeader');
    const main = qs('.hero-main');
    const portrait = qs('.hero-portrait');
    const photo = qs('picture', portrait);
    const stats = qsa('.hero-stat');
    const lines = [qs('.eyebrow'), qs('.hero-intro'), qs('.role-row')];
    const actions = qsa('.hero-actions > .button, .social-links > a');

    // If the CSS failsafe already showed the hero (slow network), skip its intro instead of replaying it.
    const late = performance.now() > 2300;
    if (reduced || late) {
      gsap.set([main, portrait, ...stats], { opacity: 1 });
      root.classList.remove('story-intro');
      return;
    }
    em.classList.add('is-undrawn');
    const words = split(title, 'lines,words');
    gsap.set([main, portrait], { opacity: 1 });
    if (words) gsap.set(words.words, { yPercent: 115 });
    else gsap.set(title, { opacity: 0, y: 24 });
    gsap.set([...lines, ...actions], { opacity: 0, y: 16, transition: 'none' });
    gsap.set(stats, { opacity: 0, y: 24, transition: 'none' });
    gsap.set(header, { opacity: 0, y: -18 });
    gsap.set(portrait, { clipPath: 'inset(100% 0% 0% 0% round 26px)' });
    gsap.set(photo, { scale: 1.18 });
    root.classList.remove('story-intro');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: .9 } });
    tl.to(header, { opacity: 1, y: 0, duration: .8, clearProps: 'transform' }, 0)
      .to(lines[0], { opacity: 1, y: 0 }, .1)
      .to(words ? words.words : title, words ? { yPercent: 0, duration: 1.1, stagger: .05 } : { opacity: 1, y: 0 }, .18)
      .add(() => { words?.revert(); drawUnderline(qs('em', title)); })
      .to(lines.slice(1), { opacity: 1, y: 0, stagger: .08, clearProps: 'transform,transition' }, '-=.75')
      .to(actions, { opacity: 1, y: 0, stagger: .06, clearProps: 'transform,transition' }, '<.12')
      .to(portrait, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' }, .2)
      .to(photo, { scale: 1, duration: 1.8, clearProps: 'transform' }, .3)
      .to(stats, { opacity: 1, y: 0, stagger: .08, clearProps: 'transform,transition' }, .95);
  }

  /* ---------- Flow Auto: a guided tour of the real app, pinned while you scroll (large screens) ---------- */
  function flowTour() {
    if (reduced) return;
    mm.add('(min-width: 1100px) and (min-height: 700px)', () => {
      const top = qs('.fa-top');
      const visual = qs('.visual-flow-auto');
      const buttons = qsa('[data-flow-view]');
      const step = qs('.flow-tour-step');
      const bar = qs('.flow-tour-bar i');
      if (!top || !visual || !buttons.length) return;
      const pad = n => String(n).padStart(2, '0');
      let current = -1;
      const show = index => {
        if (index === current) return;
        current = index;
        buttons[index].click();
        step.textContent = `${pad(index + 1)} / ${pad(buttons.length)}`;
      };
      visual.classList.add('is-touring');
      ScrollTrigger.create({
        trigger: top,
        start: () => `top top+=${headerOffset()}`,
        end: () => `+=${Math.round(innerHeight * 1.5)}`,
        pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          bar.style.setProperty('--tour', self.progress.toFixed(3));
          show(Math.min(buttons.length - 1, Math.floor(self.progress * buttons.length)));
        }
      });
      return () => visual.classList.remove('is-touring');
    });
  }

  /* ---------- Chapter openings: label, then the title line by line, then the lead ---------- */
  const chapterHeads = qsa('.section-heading, .about-sticky, .contact-copy');
  function chapters() {
    chapterHeads.forEach(block => {
      const label = qs('.section-index', block);
      const title = qs('h2', block);
      const lead = qsa(':scope > p, :scope > .contact-actions', block);
      const em = qs('em', title);
      const underlined = em && qs('.alive-underline', em);
      if (underlined && !reduced) em.classList.add('is-undrawn');
      const lines = split(title, 'lines');
      gsap.set(block, { opacity: 1 });
      if (reduced) gsap.set([label, title, ...lead], { opacity: 0 });
      else {
        gsap.set(label, { opacity: 0, x: -14 });
        if (lines) gsap.set(lines.lines, { yPercent: 105 });
        else gsap.set(title, { opacity: 0, y: 24 });
        gsap.set(lead, { opacity: 0, y: 16 });
      }
      once(block, 'top 84%', () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        if (reduced) { tl.to([label, title, ...lead], { opacity: 1, duration: .6, stagger: .08 }); return; }
        tl.to(label, { opacity: 1, x: 0, duration: .7, clearProps: 'transform' })
          .to(lines ? lines.lines : title, lines ? { yPercent: 0, duration: 1.05, stagger: .1 } : { opacity: 1, y: 0, duration: .9 }, '<.05')
          .add(() => { lines?.revert(); if (underlined) drawUnderline(qs('em', title)); })
          .to(lead, { opacity: 1, y: 0, duration: .8, stagger: .1, clearProps: 'transform' }, '-=.6');
      });
    });
  }

  /* ---------- Everything else rises into place in reading order ---------- */
  function reveals() {
    const hero = qs('#home');
    const cards = qsa('.reveal').filter(el => !hero.contains(el) && !chapterHeads.includes(el));
    const from = el => {
      if (reduced || el.matches('.core-lab')) return {};  // Pip stands on .core-lab, so it only fades
      if (el.dataset.reveal === 'left') return { x: -36 };
      if (el.dataset.reveal === 'right') return { x: 36 };
      if (el.dataset.reveal === 'zoom') return { y: 20, scale: .95 };
      return { y: 32 };
    };
    cards.forEach(el => gsap.set(el, { opacity: 0, transition: 'none', ...from(el) }));
    ScrollTrigger.batch(cards, {
      start: 'top 88%', once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, x: 0, y: 0, scale: 1, duration: reduced ? .6 : .9, ease: 'expo.out', stagger: .08,
        overwrite: true, clearProps: 'transform,transition'
      })
    });
  }

  /* ---------- Small scenes inside the chapters ---------- */
  function scenes() {
    // The production line fills step by step as it scrolls past (wide screens, where it is one row).
    mm.add('(min-width: 1081px)', () => {
      if (reduced) return;
      const list = qs('.fa-pipeline');
      const steps = qsa('li', list);
      ScrollTrigger.create({
        trigger: list, start: 'top 82%', end: 'bottom 50%', scrub: .5,
        onUpdate: self => {
          list.style.setProperty('--progress', self.progress.toFixed(3));
          steps.forEach((li, i) => li.classList.toggle('is-reached', self.progress >= i / (steps.length - 1) - .001));
        }
      });
      return () => { list.style.removeProperty('--progress'); steps.forEach(li => li.classList.remove('is-reached')); };
    });

    if (reduced) {
      qsa('.principle').forEach(card => once(card, 'top 82%', () => card.classList.add('is-lit')));
      return;
    }

    // Flow Auto facts count up to their real values.
    qsa('.fa-facts strong').forEach(el => {
      const match = el.textContent.trim().match(/^(\d+)(\D*)$/);
      if (!match) return;
      const target = Number(match[1]);
      const suffix = match[2];
      const value = { n: 0 };
      el.textContent = `0${suffix}`;
      once(el, 'top 92%', () => gsap.to(value, {
        n: target, duration: 1.4, ease: 'power3.out',
        onUpdate: () => { el.textContent = `${Math.round(value.n)}${suffix}`; }
      }));
    });

    // The example session plays out: the request, each tool call and its result, then the reply streams in.
    const chat = qs('.fa-chat-body');
    if (chat) {
      const ask = qs('.fa-msg-user', chat);
      const calls = qsa('.fa-call', chat);
      const results = calls.map(call => qs('span', call));
      const reply = qs('.fa-msg-ai', chat);
      const words = SplitText ? SplitText.create(reply, { type: 'words' }) : null;
      gsap.set([ask, ...calls, reply], { opacity: 0, y: 10 });
      gsap.set(results, { opacity: 0 });
      if (words) gsap.set(words.words, { opacity: 0 });
      once(chat, 'top 85%', () => {
        const tl = gsap.timeline({ defaults: { duration: .45, ease: 'power3.out' } });
        tl.to(ask, { opacity: 1, y: 0, clearProps: 'transform' }, .15);
        calls.forEach((call, i) => {
          tl.to(call, { opacity: 1, y: 0, clearProps: 'transform' }, '+=.35')
            .to(results[i], { opacity: 1, duration: .3 }, '+=.4');
        });
        tl.to(reply, { opacity: 1, y: 0, clearProps: 'transform' }, '+=.3');
        if (words) tl.to(words.words, { opacity: 1, duration: .01, stagger: .045 }, '<.1').add(() => words.revert());
      });
    }

    // The MCP chain lights node by node, like a request travelling from the assistant to Google Flow.
    const flow = qs('.fa-flow');
    if (flow) {
      const nodes = qsa('li', flow);
      gsap.set(nodes.slice(1), { '--link': 0 });
      once(flow, 'top 82%', () => {
        const tl = gsap.timeline();
        nodes.forEach((li, i) => {
          if (i) tl.to(li, { '--link': 1, duration: .4, ease: 'power2.inOut' });
          tl.add(() => li.classList.add('is-lit'))
            .to(li, { keyframes: [{ scale: 1.035, duration: .14, ease: 'power2.out' }, { scale: 1, duration: .4, ease: 'power2.out' }], clearProps: 'transform' }, '<');
        });
        // Once the request has arrived, the nodes settle back; the lit connectors stay as the trail.
        tl.add(() => nodes.forEach(li => li.classList.remove('is-lit')), '+=.9');
      });
    }

    // The intro video's screen opens up as it arrives.
    const screen = qs('.video-card--feature .video-frame');
    if (screen) {
      gsap.set(screen, { clipPath: 'inset(10% 8% 10% 8% round 18px)' });
      once(screen, 'top 88%', () => gsap.to(screen, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath' }));
    }

    // Project windows settle straight as their cards scroll into place; HealthNest's chart grows in.
    mm.add('(min-width: 641px)', () => {
      qsa('.project-card').forEach(card => {
        const win = qs('.shot-window, .mock-window', card);
        if (win) gsap.fromTo(win, { '--settle': '-6deg' }, { '--settle': '0deg', ease: 'none', scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 35%', scrub: .6 } });
      });
    });
    const bars = qsa('.mock-chart span');
    if (bars.length) {
      gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
      once(qs('.mock-chart'), 'top 88%', () => gsap.to(bars, { scaleY: 1, duration: .9, ease: 'expo.out', stagger: .07 }));
    }

    // Pip says hello when you reach his chapter (he still stays home until dragged out).
    once(qs('.core-lab'), 'top 65%', () => setTimeout(() => dispatchEvent(new CustomEvent('pip-greet')), 500));

    // The toolbox prompt types itself out.
    const prompt = qs('.console-body > p');
    if (prompt && SplitText) {
      const chars = SplitText.create(prompt, { type: 'chars' });
      gsap.set(chars.chars, { opacity: 0 });
      once(prompt, 'top 88%', () => gsap.to(chars.chars, { opacity: 1, duration: .01, stagger: .035, onComplete: () => chars.revert() }));
    }

    // How I work: each principle checks in as you read it.
    qsa('.principle').forEach(card => once(card, 'top 78%', () => card.classList.add('is-lit')));
  }

  const refresh = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  // Split titles once the real fonts are in, so lines break where they will finally sit.
  // The hero waits at most 1.5s for them; chapter titles below the fold wait as long as it takes.
  const fontsReady = document.fonts?.ready || Promise.resolve();
  Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 1500))]).then(() => {
    heroIntro();
    flowTour();
    reveals();
    scenes();
    refresh();
  });
  fontsReady.then(() => { chapters(); refresh(); });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
