/* =========================================================
   Carl Tampus — Portfolio
   Shared page behavior: smooth scrolling, the nav pill, email, the contact
   form and videos. Scroll animations live in motion.js.
   ========================================================= */
const EMAIL = 'carltampus5@gmail.com';
const root = document.documentElement;
const motion = root.dataset.motion === 'reduced' ? 'reduced' : 'full';
const hasGsap = Boolean(window.gsap && window.ScrollTrigger);
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/* ---------- Motion switch: full motion by default; the visitor can turn it down (saved per browser) ---------- */
const motionToggle = qs('#motionToggle');
if (motionToggle) {
  const on = motion === 'full';
  motionToggle.setAttribute('aria-pressed', String(on));
  motionToggle.title = on ? 'Animations on. Click to reduce motion.' : 'Motion reduced. Click for full animations.';
  motionToggle.addEventListener('click', () => {
    try { localStorage.setItem('portfolio-motion-choice', on ? 'reduced' : 'full'); } catch {}
    location.reload();
  });
}

/* ---------- Theme switch: dark (Midnight & Cobalt) by default, light (Paper & Ink) when the visitor picks it ---------- */
const themeToggle = qs('#themeToggle');
const themeMeta = qs('meta[name="theme-color"]');
function syncTheme() {
  const light = root.dataset.theme === 'light';
  themeToggle?.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  if (themeToggle) themeToggle.title = light ? 'Dark theme' : 'Light theme';
  themeMeta?.setAttribute('content', light ? '#f5f4f0' : '#0a0f1a');
}
function setTheme(theme) {
  root.classList.add('theme-fade');
  root.dataset.theme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch {}
  syncTheme();
  clearTimeout(setTheme.timer);
  setTheme.timer = setTimeout(() => root.classList.remove('theme-fade'), 400);
}
themeToggle?.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));
syncTheme();

qsa('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
// The skip link lands on <main> and keeps keyboard focus there.
qs('#main')?.setAttribute('tabindex', '-1');

/* ---------- Email ---------- */
function showToast(message = 'Email copied to clipboard') {
  const toast = qs('#toast');
  if (!toast) return;
  qs('p', toast).textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
  } catch {
    const temp = document.createElement('textarea');
    temp.value = EMAIL;
    temp.setAttribute('readonly', '');
    temp.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
  }
  showToast();
}
qs('#copyEmail')?.addEventListener('click', copyEmail);

/* ---------- Smooth scrolling ----------
   Matches perryw-2023, which runs Locomotive Scroll: each screen frame closes 10% of the gap to where
   the wheel is heading, and on Windows a wheel notch travels 120px. Measured side by side on Carl's
   144 Hz laptop with the same wheel input, both settle half a notch in about 0.09s and finish by about
   0.35s. Phones keep their own native momentum. */
const isWindows = /Windows/i.test(navigator.userAgentData?.platform || navigator.userAgent);
const PER_FRAME = .1;
let lenis = null;
if (motion === 'full' && window.Lenis) {
  lenis = new Lenis({ lerp: PER_FRAME, wheelMultiplier: isWindows ? 1.2 : 1, smoothWheel: true });
  // Lenis eases per second, so turn 10% per frame into a rate for this screen's real frame time.
  let frameMs = 1000 / 60;
  const tune = deltaMs => {
    if (deltaMs > 3 && deltaMs < 50) frameMs += (deltaMs - frameMs) * .05;
    lenis.options.lerp = Math.min(.5, -Math.log(1 - PER_FRAME) / (60 * frameMs / 1000));
  };
  if (hasGsap) {
    // One clock for smooth scrolling and the scroll animations, so pinned and scrubbed scenes stay in sync.
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time, deltaMs) => { tune(deltaMs); lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    let last = 0;
    const raf = time => { if (last) tune(time - last); last = time; lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

// cubic-bezier(.25, 0, .35, 1): Locomotive Scroll's easing for jumps to a section.
function bezier(x1, y1, x2, y2) {
  const coef = (p1, p2) => [1 - 3 * p2 + 3 * p1, 3 * p2 - 6 * p1, 3 * p1];
  const [ax, bx, cx] = coef(x1, x2);
  const [ay, by, cy] = coef(y1, y2);
  const x = t => ((ax * t + bx) * t + cx) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return progress => {
    if (progress <= 0 || progress >= 1) return Math.min(1, Math.max(0, progress));
    let t = progress;
    for (let i = 0; i < 8; i++) {
      const slope = dx(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= (x(t) - progress) / slope;
    }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const glide = bezier(.25, 0, .35, 1);

// The keyboard glides the same way (arrows 240px, Page Up/Down and Space a screen, Home and End),
// as Locomotive Scroll does. Keys that belong to a control keep their usual job.
if (lenis) {
  const typing = el => el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], video, audio, [data-lenis-prevent]');
  const pressable = el => el.closest('a[href], button, summary, [role="button"], label');
  addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || typing(event.target)) return;
    let delta = null;
    switch (event.key) {
      case 'ArrowDown': delta = 240; break;
      case 'ArrowUp': delta = -240; break;
      case 'PageDown': delta = innerHeight; break;
      case 'PageUp': delta = -innerHeight; break;
      case ' ': if (!pressable(event.target)) delta = event.shiftKey ? -innerHeight : innerHeight; break;
      case 'Home': delta = -Infinity; break;
      case 'End': delta = Infinity; break;
    }
    if (delta === null || (event.shiftKey && event.key !== ' ')) return;
    event.preventDefault();
    lenis.scrollTo(Math.max(0, Math.min(lenis.limit, (lenis.targetScroll ?? scrollY) + delta)));
  });
}

const navOffset = () => (qs('#nav')?.offsetHeight || 64) + 8;
function scrollToTarget(target) {
  if (!target) return;
  // The pinned studio starts at its very top, with the wide shot of the room.
  const offset = target.matches('[data-studio]') && root.classList.contains('has-studio-pin') ? 0 : -navOffset();
  if (lenis) lenis.scrollTo(target, { offset, duration: 1, easing: glide });
  else target.scrollIntoView();
}
function glideTo(y, duration = 1.2) {
  if (lenis) lenis.scrollTo(y, { duration, easing: glide });
  else scrollTo({ top: y, behavior: 'smooth' });
}

// Same-page links glide with Lenis; links to the other pages are left to the browser (and motion.js).
const samePage = url => url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || !lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.classList.contains('skip-link') || link.target === '_blank') return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !samePage(url) || !url.hash) return;
  const target = url.hash === '#top' ? qs('#top') : document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  event.preventDefault();
  goTo(url.hash, target, url.hash === '#top' ? 'Home' : link.dataset.label || link.textContent.trim());
});

// Home and Work fly the studio's camera (the page glides through it). A jump further than a couple of
// screens passes behind the curtain (motion.js) instead of racing through everything in between.
function goTo(hash, target, label) {
  let y;
  if (hash === '#top') y = 0;
  else if (hash === '#work' && window.site?.studioY) y = window.site.studioY(0);
  else y = target.getBoundingClientRect().top + scrollY - navOffset();
  y = Math.max(0, Math.min(lenis.limit, y));
  const screens = Math.abs(y - scrollY) / innerHeight;
  // Within the studio the camera always flies, rewinding through the turntable if it has to.
  const range = window.site?.studioRange?.();
  const inStudio = at => range && at >= range[0] && at <= range[1];
  if (screens > 2.2 && !(inStudio(scrollY) && inStudio(y)) && window.site?.curtain) {
    window.site.curtain(label, () => lenis.scrollTo(y, { immediate: true, force: true }));
  } else {
    glideTo(y, Math.min(2.4, 1.1 + screens * .25));
  }
}

/* ---------- Navigation: a lit tab follows the current section ---------- */
const nav = qs('#nav');
const pill = qs('.nav-pill');
const glow = qs('.nav-glow');
const pillLinks = pill ? qsa('a', pill) : [];
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let hovered = null;

const onScroll = () => nav?.classList.toggle('is-scrolled', scrollY > 24);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const activeLink = () => pillLinks.find(link => link.classList.contains('is-active'));
function placeGlow(link, animate = true) {
  if (!glow) return;
  if (!link) { glow.classList.remove('is-on'); return; }
  if (!animate) glow.style.transition = 'none';
  glow.style.width = `${link.offsetWidth}px`;
  glow.style.transform = `translateX(${link.offsetLeft}px)`;
  glow.classList.add('is-on');
  if (!animate) requestAnimationFrame(() => { glow.style.transition = ''; });
}
pillLinks.forEach(link => link.addEventListener('pointerenter', () => {
  if (!finePointer.matches) return;
  hovered = link;
  placeGlow(link);
}));
pill?.addEventListener('pointerleave', () => { hovered = null; placeGlow(activeLink()); });
addEventListener('resize', () => placeGlow(hovered || activeLink(), false), { passive: true });
document.fonts?.ready.then(() => placeGlow(hovered || activeLink(), false));
placeGlow(activeLink(), false);

// Home page: the section passing 40% down the screen lights its link. Inside the studio, motion.js says
// whether the camera is out on the wide shot (Home) or in with the projects (Work).
const spyLinks = qsa('a[data-nav]');
const spySections = spyLinks.map(link => document.getElementById(link.dataset.nav)).filter(Boolean);
const studioSection = qs('[data-studio]');
if (spySections.length) {
  let current;
  const spy = () => {
    const line = innerHeight * .4;
    let id = null;
    spySections.forEach(section => { if (section.getBoundingClientRect().top <= line) id = section.id; });
    const phase = studioSection?.dataset.phase;
    if (phase && (id === 'top' || id === 'work')) id = phase === 'home' ? 'top' : 'work';
    if (id === current) return;
    current = id;
    spyLinks.forEach(link => {
      const on = link.dataset.nav === id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (!hovered) placeGlow(activeLink());
  };
  addEventListener('scroll', spy, { passive: true });
  addEventListener('resize', spy, { passive: true });
  studioSection?.addEventListener('studio:phase', spy);
  spy();
}

/* ---------- Rows you scroll sideways yourself get a keyboard stop ---------- */
function scrollRegion(el, label, when) {
  if (!el) return;
  const apply = () => {
    if (when()) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', label);
    } else {
      ['tabindex', 'role', 'aria-label'].forEach(name => el.removeAttribute(name));
    }
  };
  apply();
  addEventListener('resize', apply, { passive: true });
}
const narrow = matchMedia('(max-width: 900px)');
scrollRegion(qs('.marquee'), 'Screens and tools, scrolls sideways', () => motion === 'reduced' || !hasGsap);
scrollRegion(qs('.gallery-viewport'), 'App screens, scrolls sideways', () => narrow.matches);
const galleryHint = qs('.gallery-hint');
if (galleryHint) {
  const label = () => { galleryHint.textContent = narrow.matches ? 'Swipe to see more' : 'Scroll to move through the screens'; };
  narrow.addEventListener?.('change', label);
  label();
}

/* ---------- Contact form ---------- */
const contactForm = qs('#contactForm');
const fieldMessages = {
  name: 'Please add your name.',
  email: 'Please enter a valid email address.',
  message: 'Please tell me a little about the project.'
};

function validateField(input) {
  const field = input.closest('.field');
  let error = qs('.field-error', field);
  const valid = input.checkValidity() && input.value.trim() !== '';
  input.setAttribute('aria-invalid', String(!valid));
  field.classList.toggle('is-invalid', !valid);
  if (!valid) {
    if (!error) {
      error = document.createElement('p');
      error.className = 'field-error';
      error.id = `${input.id}Error`;
      field.appendChild(error);
      input.setAttribute('aria-describedby', error.id);
    }
    error.textContent = fieldMessages[input.name];
  } else if (error) {
    error.textContent = '';
  }
  return valid;
}

if (contactForm) {
  qsa('input, textarea', contactForm).forEach(input => {
    input.addEventListener('blur', () => { if (input.value) validateField(input); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateField(input); });
  });

  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    const invalid = qsa('input, textarea', contactForm).filter(input => !validateField(input));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    const button = qs('.form-submit', contactForm);
    const label = qs('span', button);
    const status = qs('#formStatus');
    button.disabled = true;
    label.textContent = 'Sending...';
    status.textContent = '';
    status.classList.remove('is-error', 'is-success');
    try {
      const response = await fetch('https://formspree.io/f/meedylgw', {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Request failed');
      contactForm.reset();
      status.textContent = 'Message sent. I’ll get back to you soon.';
      status.classList.add('is-success');
    } catch {
      status.textContent = 'Could not send right now. Email me directly instead.';
      status.classList.add('is-error');
    } finally {
      button.disabled = false;
      label.textContent = 'Send message';
    }
  });
}

/* ---------- Videos: a card plays the file named in data-video ---------- */
async function videoExists(src) {
  if (location.protocol === 'file:') return true;
  try {
    const response = await fetch(src, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type') || '').startsWith('video');
  } catch {
    return false;
  }
}

const videoCards = qsa('[data-video]').filter(el => !el.matches('dialog'));
videoCards.forEach(card => {
  const frame = qs('.video-frame', card);
  const button = qs('.video-play', card);
  const src = card.dataset.video;
  const ready = videoExists(src);

  ready.then(available => {
    card.classList.toggle('is-ready', available);
    if (available && card.dataset.poster) {
      const poster = new Image();
      poster.onload = () => frame.style.setProperty('--poster', `url("${card.dataset.poster}")`);
      poster.src = card.dataset.poster;
    }
  });

  button?.addEventListener('click', async () => {
    if (!(await ready)) {
      showToast('This video is coming soon.');
      return;
    }
    let player = qs('video', frame);
    if (!player) {
      player = document.createElement('video');
      player.src = src;
      player.controls = true;
      player.playsInline = true;
      player.preload = 'auto';
      player.setAttribute('aria-label', button.getAttribute('aria-label').replace('Play video: ', ''));
      frame.appendChild(player);
    }
    card.classList.add('is-playing');
    player.play()?.catch(() => {});
    player.focus({ preventScroll: true });
  });
});

// "Watch the demo" starts the video inside the same click (so sound is allowed) while the page glides to it.
qsa('[data-play-video]').forEach(link => link.addEventListener('click', () => {
  const card = videoCards.find(item => item.dataset.video === link.dataset.playVideo);
  if (card && !card.classList.contains('is-playing')) qs('.video-play', card)?.click();
}));

/* ---------- The studio: pick a project from the list, or from the turntable itself ---------- */
const studio = qs('[data-studio]');
let showProject = () => {};
let showStep = () => {};
let laptops = null;
if (studio) {
  const tabs = qsa('[role="tab"]', studio);
  const details = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const items = qsa('.orbit-item', studio);
  // Each project's steps: the line in the list, and the picture its screen shows. A project without steps has one screen.
  const steps = details.map((detail, i) => {
    const list = qsa('.step', detail).map(el => ({ el, src: el.dataset.shot, clip: el.hasAttribute('data-clip') }));
    return list.length ? list : [{ src: items[i]?.dataset.shot || qs('img', items[i])?.getAttribute('src'), clip: !!items[i]?.dataset.preview }];
  });
  const stepAt = items.map(() => 0);
  items.forEach((item, i) => item.classList.toggle('is-clip', !!steps[i][0].clip));

  // The 3D laptops (laptops.js) stand where the windows are and show the same pictures. The page hides the
  // windows before its first paint (html.laptops); if the laptops never come, fail() brings the windows back.
  if (root.classList.contains('laptops')) {
    let settle, settled = false;
    laptops = {
      lids: items.map(() => ({ open: 0 })), // how far each lid is open (motion.js opens them)
      fold: 0,                               // closes them all again on the way out
      slides: steps.map(list => list.map(({ src, clip }) => ({ src, clip }))),
      at: stepAt,
      whenReady: new Promise(resolve => { settle = resolve; }),
      ready() { settled = true; settle(true); },
      fail() {
        if (settled) return;
        settled = laptops.failed = true;
        root.classList.remove('laptops');
        settle(false);
      },
      show() {},
      invalidate() {}
    };
    setTimeout(() => laptops.fail(), 9000);
  }

  let active = -1;
  showProject = index => {
    if (index === active || !tabs[index]) return;
    active = index;
    studio.style.setProperty('--active', index);
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      details[i]?.classList.toggle('is-on', on);
      items[i]?.classList.toggle('is-front', on);
    });
    preview();
  };

  // The window facing you (or under the mouse) plays a short muted preview while the studio is on screen.
  // Not with reduced motion or when the browser asks to save data.
  const quiet = motion === 'reduced' || navigator.connection?.saveData;
  let onScreen = false;
  let hoverIndex = -1;
  let filmOpen = false;
  function preview() {
    items.forEach((item, i) => {
      // Only a screen that is showing a clip plays: the other steps are still pictures.
      const on = !quiet && onScreen && studio.dataset.phase !== 'out' && (i === active || i === hoverIndex) && !!steps[i][stepAt[i]].clip;
      if (item.classList.contains('is-playing') === on) return;
      item.classList.toggle('is-playing', on);
      const src = item.dataset.preview;
      let video = src && qs('video', item);
      if (on && src && !video) {
        video = document.createElement('video');
        video.className = 'orbit-preview';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.preload = 'auto';
        // The clip opens on a short fade from black. Its first showing starts just past that, on the frame its still picture shows.
        video.currentTime = .8;
        // MP4 for Safari and most browsers, WebM (same clip, next to it) for the rest.
        [[src, 'video/mp4'], [src.replace(/\.mp4$/, '.webm'), 'video/webm']].forEach(([url, type]) => {
          const source = document.createElement('source');
          source.src = url;
          source.type = type;
          video.appendChild(source);
        });
        qs('.orbit-body', item)?.appendChild(video);
      }
      if (!video) return;
      if (on && !filmOpen) video.play()?.catch(() => {});
      else video.pause();
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; preview(); }).observe(qs('.studio-stage', studio));
  }
  studio.addEventListener('studio:phase', preview);
  // The loops hold still while a film plays in front of them.
  document.addEventListener('film:toggle', event => {
    filmOpen = event.detail.open;
    items.forEach(item => {
      const video = qs('.orbit-preview', item);
      if (!video) return;
      if (filmOpen) video.pause();
      else if (item.classList.contains('is-playing')) video.play()?.catch(() => {});
    });
  });
  items.forEach((item, i) => {
    item.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hoverIndex = i; preview(); } });
    item.addEventListener('pointerleave', () => { hoverIndex = -1; preview(); });
  });
  // Show step k of project i: its line in the list, and its picture on the screen.
  // dir is the way the visitor is heading (1 forward, -1 back), so the next picture comes in from that side.
  showStep = (i, k, dir = 1) => {
    const list = steps[i];
    if (!list) return;
    k = Math.max(0, Math.min(list.length - 1, k));
    if (k === stepAt[i]) return;
    stepAt[i] = k;
    list.forEach((step, n) => {
      step.el?.classList.toggle('is-on', n === k);
      if (n === k) step.el?.setAttribute('aria-current', 'step'); else step.el?.removeAttribute('aria-current');
    });
    details[i]?.style.setProperty('--step', k);
    items[i].classList.toggle('is-clip', !!list[k].clip);
    // The window shows the same picture (it is what you see without the laptops, and what a film starts from).
    const picture = qs('.orbit-body img', items[i]);
    if (picture && list[k].src) picture.src = list[k].src;
    laptops?.show(i, k, dir);
    preview();
  };
  steps.forEach((list, i) => list.forEach((step, k) => {
    step.el?.querySelector('button')?.addEventListener('click', () => {
      const go = studio.dispatchEvent(new CustomEvent('studio:pick', { detail: { index: i, step: k }, cancelable: true }));
      if (go) { showProject(i); showStep(i, k, k > stepAt[i] ? 1 : -1); }
    });
    if (k === 0) step.el?.setAttribute('aria-current', 'step');
  }));
  // motion.js gets the first say: while scrolling drives the camera, it glides there and the scroll calls showProject.
  const pick = index => {
    index = Math.max(0, Math.min(tabs.length - 1, index));
    const go = studio.dispatchEvent(new CustomEvent('studio:pick', { detail: { index }, cancelable: true }));
    if (go) showProject(index);
  };
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => pick(i));
    tab.addEventListener('keydown', event => {
      let next = null;
      if (event.key in step) next = (i + step[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus({ preventScroll: true });
      pick(next);
    });
  });
  // A window at the side turns to face you; the one facing you opens.
  items.forEach((item, i) => item.addEventListener('click', () => {
    if (i !== active) return pick(i);
    qs('[data-studio-open], [data-theater-open]', details[i])?.click();
  }));
  // Phones: swipe the stage sideways to turn the turntable.
  const stage = qs('.studio-stage', studio);
  let swipe = null;
  stage?.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') swipe = { x: event.clientX, y: event.clientY }; }, { passive: true });
  stage?.addEventListener('pointerup', event => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) pick(active + (dx < 0 ? 1 : -1));
  }, { passive: true });
  stage?.addEventListener('pointercancel', () => { swipe = null; });
  showProject(0);
}

/* ---------- The intro video plays in a theater: its window grows between two giant words ---------- */
const theater = qs('#theater');
if (theater) {
  const frame = qs('.video-frame', theater);
  let player = null;
  let opener = null;
  const open = () => {
    opener = document.activeElement;
    if (!player) {
      player = document.createElement('video');
      player.src = theater.dataset.video;
      player.poster = 'videos/intro.jpg';
      player.controls = true;
      player.playsInline = true;
      player.preload = 'auto';
      player.setAttribute('aria-label', 'Meet Carl');
      frame.appendChild(player);
    }
    // Where the window sits on the turntable right now, so the theater can grow out of it.
    const from = qs('.orbit-item[data-orbit="2"] .orbit-body')?.getBoundingClientRect();
    theater.showModal();
    lenis?.stop();
    theater.dispatchEvent(new CustomEvent('theater:open', { detail: { from } }));
    // Started inside the click, so the browser lets it play with sound.
    player.play()?.catch(() => {});
  };
  theater.addEventListener('close', () => {
    player?.pause();
    lenis?.start();
    opener?.focus?.({ preventScroll: true });
  });
  qs('.theater-close', theater)?.addEventListener('click', () => theater.close());
  // A click on the dimmed backdrop (the dialog itself, outside its content) closes it too.
  theater.addEventListener('click', event => { if (event.target === theater) theater.close(); });
  qsa('[data-theater-open]').forEach(button => button.addEventListener('click', open));
}

/* ---------- Films: rest the mouse on a video for a second and it comes forward ----------
   The page dims, the video grows out of where it stands into a flat, sharp picture in the middle of the
   screen, and its sound comes on. The studio's muted loops are cut from the full films (data-film-from says
   where), so the film takes over from the moment the loop has reached. Moving away, scrolling, Esc or a
   click on the dimmed page sends it back. Browsers refuse sound until the visitor has clicked or pressed a
   key on the site at least once: until then the film plays silently and says so, and the first click turns
   it on. Mouse only, and not with reduced motion or when the browser asks to save data. */
const FILM_DELAY = 1000;
const filmHosts = [];
if (motion === 'full' && hasGsap && !navigator.connection?.saveData) {
  qsa('.orbit-item[data-film]').forEach(item => filmHosts.push({
    el: item,
    surface: qs('.orbit-body', item),
    src: item.dataset.film,
    from: Number(item.dataset.filmFrom) || 0,
    resume: 0,
    loop: () => qs('.orbit-preview', item),
    picture: () => qs('img', item),
    // Out of the room, or on a step whose screen is a still picture, there is no film to bring forward.
    away: () => studio?.dataset.phase === 'out' || !item.classList.contains('is-clip')
  }));
  videoCards.forEach(card => {
    const frame = qs('.video-frame', card);
    const picture = new Image();
    if (card.dataset.poster) picture.src = card.dataset.poster;
    filmHosts.push({
      el: frame,
      surface: frame,
      src: card.dataset.video,
      from: 0,
      resume: 0,
      loop: () => null,
      picture: () => picture,
      away: () => !card.classList.contains('is-ready') || card.classList.contains('is-playing')
    });
  });
}

if (filmHosts.length) {
  const overlay = document.createElement('div');
  overlay.className = 'film-focus';
  overlay.setAttribute('aria-hidden', 'true'); // an extra for the mouse: the same videos have their own players
  overlay.innerHTML = `
    <div class="film-veil"></div>
    <div class="film-screen">
      <canvas class="film-still" width="1280" height="720"></canvas>
      <span class="film-state"><svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg></span>
      <span class="film-wait"></span>
      <button class="film-sound" type="button" tabindex="-1" data-state="on">
        <svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4Z"/><path class="film-waves" d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/><path class="film-off" d="m16 9.8 4.4 4.4M20.4 9.8 16 14.2"/></svg>
        <span>Click for sound</span>
      </button>
      <div class="film-track"><i></i></div>
    </div>`;
  document.body.appendChild(overlay);
  const filmBox = qs('.film-screen', overlay);
  const still = qs('.film-still', overlay);
  const soundButton = qs('.film-sound', overlay);
  const progress = qs('.film-track i', overlay);

  const films = new Map();
  let armed = null;   // the video the mouse is waiting on
  let active = null;  // the video that is out in front
  let leaving = null; // the film on its way back
  let calm = null;    // sent back by hand: waits until the mouse has left it before it can come forward again
  let armTimer = 0, cueTimer = 0, leaveTimer = 0, idleTimer = 0;
  let pointer = { x: 0, y: 0 };
  let lastScroll = -1000;
  let openedAt = 0;
  let zones = [];     // where the mouse may be while a film is open: on the picture, or still on the video it came from
  let swallowClick = false;
  let wantSound = true;
  try { wantSound = localStorage.getItem('portfolio-film-sound') !== 'off'; } catch {}

  function filmFor(host) {
    let film = films.get(host.src);
    if (film) return film;
    film = document.createElement('video');
    film.className = 'film-video';
    film.src = host.src;
    film.playsInline = true;
    film.preload = 'auto';
    film.addEventListener('waiting', () => filmBox.classList.add('is-waiting'));
    film.addEventListener('playing', () => filmBox.classList.remove('is-waiting'));
    film.addEventListener('timeupdate', () => { if (film.duration) progress.style.transform = `scaleX(${film.currentTime / film.duration})`; });
    film.addEventListener('ended', () => { if (active) close({ settle: true }); });
    still.after(film);
    films.set(host.src, film);
    return film;
  }

  // Where the film should be to match the loop on the window, some seconds from now.
  function filmTime(host, ahead = 0) {
    if (host.resume) return host.resume;
    const loop = host.loop();
    return loop?.duration ? host.from + (loop.currentTime + ahead) % loop.duration : host.from;
  }

  /* ----- Waiting on the mouse ----- */
  function disarm() {
    clearTimeout(armTimer);
    clearTimeout(cueTimer);
    armed?.el.classList.remove('is-arming');
    armed = null;
  }
  function arm(host) {
    if (armed === host || active || calm === host || host.away() || performance.now() - lastScroll < 200 || qs('dialog[open]')) return;
    disarm();
    armed = host;
    host.el.classList.add('is-arming');
    // The film starts loading a little way in, so a mouse just passing over doesn't fetch it, and waits at the right moment.
    cueTimer = setTimeout(() => { filmFor(host).currentTime = filmTime(host, (FILM_DELAY - 250) / 1000); }, 250);
    armTimer = setTimeout(() => open(host), FILM_DELAY);
  }
  filmHosts.forEach(host => {
    // Only a mouse that really moves counts: a page scrolled under a resting mouse doesn't start anything.
    host.el.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (event.movementX || event.movementY) arm(host);
    });
    host.el.addEventListener('pointerleave', () => {
      if (armed === host) disarm();
      if (calm === host) calm = null;
    });
    // A click has its own job (open the case study, turn the turntable, play in place).
    host.el.addEventListener('pointerdown', () => { disarm(); calm = host; });
  });

  /* ----- The picture's way out of the page ----- */
  // Four invisible points at the corners of the video, because its corners on screen depend on every 3D turn above it.
  function cornersOf(surface) {
    let probes = qsa(':scope > .film-probe', surface);
    if (!probes.length) {
      probes = [['0', '0'], ['100%', '0'], ['100%', '100%'], ['0', '100%']].map(([left, top]) => {
        const probe = document.createElement('i');
        probe.className = 'film-probe';
        probe.style.left = left;
        probe.style.top = top;
        surface.appendChild(probe);
        return probe;
      });
    }
    return probes.map(probe => {
      const box = probe.getBoundingClientRect();
      return [box.left, box.top];
    });
  }

  // The perspective map that lays the rectangle (x, y, w, h) of the picture exactly over those four corners.
  function mapOnto([x, y, w, h], [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    const det = dx1 * dy2 - dx2 * dy1;
    const g = (sx * dy2 - dx2 * sy) / det, h2 = (dx1 * sy - sx * dy1) / det;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h2 * x3;
    const d = y1 - y0 + g * y1, e = y3 - y0 + h2 * y3;
    const end = 1 - g * x / w - h2 * y / h;
    return [a / w, b / h, x0 - a * x / w - b * y / h, d / w, e / h, y0 - d * x / w - e * y / h, g / w, h2 / h].map(value => value / end);
  }

  let box = { left: 0, top: 0, width: 0, height: 0 };
  let from = [1, 0, 0, 0, 1, 0, 0, 0];
  const morph = { p: 1 };
  function paint() {
    const p = morph.p, q = 1 - p;
    const [a, b, c, d, e, f, g, h] = from;
    filmBox.style.transform = `matrix3d(${a * q + p},${d * q},0,${g * q},${b * q},${e * q + p},0,${h * q},0,0,1,0,${c * q},${f * q},0,1)`;
  }
  function measure(host) {
    const corners = cornersOf(host.surface).map(([x, y]) => [x - box.left, y - box.top]);
    // The video fills its surface and is cropped to do it, so only part of the picture lines up with the corners.
    const fit = Math.max(host.surface.offsetWidth / box.width, host.surface.offsetHeight / box.height);
    const w = host.surface.offsetWidth / fit, h = host.surface.offsetHeight / fit;
    const map = mapOnto([(box.width - w) / 2, (box.height - h) / 2, w, h], corners);
    if (map.every(Number.isFinite)) from = map;
  }

  // A still of what the window shows right now, so the picture is never empty while the film gets ready.
  function paintStill(host) {
    const context = still.getContext('2d', { alpha: false });
    const loop = host.loop();
    const source = loop?.readyState >= 2 ? loop : host.picture();
    const sw = source?.videoWidth || source?.naturalWidth, sh = source?.videoHeight || source?.naturalHeight;
    context.fillStyle = '#05080f';
    context.fillRect(0, 0, still.width, still.height);
    if (!sw || !sh) return;
    const fit = Math.max(still.width / sw, still.height / sh);
    context.drawImage(source, (still.width - sw * fit) / 2, (still.height - sh * fit) / 2, sw * fit, sh * fit);
  }

  /* ----- Sound ----- */
  function showSound(state) {
    soundButton.dataset.state = state;
    soundButton.setAttribute('aria-label', state === 'on' ? 'Turn the sound off' : 'Turn the sound on');
  }
  function raiseSound(film) {
    gsap.killTweensOf(film);
    film.muted = false;
    film.volume = .01;
    gsap.to(film, { volume: 1, duration: .6, ease: 'power1.out' });
    showSound('on');
  }
  // Starts the film with sound if the browser allows it. Asked with the volume a hair above silence, because a
  // browser only refuses a film it could actually hear, and would stop it later when the volume came up.
  function speak(film) {
    gsap.killTweensOf(film);
    if (!wantSound) {
      film.muted = true;
      film.volume = 1;
      showSound('off');
      film.play()?.catch(() => {});
      return;
    }
    film.muted = false;
    film.volume = .01;
    film.play()?.then(() => { if (!film.muted && filmFor(active || {}) === film) raiseSound(film); }, error => {
      if (error.name !== 'NotAllowedError') return;
      film.muted = true;
      film.volume = 1;
      showSound('blocked');
      if (active) film.play()?.catch(() => {});
    });
  }
  // A click or key press is what the browser was waiting for.
  function unlockSound() {
    if (!active || soundButton.dataset.state !== 'blocked') return false;
    const film = filmFor(active);
    raiseSound(film);
    film.play()?.catch(() => {
      film.muted = true;
      showSound('blocked');
      film.play()?.catch(() => {});
    });
    return true;
  }
  function toggleSound() {
    const film = filmFor(active);
    wantSound = film.muted;
    try { localStorage.setItem('portfolio-film-sound', wantSound ? 'on' : 'off'); } catch {}
    if (wantSound) { raiseSound(film); return; }
    gsap.killTweensOf(film);
    film.muted = true;
    showSound('off');
  }

  function togglePlay() {
    const film = filmFor(active);
    if (film.paused) film.play()?.catch(() => {});
    else film.pause();
    filmBox.classList.toggle('is-paused', !film.paused === false);
  }
  function wake() {
    filmBox.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => filmBox.classList.add('is-idle'), 2200);
  }

  /* ----- Coming forward and going back ----- */
  function finishClosing() {
    if (!leaving) return;
    gsap.killTweensOf([morph, filmBox]);
    leaving.pause();
    leaving.classList.remove('is-shown');
    filmBox.style.opacity = 0;
    overlay.classList.remove('is-on');
    leaving = null;
  }

  function open(host) {
    disarm();
    if (!host.el.contains(document.elementFromPoint(pointer.x, pointer.y)) || qs('dialog[open]')) return;
    finishClosing();
    active = host;
    openedAt = scrollY;
    const film = filmFor(host);
    paintStill(host);

    const width = Math.round(Math.min(innerWidth * .88, (innerHeight - 64) * 16 / 9));
    const height = Math.round(width * 9 / 16);
    box = { left: Math.round((innerWidth - width) / 2), top: Math.round((innerHeight - height) / 2), width, height };
    Object.assign(filmBox.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${width}px`, height: `${height}px`, willChange: 'transform, opacity' });
    zones = [{ left: box.left, top: box.top, right: box.left + width, bottom: box.top + height }, host.el.getBoundingClientRect()];
    measure(host);
    morph.p = 0;
    paint();
    filmBox.classList.remove('is-paused', 'is-waiting');
    wake();
    progress.style.transform = 'scaleX(0)';
    overlay.classList.add('is-on', 'is-open');
    document.dispatchEvent(new CustomEvent('film:toggle', { detail: { open: true } }));

    gsap.killTweensOf([morph, filmBox]);
    gsap.to(filmBox, { opacity: 1, duration: .22, ease: 'power1.out' });
    gsap.to(morph, {
      p: 1, duration: .9, ease: 'power3.out', onUpdate: paint,
      // Standing flat and still at whole pixels: nothing resamples the picture.
      onComplete: () => { filmBox.style.transform = 'none'; filmBox.style.willChange = 'auto'; }
    });

    const at = filmTime(host);
    if (Math.abs(film.currentTime - at) > .3) film.currentTime = at;
    speak(film);
    // The film shows itself once it has a frame on screen; until then the still stands in.
    const show = () => { if (filmFor(active || {}) === film) film.classList.add('is-shown'); };
    film.requestVideoFrameCallback?.(show);
    film.addEventListener('playing', () => setTimeout(show, 150), { once: true });
  }

  function close({ settle = false, jump = false } = {}) {
    if (!active) return;
    const host = active;
    const film = filmFor(host);
    active = null;
    leaving = film;
    clearTimeout(leaveTimer);
    leaveTimer = 0;
    if (settle) calm = host;
    // Past the end of the loop, the film picks up where it was next time; within it, the loop decides.
    const loop = host.loop();
    const loopEnd = loop?.duration ? host.from + loop.duration : 0;
    host.resume = !film.ended && film.currentTime > loopEnd ? film.currentTime : 0;
    if (loopEnd && film.currentTime >= host.from && film.currentTime < loopEnd) loop.currentTime = Math.min(loop.duration - .05, film.currentTime - host.from + .5);

    overlay.classList.remove('is-open');
    document.dispatchEvent(new CustomEvent('film:toggle', { detail: { open: false } }));
    if (jump) { finishClosing(); return; }
    gsap.killTweensOf(film);
    if (!film.muted) gsap.to(film, { volume: 0, duration: .3, ease: 'power1.in' });
    gsap.killTweensOf([morph, filmBox]);
    filmBox.style.willChange = 'transform, opacity';
    measure(host);
    gsap.to(morph, { p: 0, duration: .6, ease: 'power3.inOut', onUpdate: paint, onComplete: finishClosing });
    gsap.to(filmBox, { opacity: 0, duration: .24, delay: .38, ease: 'power1.in' });
  }

  /* ----- While a film is open ----- */
  addEventListener('scroll', () => {
    lastScroll = performance.now();
    if (armed) disarm();
    if (active && Math.abs(scrollY - openedAt) > 8) close();
  }, { passive: true });

  addEventListener('pointermove', event => {
    if (!active) return;
    wake();
    const { clientX: x, clientY: y } = event;
    pointer = { x, y };
    const over = zones.some(zone => x >= zone.left - 8 && x <= zone.right + 8 && y >= zone.top - 8 && y <= zone.bottom + 8);
    if (over) {
      clearTimeout(leaveTimer);
      leaveTimer = 0;
    } else if (!leaveTimer) {
      leaveTimer = setTimeout(() => { leaveTimer = 0; close(); }, 140);
    }
  }, { passive: true });
  root.addEventListener('pointerleave', () => close());

  overlay.addEventListener('pointerdown', event => {
    swallowClick = unlockSound() && Boolean(event.target.closest('.film-screen'));
  });
  overlay.addEventListener('click', event => {
    if (swallowClick) { swallowClick = false; return; }
    if (!active) return;
    const track = event.target.closest('.film-track');
    if (event.target.closest('.film-sound')) toggleSound();
    else if (track) {
      const film = filmFor(active);
      const { left, width } = track.getBoundingClientRect();
      if (film.duration) film.currentTime = (event.clientX - left) / width * film.duration;
    } else if (event.target.closest('.film-screen')) togglePlay();
    else close({ settle: true });
  });
  // In front of the page's own keys, so Space pauses the film instead of scrolling.
  addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close({ settle: true });
      return;
    }
    unlockSound();
    if (event.key === ' ') {
      event.preventDefault();
      togglePlay();
    }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close({ jump: true }); });
  addEventListener('resize', () => close({ jump: true }));
}

/* ---------- Without GSAP: things fade and sharpen in as they arrive ---------- */
if (!hasGsap) {
  root.classList.add('motion-fallback');
  root.classList.remove('intro-pending');
  const items = qsa('[data-hero], [data-reveal], [data-blur], [data-blur-lines], [data-blur-scrub]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => observer.observe(el));
  } else {
    items.forEach(el => el.classList.add('is-in'));
  }
}

window.site = { motion, lenis, scrollToTarget, glideTo, showToast, showProject, showStep, laptops };
