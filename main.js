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

const videoCards = qsa('[data-video]');
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
