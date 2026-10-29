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

/* ---------- The 3D journey ----------
   The home page becomes a journey through a 3D world (journey.js) with full motion on a device that draws
   WebGL 2 in hardware. Marked here, before motion.js lays out the scroll, so the layout never jumps. */
function canDrawWorld() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}
if (motion === 'full' && qs('[data-station]') && !navigator.connection?.saveData && canDrawWorld()) root.classList.add('journey');

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
  if (lenis) lenis.scrollTo(target, { offset: -navOffset(), duration: 1, easing: glide });
  else target.scrollIntoView();
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
  if (url.hash === '#top') lenis.scrollTo(0, { duration: 1, easing: glide });
  else scrollToTarget(target);
});

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

// Home page: the section passing 40% down the screen lights its link (none while the hero is up).
const spyLinks = qsa('a[data-nav]');
const spySections = spyLinks.map(link => document.getElementById(link.dataset.nav)).filter(Boolean);
if (spySections.length) {
  let current;
  const spy = () => {
    const line = innerHeight * .4;
    let id = null;
    spySections.forEach(section => { if (section.getBoundingClientRect().top <= line) id = section.id; });
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
  spy();
}

/* ---------- Chapter rail: shows once the journey starts and lights the chapter crossing the middle of the screen ---------- */
const chapterMap = qs('.journey-map');
if (chapterMap && root.classList.contains('journey') && 'IntersectionObserver' in window) {
  const links = qsa('a[data-chapter-link]', chapterMap);
  const targets = links.map(link => document.getElementById(link.dataset.chapterLink));
  let current = -1;
  const light = index => {
    current = index;
    links.forEach((link, i) => {
      link.classList.toggle('is-active', i === index);
      if (i === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  };
  const middle = new IntersectionObserver(entries => entries.forEach(entry => {
    const index = targets.indexOf(entry.target);
    if (entry.isIntersecting) light(index);
    else if (index === current && entry.boundingClientRect.top > 0) light(index - 1);
  }), { rootMargin: '-50% 0px -50% 0px' });
  targets.forEach(target => target && middle.observe(target));
  const reveal = () => chapterMap.classList.toggle('is-shown', scrollY > innerHeight * .7);
  addEventListener('scroll', reveal, { passive: true });
  reveal();
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

/* ---------- Showreels: a card plays the file named in data-video ----------
   The film sits on the page with no frame. Resting the mouse on it for 1.5s plays a muted preview: the rest
   of the page dims and the film grows a little. Moving off it, scrolling or Escape puts it back. A click, a
   tap or Enter on Play opens it as large as the screen allows, with sound and controls, until it is closed.
   A playing film is lifted into the top layer, so nothing on the page can sit above it. */
async function videoExists(src) {
  if (location.protocol === 'file:') return true;
  try {
    const response = await fetch(src, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type') || '').startsWith('video');
  } catch {
    return false;
  }
}

const HOVER_DELAY = 1500;
const topLayer = typeof HTMLElement.prototype.showPopover === 'function';
const FLIGHT = 'cubic-bezier(.22, 1, .36, 1)';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const onScreen = box => box.width > 0 && box.bottom > 0 && box.top < innerHeight;
// A film that is off screen appears from (and leaves to) where it is instead of flying the whole way.
const shrink = box => ({ left: box.left + box.width * .04, top: box.top + box.height * .04, width: box.width * .92, height: box.height * .92 });
const flip = (box, at) => `translate(${box.left - at.left}px, ${box.top - at.top}px) scale(${box.width / at.width})`;
let veil = null;

// The page behind an open film dims: a little for a preview, more once it is opened.
function dim(level) {
  if (!topLayer) return;
  if (!veil) {
    veil = document.createElement('div');
    veil.className = 'reel-veil';
    veil.setAttribute('popover', 'manual');
    veil.setAttribute('aria-hidden', 'true');
    veil.addEventListener('click', () => reels.forEach(reel => reel.close({ rest: true })));
    document.body.appendChild(veil);
  }
  const shown = veil.matches(':popover-open');
  const from = shown ? Number(getComputedStyle(veil).opacity) : 0;
  const to = level ? parseFloat(getComputedStyle(root).getPropertyValue(level === 'theater' ? '--veil-deep' : '--veil-soft')) || .7 : 0;
  if (!shown && !to) return;
  if (!shown) veil.showPopover();
  veil.getAnimations().forEach(animation => animation.cancel());
  const fade = veil.animate([{ opacity: from }, { opacity: to }], { duration: motion === 'reduced' ? 160 : to ? 650 : 450, easing: 'ease', fill: 'forwards' });
  fade.onfinish = () => {
    veil.style.opacity = to;
    fade.cancel();
    if (!to) veil.hidePopover();
  };
}

// While a film is open with sound, the page holds still and only the film can take focus.
function lockPage(frame, on) {
  if (lenis) on ? lenis.stop() : lenis.start();
  root.classList.toggle('reel-lock', on);
  for (let node = frame; node && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling === veil) continue;
      if (on && !sibling.inert) { sibling.inert = true; sibling.dataset.reelInert = ''; }
      if (!on && 'reelInert' in sibling.dataset) { sibling.inert = false; delete sibling.dataset.reelInert; }
    }
  }
}

const reels = qsa('[data-video]').map(card => {
  const frame = qs('.video-frame', card);
  const slot = frame.parentElement;
  const play = qs('.video-play', card);
  const bar = qs('.video-progress i', card);
  const src = card.dataset.video;
  let available = false;
  let player = null, mode = '', timer = 0, flight = null, rested = false;

  const ready = videoExists(src).then(ok => {
    available = ok;
    card.classList.toggle('is-ready', ok);
    if (ok && card.dataset.poster) {
      const poster = new Image();
      poster.onload = () => frame.style.setProperty('--poster', `url("${card.dataset.poster}")`);
      poster.src = card.dataset.poster;
    }
    return ok;
  });

  function film() {
    if (player) return player;
    player = document.createElement('video');
    player.src = src;
    player.playsInline = true;
    player.preload = 'auto';
    player.muted = true;
    player.setAttribute('aria-label', play.getAttribute('aria-label').replace('Play video: ', ''));
    player.controlsList?.add('nodownload');
    player.addEventListener('playing', () => frame.classList.add('has-film'));
    player.addEventListener('timeupdate', () => { bar.style.transform = `scaleX(${player.duration ? player.currentTime / player.duration : 0})`; });
    player.addEventListener('ended', () => {
      close({ rest: true });
      player.currentTime = 0;
      frame.classList.remove('has-film');
    });
    frame.prepend(player);
    return player;
  }

  // Where the film goes: a little larger where it is for a preview, as large as the screen allows when opened.
  function target(next) {
    const box = slot.getBoundingClientRect();
    const width0 = box.width || 640;
    const ratio = width0 / (box.height || width0 * 9 / 16);
    const vw = root.clientWidth, vh = innerHeight;
    const pad = vw <= 720 ? 12 : 32;
    const fit = Math.min(vw - pad * 2, (vh - pad * 2) * ratio);
    const width = next === 'theater' ? fit : Math.min(fit, width0 * 1.16);
    const height = width / ratio;
    if (next === 'theater' || !onScreen(box)) return { left: (vw - width) / 2, top: (vh - height) / 2, width, height };
    return {
      left: clamp(box.left + (width0 - width) / 2, pad, vw - pad - width),
      top: clamp(box.top + (box.height - height) / 2, pad, vh - pad - height),
      width, height
    };
  }
  const place = box => ['left', 'top', 'width', 'height'].forEach(key => { frame.style[key] = `${box[key]}px`; });
  const placed = () => ({ left: parseFloat(frame.style.left), top: parseFloat(frame.style.top), width: parseFloat(frame.style.width), height: parseFloat(frame.style.height) });

  // Moves the film between two boxes on screen while it stays laid out at `at` (only its transform animates).
  function fly(from, to, at, { duration, fadeIn = false, fadeOut = false }) {
    flight?.cancel();
    const animation = frame.animate([
      { transform: flip(from, at), opacity: fadeIn ? 0 : 1 },
      { transform: flip(to, at), opacity: fadeOut ? 0 : 1 }
    ], { duration: motion === 'reduced' ? 0 : duration, easing: FLIGHT, fill: 'forwards' });
    flight = animation;
    return animation;
  }

  function open(next) {
    if (!available) {
      if (next === 'theater') ready.then(ok => ok ? open(next) : showToast('This video is coming soon.'));
      return;
    }
    if (mode === next || mode === 'theater') return;
    reels.forEach(reel => { if (reel !== api) reel.close({ instant: true }); });
    disarm();
    const video = film();
    const was = mode;
    mode = next;
    card.dataset.mode = next;
    video.muted = next !== 'theater';
    video.controls = next === 'theater';
    if (video.ended) video.currentTime = 0;
    // Sound needs a click first; if the browser still says no, the film plays muted rather than not at all.
    video.play()?.catch(() => { if (!video.muted) { video.muted = true; video.play()?.catch(() => {}); } });
    if (topLayer) {
      dim(next);
      const to = target(next);
      let from, fadeIn = false;
      if (was) {
        from = frame.getBoundingClientRect();
      } else {
        const home = slot.getBoundingClientRect();
        frame.setAttribute('popover', 'manual');
        frame.showPopover();
        fadeIn = !onScreen(home);
        from = fadeIn ? shrink(to) : home;
      }
      place(to);
      const animation = fly(from, to, to, { duration: was ? 700 : 850, fadeIn });
      animation.onfinish = () => { if (flight === animation) { animation.cancel(); flight = null; } };
    }
    if (next === 'theater') {
      lockPage(frame, true);
      video.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('reel:toggle', { detail: { open: true } }));
  }

  // rest: the visitor closed it on purpose, so a mouse still on it has to leave before resting counts again.
  function close({ instant = false, rest = false } = {}) {
    disarm();
    if (!mode) return;
    const was = mode;
    mode = '';
    rested = rest && frame.matches(':hover');
    card.removeAttribute('data-mode');
    player.pause();
    player.controls = false;
    if (was === 'theater') lockPage(frame, false);
    if (topLayer && frame.matches(':popover-open')) {
      if (!reels.some(reel => reel.mode)) dim('');
      const from = frame.getBoundingClientRect(), home = slot.getBoundingClientRect();
      const back = onScreen(home);
      const animation = fly(from, back ? home : shrink(from), placed(), { duration: instant ? 0 : 600, fadeOut: !back });
      animation.onfinish = () => {
        if (flight !== animation) return;
        animation.cancel();
        flight = null;
        frame.hidePopover();
        frame.removeAttribute('popover');
        ['left', 'top', 'width', 'height'].forEach(key => frame.style.removeProperty(key));
      };
    }
    if (frame.contains(document.activeElement)) play.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('reel:toggle', { detail: { open: false } }));
  }

  // The preview waits for a resting mouse: the ring on Play fills for 1.5s, then the film starts.
  function arm() {
    if (mode || timer || rested || !available || motion === 'reduced' || document.hidden) return;
    film();
    card.classList.add('is-arming');
    timer = setTimeout(() => {
      timer = 0;
      card.classList.remove('is-arming');
      open('preview');
    }, HOVER_DELAY);
  }
  function disarm() {
    clearTimeout(timer);
    timer = 0;
    card.classList.remove('is-arming');
  }

  frame.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') arm(); });
  frame.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') arm(); });
  frame.addEventListener('pointerleave', () => {
    rested = false;
    disarm();
    if (mode === 'preview') close();
  });
  frame.addEventListener('click', event => {
    if (event.target.closest('.video-close')) close({ rest: true });
    else if (mode !== 'theater') open('theater');
  });

  const api = {
    card, frame, src, open, close, arm, disarm,
    get mode() { return mode; },
    refit() { if (mode && topLayer && frame.matches(':popover-open')) { flight?.cancel(); flight = null; place(target(mode)); } }
  };
  return api;
});

if (reels.length) {
  // Scrolling ends a preview and restarts the wait; a film that comes to rest under a still mouse starts counting.
  let mouse = null, settle = 0;
  addEventListener('pointermove', event => { if (event.pointerType === 'mouse') mouse = { x: event.clientX, y: event.clientY }; }, { passive: true });
  addEventListener('scroll', () => {
    reels.forEach(reel => { reel.disarm(); if (reel.mode === 'preview') reel.close(); });
    clearTimeout(settle);
    settle = setTimeout(() => {
      const under = mouse && document.elementFromPoint(mouse.x, mouse.y);
      if (under) reels.find(reel => reel.frame.contains(under))?.arm();
    }, 180);
  }, { passive: true });
  addEventListener('resize', () => reels.forEach(reel => reel.refit()), { passive: true });
  addEventListener('keydown', event => {
    const open = reels.find(reel => reel.mode);
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      open.close({ rest: true });
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reels.forEach(reel => reel.mode === 'preview' && reel.close()); });
}

// "Watch the demo" opens the film right away, with sound, wherever the page is.
qsa('[data-play-video]').forEach(link => link.addEventListener('click', event => {
  const reel = reels.find(item => item.src === link.dataset.playVideo);
  if (!reel) return;
  event.preventDefault();
  reel.open('theater');
}));

/* ---------- Without GSAP: things fade and sharpen in as they arrive ---------- */
if (!hasGsap) {
  root.classList.add('motion-fallback');
  root.classList.remove('intro-pending');
  const items = qsa('[data-hero], [data-project], [data-reveal], [data-blur], [data-blur-lines], [data-blur-scrub]');
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

window.site = { motion, lenis, scrollToTarget, showToast };
