const EMAIL = 'carltampus5@gmail.com';

const projectData = {
  flowauto: {
    index: '01',
    kicker: 'Automation · Browser Extension',
    title: 'Flow Auto',
    summary: 'A local Chrome / Edge extension for scene-based Google Flow production: import structured prompts, make reference images in Flow, ChatGPT, Grok or Meta AI, preserve continuity across batches, run a durable generation queue, request Flow\'s 1080p upscale, and save scene-numbered exports. Its MCP server lets Claude and Gemini import scripts, edit scenes and settings, and run the queue.',
    problem: 'Multi-scene Flow projects require repetitive setup, careful continuity tracking, manual batch coordination, export handling, and recovery when browser automation or generated results become ambiguous.',
    approach: 'Flow Auto combines a React / TypeScript production dashboard with a Manifest V3 background queue and Flow DOM automation. It keeps project rules and scene state durable, validates controls, pauses safely on ambiguous results, and verifies numbered 1080p exports before marking scenes complete.',
    tags: ['React', 'TypeScript', 'Chrome MV3', 'Vite', 'MCP', 'Automation']
  },
  healthnest: {
    index: '02',
    kicker: 'Healthcare · Desktop',
    title: 'HealthNest',
    summary: 'A maternal and child health monitoring desktop application designed to keep patient cases, appointments, and status changes in one clear workflow.',
    problem: 'Health information can become fragmented across appointments, case notes, and follow-up schedules, making day-to-day case tracking harder than it needs to be.',
    approach: 'A focused desktop workflow combines patient profiles, case status, scheduling, and an appointment calendar so information stays visible and actionable.',
    tags: ['WinUI 3', 'C#', 'SQLite', '.NET']
  }
};

const stackData = {
  languages: {
    index: '01', kicker: 'Core languages', title: 'Languages',
    description: 'The languages I reach for when building application logic, systems exercises, and interactive interfaces.',
    skills: ['C#', 'C', 'JavaScript', 'TypeScript', 'HTML', 'CSS']
  },
  desktop: {
    index: '02', kicker: 'Application layer', title: 'Desktop & UI',
    description: 'My current comfort zone: building practical Windows applications with interfaces shaped around real workflows.',
    skills: ['WinUI 3', 'WinForms', '.NET', 'XAML', 'React', 'UI Architecture']
  },
  data: {
    index: '03', kicker: 'Persistence layer', title: 'Data',
    description: 'Tools I use to structure, query, and persist application data across local and relational systems.',
    skills: ['SQLite', 'MySQL', 'MS Access', 'SQL', 'Data Modeling']
  },
  concepts: {
    index: '04', kicker: 'Engineering foundations', title: 'Foundations',
    description: 'The computer-science and engineering concepts behind the implementation decisions I make.',
    skills: ['Data Structures', 'Algorithms', 'Numerical Methods', 'Linear Algebra', 'Problem Solving']
  }
};

// Motion follows the OS setting unless the visitor flips the header switch (saved per browser).
const prefersReducedMotion = document.documentElement.dataset.motion === 'reduced';

function toggleMotion() {
  try { localStorage.setItem('portfolio-motion', prefersReducedMotion ? 'full' : 'reduced'); } catch {}
  location.reload();
}

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(message = 'Email copied to clipboard') {
  const toast = qs('#toast');
  qs('p', toast).textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
    showToast();
  } catch {
    const temp = document.createElement('textarea');
    temp.value = EMAIL;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    showToast();
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch {}
  const meta = qs('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#070b14' : '#f8fafc');
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

qs('#year').textContent = new Date().getFullYear();
qs('#themeToggle').addEventListener('click', toggleTheme);
const motionToggle = qs('#motionToggle');
if (motionToggle) {
  motionToggle.setAttribute('aria-pressed', String(!prefersReducedMotion));
  motionToggle.setAttribute('aria-label', prefersReducedMotion ? 'Turn page animations on' : 'Turn page animations off');
  motionToggle.addEventListener('click', toggleMotion);
}
qs('#copyEmailHero')?.addEventListener('click', copyEmail);
qs('#copyEmailContact').addEventListener('click', copyEmail);

const menuToggle = qs('#menuToggle');
const navLinks = qs('#navLinks');
function setMenu(open) {
  navLinks.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}
menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
qsa('a', navLinks).forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', event => {
  if (navLinks.classList.contains('is-open') && !event.target.closest('.nav-shell')) setMenu(false);
});

const navItems = qsa('a[data-nav]', navLinks);
const navHoverPill = qs('#navHoverPill');
const desktopNavHover = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1001px)');
let navPointerInside = false;

function positionNavPill(link, animate = true) {
  if (!navHoverPill || !link || !desktopNavHover.matches) return;

  const navRect = navLinks.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();

  if (!animate) navHoverPill.style.transition = 'none';

  navHoverPill.style.width = `${linkRect.width}px`;
  navHoverPill.style.transform = `translate3d(${linkRect.left - navRect.left}px, 0, 0)`;
  navHoverPill.classList.add('is-visible');

  if (!animate) {
    requestAnimationFrame(() => {
      navHoverPill.style.transition = '';
    });
  }
}

function syncNavPill(animate = true) {
  if (!desktopNavHover.matches) {
    navHoverPill?.classList.remove('is-visible');
    return;
  }

  const activeLink = qs('a[data-nav].is-active', navLinks);
  if (activeLink) positionNavPill(activeLink, animate);
  else navHoverPill?.classList.remove('is-visible');
}

navItems.forEach(link => {
  link.addEventListener('pointerenter', () => {
    navPointerInside = true;
    positionNavPill(link, true);
  });
});

navLinks.addEventListener('pointerleave', () => {
  navPointerInside = false;
  syncNavPill(true);
});

addEventListener('resize', () => syncNavPill(false), { passive: true });
desktopNavHover.addEventListener?.('change', () => syncNavPill(false));
requestAnimationFrame(() => syncNavPill(false));

const scrollProgress = qs('#scrollProgress');
const siteHeader = qs('#siteHeader');
function updateScrollUI() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const progress = max > 0 ? scrollY / max : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
  siteHeader.classList.toggle('is-scrolled', scrollY > 24);
}
addEventListener('scroll', updateScrollUI, { passive: true });
updateScrollUI();

// Cards that enter together cascade in reading order, so a grid ripples in instead of popping.
const revealObserver = new IntersectionObserver(entries => {
  const entering = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
  entering.forEach((entry, index) => {
    entry.target.style.setProperty('--delay', `${Math.min(index * 90, 450)}ms`);
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
qsa('.reveal').forEach(el => revealObserver.observe(el));
// Whatever is on screen at load reveals right away instead of waiting for the observer.
requestAnimationFrame(() => {
  qsa('.reveal:not(.is-visible)')
    .filter(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight * .92 && r.bottom > 0; })
    .forEach((el, index) => {
      el.style.setProperty('--delay', `${Math.min(index * 90, 450)}ms`);
      el.classList.add('is-visible');
      revealObserver.unobserve(el);
    });
});
// Drop the delay once revealed so hover and tilt respond instantly.
document.addEventListener('transitionend', event => {
  if (event.target.classList?.contains('reveal') && event.propertyName === 'opacity') event.target.style.removeProperty('--delay');
});

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    qsa('[data-nav]').forEach(link => {
      const active = link.dataset.nav === entry.target.id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (!navPointerInside) syncNavPill(true);
  });
}, { rootMargin: '-35% 0px -55%', threshold: 0 });
qsa('main section[id]').forEach(section => sectionObserver.observe(section));

const roles = ['software engineering', 'desktop application design', 'automation workflows', 'interactive web experiences'];
let roleIndex = 0;
const roleEl = qs('#roleRotator');
if (!prefersReducedMotion) {
  setInterval(() => {
    if (document.hidden) return;
    roleEl.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleEl.textContent = roles[roleIndex];
      roleEl.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
    });
  }, 2800);
}

const projectCount = qs('#projectCount');
qsa('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    qsa('.filter-button').forEach(btn => {
      btn.classList.toggle('is-active', btn === button);
      btn.setAttribute('aria-pressed', String(btn === button));
    });
    const filter = button.dataset.filter;
    let shown = 0;
    qsa('.project-card').forEach(card => {
      const matches = filter === 'all' || card.dataset.category.split(' ').includes(filter);
      card.classList.toggle('is-filtered-out', !matches);
      if (matches) shown++;
    });
    if (projectCount) projectCount.textContent = `Showing ${shown} project${shown === 1 ? '' : 's'}`;
  });
});

// Keep Tab focus inside an open dialog.
function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const focusable = qsa('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])', container)
    .filter(el => !el.hidden && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

const modal = qs('#projectModal');
let lastFocusedElement = null;
function openProject(key) {
  const data = projectData[key];
  if (!data) return;
  lastFocusedElement = document.activeElement;
  qs('#modalIndex').textContent = data.index;
  qs('#modalKicker').textContent = data.kicker;
  qs('#modalTitle').textContent = data.title;
  qs('#modalSummary').textContent = data.summary;
  qs('#modalProblem').textContent = data.problem;
  qs('#modalApproach').textContent = data.approach;
  qs('#modalTags').innerHTML = data.tags.map(tag => `<span>${tag}</span>`).join('');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
  setTimeout(() => qs('#modalClose').focus(), 30);
}
function closeProject() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
  lastFocusedElement?.focus();
}
// The whole card is clickable; the title button is the keyboard / screen-reader target.
qsa('.project-card').forEach(card => {
  card.addEventListener('click', event => {
    if (event.target.closest('[data-flow-preview]')) return;
    openProject(card.dataset.project);
  });
});

qsa('[data-flow-preview]').forEach(preview => {
  const buttons = qsa('[data-flow-view]', preview);
  const snapshots = qsa('[data-flow-snapshot]', preview);

  function showFlowSnapshot(view) {
    buttons.forEach(button => {
      const active = button.dataset.flowView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    snapshots.forEach(snapshot => {
      snapshot.classList.toggle('is-active', snapshot.dataset.flowSnapshot === view);
    });
  }

  buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
    button.addEventListener('click', event => {
      event.stopPropagation();
      showFlowSnapshot(button.dataset.flowView);
    });
  });
});
qs('#modalClose').addEventListener('click', closeProject);
modal.addEventListener('click', event => { if (event.target === modal) closeProject(); });
modal.addEventListener('keydown', event => trapFocus(modal, event));

qsa('.stack-button').forEach(button => {
  button.addEventListener('click', () => {
    const data = stackData[button.dataset.stack];
    qsa('.stack-button').forEach(btn => {
      btn.classList.toggle('is-active', btn === button);
      btn.setAttribute('aria-pressed', String(btn === button));
    });
    qs('#stackIndex').textContent = data.index;
    qs('#stackKicker').textContent = data.kicker;
    qs('#stackTitle').textContent = data.title;
    qs('#stackDescription').textContent = data.description;
    qs('#skillCloud').innerHTML = data.skills.map((skill, index) => `<li style="animation-delay:${index * 45}ms">${skill}</li>`).join('');
  });
});

const palette = qs('#commandPalette');
const commandInput = qs('#commandInput');
const commandItems = () => qsa('#commandList > button:not([hidden]), #commandList > a:not([hidden])');
let commandIndex = 0;
let paletteReturnFocus = null;

function highlightCommand(index) {
  const items = commandItems();
  if (!items.length) return;
  commandIndex = (index + items.length) % items.length;
  items.forEach((item, i) => item.classList.toggle('is-selected', i === commandIndex));
}

function openPalette() {
  paletteReturnFocus = document.activeElement;
  palette.classList.add('is-open');
  palette.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
  commandInput.value = '';
  qsa('#commandList > *').forEach(item => item.hidden = false);
  commandIndex = 0;
  highlightCommand(0);
  setTimeout(() => commandInput.focus(), 20);
}

function closePalette() {
  palette.classList.remove('is-open');
  palette.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
  paletteReturnFocus?.focus?.({ preventScroll: true });
}

function runAction(action) {
  if (['flow-auto','videos','projects','stack','about','contact'].includes(action)) {
    closePalette();
    scrollToTarget(qs('#' + action));
  } else if (action === 'copy') {
    copyEmail();
    closePalette();
  } else if (action === 'motion') {
    toggleMotion();
  } else if (action === 'theme') {
    toggleTheme();
    closePalette();
  }
}

qs('#commandTrigger').addEventListener('click', openPalette);
palette.addEventListener('click', event => { if (event.target === palette) closePalette(); });
palette.addEventListener('keydown', event => trapFocus(palette, event));
qsa('#commandList button').forEach(button => button.addEventListener('click', () => runAction(button.dataset.action)));
qsa('#commandList a').forEach(link => link.addEventListener('click', closePalette));

commandInput.addEventListener('input', () => {
  const query = commandInput.value.toLowerCase().trim();
  qsa('#commandList > *').forEach(item => {
    item.hidden = query && !item.textContent.toLowerCase().includes(query);
  });
  highlightCommand(0);
});

addEventListener('keydown', event => {
  const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
  if (shortcut) {
    event.preventDefault();
    palette.classList.contains('is-open') ? closePalette() : openPalette();
    return;
  }
  if (event.key === 'Escape') {
    if (modal.classList.contains('is-open')) closeProject();
    if (palette.classList.contains('is-open')) closePalette();
    if (navLinks.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
  }
  if (!palette.classList.contains('is-open')) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); highlightCommand(commandIndex + 1); }
  if (event.key === 'ArrowUp') { event.preventDefault(); highlightCommand(commandIndex - 1); }
  if (event.key === 'Enter' && document.activeElement === commandInput) {
    event.preventDefault();
    commandItems()[commandIndex]?.click();
  }
});

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

qsa('input, textarea', contactForm).forEach(input => {
  input.addEventListener('blur', () => { if (input.value) validateField(input); });
  input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateField(input); });
});

contactForm.addEventListener('submit', async event => {
  event.preventDefault();
  const inputs = qsa('input, textarea', contactForm);
  const invalid = inputs.filter(input => !validateField(input));
  if (invalid.length) {
    invalid[0].focus();
    return;
  }
  const button = qs('.form-submit', contactForm);
  const label = qs('span', button);
  const status = qs('#formStatus');
  button.disabled = true;
  button.classList.add('is-loading');
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
    button.classList.remove('is-loading');
    label.textContent = 'Send message';
  }
});

/* =====================
   INTERACTIVE PARTICLE FIELD
   ===================== */
const particleCanvas = qs('#particleField');

if (particleCanvas) {
  const particleCtx = particleCanvas.getContext('2d', { alpha: true });
  const particlePointer = {
    x: -9999,
    y: -9999,
    lastX: -9999,
    lastY: -9999,
    vx: 0,
    vy: 0,
    active: false,
    type: 'mouse'
  };

  let particleWidth = 0;
  let particleHeight = 0;
  let particleDpr = 1;
  let particleItems = [];
  let particleFrame = 0;
  let particleLastTime = performance.now();
  let particlePaused = false;
  let particleTextColor = '#f4f3ef';
  let particleAccentColor = '#b8ff5a';
  const particleMotionScale = prefersReducedMotion ? .66 : 3;
  let particleScrollBoost = 1;
  let particleScrollTarget = 1;
  let particleScrollTimer = 0;

  function refreshParticleColors() {
    const styles = getComputedStyle(document.documentElement);
    particleTextColor = styles.getPropertyValue('--text').trim() || '#f4f3ef';
    particleAccentColor = styles.getPropertyValue('--accent').trim() || '#b8ff5a';
  }

  function makeParticle(initial = false) {
    const sizeBias = Math.random();
    return {
      x: Math.random() * particleWidth,
      y: initial ? Math.random() * particleHeight : -12 - Math.random() * 90,
      radius: .55 + sizeBias * 1.25,
      alpha: .16 + Math.random() * .38,
      vx: (Math.random() - .5) * .08,
      vy: .12 + Math.random() * .28,
      baseVy: .12 + Math.random() * .28,
      drift: .006 + Math.random() * .018,
      phase: Math.random() * Math.PI * 2,
      accent: Math.random() < .08
    };
  }

  function desiredParticleCount() {
    const finePointer = matchMedia('(pointer: fine)').matches;
    const raw = Math.floor((particleWidth * particleHeight) / 9000);
    const max = finePointer ? 150 : 80;
    const min = finePointer ? 65 : 42;
    return Math.max(min, Math.min(max, raw));
  }

  function resizeParticleField() {
    particleWidth = innerWidth;
    particleHeight = innerHeight;
    particleDpr = Math.min(window.devicePixelRatio || 1, 2);

    particleCanvas.width = Math.round(particleWidth * particleDpr);
    particleCanvas.height = Math.round(particleHeight * particleDpr);
    particleCanvas.style.width = particleWidth + 'px';
    particleCanvas.style.height = particleHeight + 'px';
    particleCtx.setTransform(particleDpr, 0, 0, particleDpr, 0, 0);

    const target = desiredParticleCount();
    if (particleItems.length > target) {
      particleItems.length = target;
    } else {
      while (particleItems.length < target) particleItems.push(makeParticle(true));
    }
  }

  function drawParticleField() {
    particleCtx.clearRect(0, 0, particleWidth, particleHeight);

    for (const particle of particleItems) {
      particleCtx.globalAlpha = particle.alpha;
      particleCtx.fillStyle = particle.accent ? particleAccentColor : particleTextColor;
      particleCtx.beginPath();
      particleCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      particleCtx.fill();
    }

    particleCtx.globalAlpha = 1;
  }

  function updateParticleField(now) {
    if (particlePaused) return;

    const delta = Math.min(2, Math.max(.4, (now - particleLastTime) / 16.67));
    particleLastTime = now;

    particleScrollBoost += (particleScrollTarget - particleScrollBoost) * Math.min(1, .12 * delta);
    const particleSpeed = particleMotionScale * particleScrollBoost;

    for (const particle of particleItems) {
      particle.vx += Math.sin(now * .00055 + particle.phase) * particle.drift * delta * particleSpeed;
      particle.vx *= Math.pow(.985, delta);
      particle.vy += (particle.baseVy - particle.vy) * .012 * delta;

      if (particlePointer.active) {
        const dx = particle.x - particlePointer.x;
        const dy = particle.y - particlePointer.y;
        const distanceSq = dx * dx + dy * dy;
        const radius = particlePointer.type === 'touch' ? 105 : 135;

        if (distanceSq < radius * radius && distanceSq > .01) {
          const distance = Math.sqrt(distanceSq);
          const influence = 1 - distance / radius;
          const force = influence * influence * .14 * particleSpeed;
          particle.vx += (dx / distance) * force * delta;
          particle.vy += (dy / distance) * force * delta;
          particle.vx += particlePointer.vx * influence * .0025 * particleSpeed;
          particle.vy += particlePointer.vy * influence * .0016 * particleSpeed;
        }
      }

      particle.x += particle.vx * delta * particleSpeed;
      particle.y += particle.vy * delta * particleSpeed;

      if (particle.y > particleHeight + 14) {
        Object.assign(particle, makeParticle(false));
      }
      if (particle.x < -18) particle.x = particleWidth + 18;
      if (particle.x > particleWidth + 18) particle.x = -18;
    }

    particlePointer.vx *= .82;
    particlePointer.vy *= .82;

    drawParticleField();
    particleFrame = requestAnimationFrame(updateParticleField);
  }

  function scatterParticles(x, y, strength = 1) {
    for (const particle of particleItems) {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const distanceSq = dx * dx + dy * dy;
      const radius = 175;

      if (distanceSq < radius * radius && distanceSq > .01) {
        const distance = Math.sqrt(distanceSq);
        const influence = 1 - distance / radius;
        const impulse = influence * .9 * strength * particleMotionScale;
        particle.vx += (dx / distance) * impulse;
        particle.vy += (dy / distance) * impulse;
      }
    }
  }

  addEventListener('pip-play', event => {
    const { x, y } = event.detail || {};
    if (!prefersReducedMotion && Number.isFinite(x) && Number.isFinite(y)) {
      scatterParticles(x, y, .45);
    }
  });

  addEventListener('pointermove', event => {
    particlePointer.type = event.pointerType || 'mouse';

    if (particlePointer.lastX < -1000) {
      particlePointer.lastX = event.clientX;
      particlePointer.lastY = event.clientY;
    }

    particlePointer.vx = event.clientX - particlePointer.lastX;
    particlePointer.vy = event.clientY - particlePointer.lastY;
    particlePointer.x = event.clientX;
    particlePointer.y = event.clientY;
    particlePointer.lastX = event.clientX;
    particlePointer.lastY = event.clientY;
    particlePointer.active = true;
  }, { passive: true });

  addEventListener('pointerdown', event => {
    particlePointer.type = event.pointerType || 'mouse';
    particlePointer.x = event.clientX;
    particlePointer.y = event.clientY;
    particlePointer.active = true;
    scatterParticles(event.clientX, event.clientY, event.pointerType === 'touch' ? .7 : 1);
  }, { passive: true });

  addEventListener('pointerup', event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      particlePointer.active = false;
    }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    particlePointer.active = false;
  });

  addEventListener('blur', () => {
    particlePointer.active = false;
  });

  addEventListener('scroll', () => {
    particleScrollBoost = 2;
    particleScrollTarget = 2;

    clearTimeout(particleScrollTimer);
    particleScrollTimer = setTimeout(() => {
      particleScrollTarget = 1;
    }, 120);
  }, { passive: true });

  addEventListener('resize', resizeParticleField, { passive: true });

  document.addEventListener('visibilitychange', () => {
    particlePaused = document.hidden;

    if (particlePaused) {
      cancelAnimationFrame(particleFrame);
    } else {
      particleLastTime = performance.now();
      particleFrame = requestAnimationFrame(updateParticleField);
    }
  });

  new MutationObserver(refreshParticleColors).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  refreshParticleColors();
  resizeParticleField();
  drawParticleField();

  particleFrame = requestAnimationFrame(updateParticleField);
}


/* =====================
   SHARED SELECTOR PILL MOTION
   ===================== */
function initSlidingSelector(containerSelector, itemSelector) {
  const container = qs(containerSelector);
  if (!container) return;

  const pill = qs('.selector-hover-pill', container);
  const items = qsa(itemSelector, container);
  const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
  let pointerInside = false;

  if (!pill || !items.length) return;

  function positionPill(item, animate = true) {
    if (!item || !hoverCapable.matches) {
      pill.classList.remove('is-visible');
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (!animate) pill.style.transition = 'none';

    pill.style.width = `${itemRect.width}px`;
    pill.style.height = `${itemRect.height}px`;
    pill.style.transform = `translate3d(${itemRect.left - containerRect.left}px, ${itemRect.top - containerRect.top}px, 0)`;
    pill.classList.add('is-visible');

    if (!animate) {
      requestAnimationFrame(() => {
        pill.style.transition = '';
      });
    }
  }

  function syncPill(animate = true) {
    if (!hoverCapable.matches) {
      pill.classList.remove('is-visible');
      return;
    }

    const active = items.find(item => item.classList.contains('is-active'));
    if (active) {
      positionPill(active, animate);
    } else {
      pill.classList.remove('is-visible');
    }
  }

  items.forEach(item => {
    item.addEventListener('pointerenter', () => {
      pointerInside = true;
      positionPill(item, true);
    });
  });

  container.addEventListener('pointerleave', () => {
    pointerInside = false;
    syncPill(true);
  });

  const observer = new MutationObserver(() => {
    if (!pointerInside) requestAnimationFrame(() => syncPill(true));
  });

  items.forEach(item => {
    observer.observe(item, {
      attributes: true,
      attributeFilter: ['class']
    });
  });

  addEventListener('resize', () => syncPill(false), { passive: true });
  hoverCapable.addEventListener?.('change', () => syncPill(false));

  requestAnimationFrame(() => syncPill(false));
}

initSlidingSelector('#coreViewGrid', '.core-view');
initSlidingSelector('#projectFilterGroup', '.filter-button');
initSlidingSelector('#stackSelector', '.stack-button');


/* =====================
   SMOOTH SCROLL + SCROLL-LINKED MOTION
   ===================== */
const header = () => (qs('#siteHeader')?.offsetHeight || 64) + 16;
let lenis = null;

if (!prefersReducedMotion && window.Lenis) {
  lenis = new Lenis({ lerp: .09, wheelMultiplier: 1, smoothWheel: true });
  const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  // Dialogs lock the page; pause smoothing so their own content can scroll.
  new MutationObserver(() => {
    document.body.classList.contains('is-locked') ? lenis.stop() : lenis.start();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function scrollToTarget(target) {
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { offset: -header(), duration: 1.4 });
  else target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains('skip-link') || !lenis) return;
  const id = link.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : document.body;
  if (!target) return;
  event.preventDefault();
  scrollToTarget(id === 'home' ? document.body : target);
});

const parallaxItems = qsa('[data-parallax]');
const hero = qs('#home');
const tickerTrack = qs('.ticker-track');
let lastScrollY = scrollY;
let scrollVelocity = 0;
let tickerX = 0;

function scrollEffects() {
  const y = scrollY;
  scrollVelocity += ((y - lastScrollY) - scrollVelocity) * .2;
  lastScrollY = y;

  if (!prefersReducedMotion) {
    parallaxItems.forEach(el => el.style.setProperty('--py', `${(y * Number(el.dataset.parallax)).toFixed(1)}px`));
    if (hero) {
      const progress = Math.min(1, Math.max(0, y / (hero.offsetHeight * .9)));
      hero.style.setProperty('--hero-p', progress.toFixed(3));
    }
  }
}
addEventListener('scroll', scrollEffects, { passive: true });
scrollEffects();

// The ticker drifts on its own and speeds up with the scroll, in either direction.
if (tickerTrack && !prefersReducedMotion) {
  tickerTrack.style.animation = 'none';
  const loop = () => {
    const half = tickerTrack.scrollWidth / 2;
    tickerX -= .5 + Math.min(Math.abs(scrollVelocity) * .35, 18);
    if (half && tickerX <= -half) tickerX += half;
    tickerTrack.style.transform = `translate3d(${tickerX}px, 0, 0)`;
    scrollVelocity *= .94;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* =====================
   GLASS GLARE + PLAYFUL TILT
   ===================== */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  qsa('.bento, .project-card').forEach(card => {
    const tilts = card.classList.contains('tilt') && !prefersReducedMotion;
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      if (tilts) {
        card.style.setProperty('--rx', `${((.5 - y) * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - .5) * 7).toFixed(2)}deg`);
      }
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* =====================
   SHOWREEL VIDEOS
   Drop a file at the path in data-video (e.g. videos/intro.mp4) and its card
   becomes playable. A data-youtube="VIDEO_ID" attribute works too.
   ===================== */
qsa('.video-card').forEach(async card => {
  const frame = qs('.video-frame', card);
  const button = qs('.video-play', card);
  const badge = qs('.video-badge', card);
  const youtube = card.dataset.youtube;
  const src = card.dataset.video;
  let available = Boolean(youtube);

  if (!available && src && location.protocol !== 'file:') {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      available = response.ok && (response.headers.get('content-type') || '').startsWith('video');
    } catch {}
  }

  card.classList.toggle('is-ready', available);
  if (available) {
    badge.hidden = true;
    const poster = card.dataset.poster;
    if (poster && !youtube) {
      fetch(poster, { method: 'HEAD' }).then(r => {
        if (r.ok) frame.style.setProperty('--poster', `url("${poster}")`);
      }).catch(() => {});
    }
  }

  button.addEventListener('click', event => {
    event.stopPropagation();
    if (!available) {
      showToast('This video is coming soon.');
      return;
    }
    let player = qs('video, iframe', frame);
    if (!player) {
      if (youtube) {
        player = document.createElement('iframe');
        player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?autoplay=1&rel=0`;
        player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        player.allowFullscreen = true;
        player.title = button.getAttribute('aria-label').replace('Play video: ', '');
      } else {
        player = document.createElement('video');
        player.src = src;
        player.controls = true;
        player.playsInline = true;
        player.preload = 'auto';
      }
      frame.appendChild(player);
    }
    card.classList.add('is-playing');
    player.play?.();
    player.focus?.();
  });
});

/* =====================
   SWIPEABLE ROWS ON PHONES
   Adds page dots under every [data-carousel] strip and keeps them in sync.
   ===================== */
const phone = matchMedia('(max-width: 640px)');
qsa('[data-carousel]').forEach(track => {
  const dots = document.createElement('div');
  dots.className = 'carousel-dots';
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', `${track.getAttribute('aria-label') || 'Cards'}: choose a card`);
  track.after(dots);

  const items = () => [...track.children].filter(el => !el.classList.contains('is-filtered-out'));
  function build() {
    dots.innerHTML = '';
    items().forEach((item, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show card ${index + 1}`);
      dot.addEventListener('click', () => track.scrollTo({ left: item.offsetLeft - track.offsetLeft - 16, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
      dots.appendChild(dot);
    });
    sync();
  }
  function sync() {
    const list = items();
    const center = track.scrollLeft + track.clientWidth * .35;
    let active = 0;
    list.forEach((item, index) => { if (item.offsetLeft - track.offsetLeft <= center) active = index; });
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) active = list.length - 1;
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('is-active', index === active);
      dot.setAttribute('aria-current', index === active ? 'true' : 'false');
    });
  }
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  // Rebuild only when project filters hide or show a card (not for reveal or Pip classes).
  const filterWatch = new MutationObserver(mutations => {
    const changed = mutations.some(m => (m.oldValue || '').includes('is-filtered-out') !== m.target.classList.contains('is-filtered-out'));
    if (changed) { track.scrollLeft = 0; build(); }
  });
  [...track.children].forEach(child => filterWatch.observe(child, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
  build();
});
