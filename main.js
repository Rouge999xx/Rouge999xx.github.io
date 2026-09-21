const EMAIL = 'carltampus5@gmail.com';

const projectData = {
  healthnest: {
    index: '01',
    kicker: 'Healthcare · Desktop',
    title: 'HealthNest',
    summary: 'A maternal and child health monitoring desktop application designed to keep patient cases, appointments, and status changes in one clear workflow.',
    problem: 'Health information can become fragmented across appointments, case notes, and follow-up schedules, making day-to-day case tracking harder than it needs to be.',
    approach: 'A focused desktop workflow combines patient profiles, case status, scheduling, and an appointment calendar so information stays visible and actionable.',
    tags: ['WinUI 3', 'C#', 'SQLite', '.NET']
  },
  barangay: {
    index: '02',
    kicker: 'Civic Tech · Desktop',
    title: 'Barangay Case Management',
    summary: 'A social-services case management system for local government workflows, combining resident records, case tracking, and direct SMS notifications.',
    problem: 'Community case work involves many records, changing case states, and follow-ups that can be difficult to coordinate manually.',
    approach: 'The system organizes resident and case information in one desktop interface and connects notifications through the PhilSMS API for faster follow-up.',
    tags: ['WinForms', 'C#', 'SQLite', 'PhilSMS']
  },
  nursedesk: {
    index: '03',
    kicker: 'Health Tech · Desktop',
    title: 'NurseDesk',
    summary: 'A school clinic management system that brings student health records, medicine inventory, and health-log activity into one operational dashboard.',
    problem: 'School clinic work mixes record keeping, inventory awareness, and daily visit logging—tasks that become cumbersome when handled separately.',
    approach: 'NurseDesk groups the clinic workflow into a practical desktop system where student records, medicine stock, and health encounters can be managed together.',
    tags: ['WinForms', 'C#', 'SQLite']
  },
  flowauto: {
    index: '04',
    kicker: 'Automation · Browser Extension',
    title: 'Flow Auto',
    summary: 'A local Chrome / Edge extension for scene-based Google Flow production: import structured prompts, preserve continuity across batches, manage storyboards, run a durable generation queue, recover interrupted jobs, request Flow\'s 1080p upscale, and save scene-numbered exports.',
    problem: 'Multi-scene Flow projects require repetitive setup, careful continuity tracking, manual batch coordination, export handling, and recovery when browser automation or generated results become ambiguous.',
    approach: 'Flow Auto combines a React / TypeScript production dashboard with a Manifest V3 background queue and Flow DOM automation. It keeps project rules and scene state durable, validates controls, pauses safely on ambiguous results, and verifies numbered 1080p exports before marking scenes complete.',
    tags: ['React', 'TypeScript', 'Chrome MV3', 'Vite', 'Automation']
  }
};

const stackData = {
  languages: {
    index: '01', kicker: 'Core languages', title: 'Languages',
    description: 'The languages I reach for when building application logic, systems exercises, and interactive interfaces.',
    skills: ['C#', 'C', 'JavaScript', 'HTML', 'CSS'], meter: '88%'
  },
  desktop: {
    index: '02', kicker: 'Application layer', title: 'Desktop & UI',
    description: 'My current comfort zone: building practical Windows applications with interfaces shaped around real workflows.',
    skills: ['WinUI 3', 'WinForms', '.NET', 'XAML', 'UI Architecture'], meter: '82%'
  },
  data: {
    index: '03', kicker: 'Persistence layer', title: 'Data',
    description: 'Tools I use to structure, query, and persist application data across local and relational systems.',
    skills: ['SQLite', 'MySQL', 'MS Access', 'SQL', 'Data Modeling'], meter: '76%'
  },
  concepts: {
    index: '04', kicker: 'Engineering foundations', title: 'Foundations',
    description: 'The computer-science and engineering concepts behind the implementation decisions I make.',
    skills: ['Data Structures', 'Algorithms', 'Numerical Methods', 'Linear Algebra', 'Problem Solving'], meter: '84%'
  }
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  localStorage.setItem('portfolio-theme', theme);
  const meta = qs('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#08090c' : '#f3f1eb');
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

(function initTheme() {
  const saved = localStorage.getItem('portfolio-theme');
  if (saved) setTheme(saved);
})();

window.addEventListener('load', () => {
  setTimeout(() => qs('#preloader')?.classList.add('is-hidden'), 350);
});

qs('#year').textContent = new Date().getFullYear();
qs('#themeToggle').addEventListener('click', toggleTheme);
qs('#copyEmailHero').addEventListener('click', copyEmail);
qs('#copyEmailContact').addEventListener('click', copyEmail);

const menuToggle = qs('#menuToggle');
const navLinks = qs('#navLinks');
menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
qsa('a', navLinks).forEach(link => link.addEventListener('click', () => {
  navLinks.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

const navItems = qsa('a[data-nav]', navLinks);
const navHoverPill = qs('#navHoverPill');
const desktopNavHover = matchMedia('(hover: hover) and (pointer: fine)');
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

  const activeLink = qs('a[data-nav].is-active', navLinks) || navItems[0];
  positionNavPill(activeLink, animate);
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

function updateScrollUI() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const progress = max > 0 ? scrollY / max : 0;
  qs('#scrollProgress').style.width = `${progress * 100}%`;
  qs('#siteHeader').classList.toggle('is-scrolled', scrollY > 24);
}
addEventListener('scroll', updateScrollUI, { passive: true });
updateScrollUI();

if (!prefersReducedMotion && matchMedia('(pointer:fine)').matches) {
  addEventListener('pointermove', (event) => {
    document.documentElement.style.setProperty('--mx', event.clientX + 'px');
    document.documentElement.style.setProperty('--my', event.clientY + 'px');
  }, { passive: true });

  qsa('.tilt-card').forEach(card => {
    const strength = Number(card.dataset.tiltStrength || 3.2);
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--rx', `${-y * strength}deg`);
      card.style.setProperty('--ry', `${x * strength}deg`);
      if (!card.classList.contains('project-card')) {
        card.style.transform = `perspective(1200px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg)`;
      }
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      if (!card.classList.contains('project-card')) card.style.transform = '';
    });
  });

  qsa('.magnetic').forEach(button => {
    button.addEventListener('pointermove', event => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.setProperty('--mag-x', `${x * .08}px`);
      button.style.setProperty('--mag-y', `${y * .12}px`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--mag-x', '0px');
      button.style.setProperty('--mag-y', '0px');
    });
  });
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -40px' });
qsa('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min((i % 4) * 55, 165)}ms`;
  revealObserver.observe(el);
});

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    qsa('[data-nav]').forEach(link => link.classList.toggle('is-active', link.dataset.nav === entry.target.id));
    if (!navPointerInside) syncNavPill(true);
  });
}, { rootMargin: '-35% 0px -55%', threshold: 0 });
qsa('main section[id]').forEach(section => sectionObserver.observe(section));

const roles = ['software engineering', 'desktop application design', 'automation workflows', 'interactive web experiences'];
let roleIndex = 0;
const roleEl = qs('#roleRotator');
if (!prefersReducedMotion) {
  setInterval(() => {
    roleEl.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-5px)' }], { duration: 180, fill: 'forwards' }).finished.then(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleEl.textContent = roles[roleIndex];
      roleEl.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, fill: 'forwards' });
    });
  }, 2800);
}

qsa('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    qsa('.filter-button').forEach(btn => btn.classList.remove('is-active'));
    button.classList.add('is-active');
    const filter = button.dataset.filter;
    qsa('.project-card').forEach(card => {
      const matches = filter === 'all' || card.dataset.category.split(' ').includes(filter);
      card.classList.toggle('is-filtered-out', !matches);
    });
  });
});

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
qsa('.project-card').forEach(card => {
  card.addEventListener('click', event => {
    if (event.target.closest('[data-flow-preview]')) return;
    openProject(card.dataset.project);
  });
  card.addEventListener('keydown', event => {
    if (event.target !== card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(card.dataset.project);
    }
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

qsa('.stack-button').forEach(button => {
  button.addEventListener('click', () => {
    const data = stackData[button.dataset.stack];
    qsa('.stack-button').forEach(btn => btn.classList.remove('is-active'));
    button.classList.add('is-active');
    qs('#stackIndex').textContent = data.index;
    qs('#stackKicker').textContent = data.kicker;
    qs('#stackTitle').textContent = data.title;
    qs('#stackDescription').textContent = data.description;
    qs('#skillCloud').innerHTML = data.skills.map((skill, index) => `<span style="animation-delay:${index * 45}ms">${skill}</span>`).join('');
    qs('#stackMeter').style.width = data.meter;
  });
});

const palette = qs('#commandPalette');
const commandInput = qs('#commandInput');
const commandItems = () => qsa('#commandList > button:not([hidden]), #commandList > a:not([hidden])');
let commandIndex = 0;

function highlightCommand(index) {
  const items = commandItems();
  if (!items.length) return;
  commandIndex = (index + items.length) % items.length;
  items.forEach((item, i) => item.classList.toggle('is-selected', i === commandIndex));
}

function openPalette() {
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
}

function runAction(action) {
  if (['projects','stack','about','contact'].includes(action)) {
    closePalette();
    qs('#' + action)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  } else if (action === 'copy') {
    copyEmail();
    closePalette();
  } else if (action === 'theme') {
    toggleTheme();
    closePalette();
  }
}

qs('#commandTrigger').addEventListener('click', openPalette);
palette.addEventListener('click', event => { if (event.target === palette) closePalette(); });
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
contactForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = qs('.form-submit', contactForm);
  const status = qs('#formStatus');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span>Sending...</span><i>···</i>';
  status.textContent = '';
  try {
    const response = await fetch('https://formspree.io/f/meedylgw', {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Request failed');
    contactForm.reset();
    status.textContent = 'Message sent. I’ll get back to you soon.';
  } catch {
    status.textContent = 'Could not send right now — email me directly instead.';
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});


/* =====================
   INTERACTIVE 3D CORE
   ===================== */
const coreStage = qs('#coreStage');
const techCore = qs('#techCore');

if (coreStage && techCore) {
  const coreViews = {
    front: {
      x: -12, y: 0, title: 'Build',
      description: 'Application logic, architecture, and the parts that make an idea actually work.'
    },
    right: {
      x: -10, y: -90, title: 'Interface',
      description: 'Desktop and web interfaces shaped around clear workflows, feedback, and hierarchy.'
    },
    back: {
      x: -10, y: 180, title: 'Data',
      description: 'Structured persistence, relational thinking, and application data that stays useful.'
    },
    left: {
      x: -10, y: 90, title: 'Systems',
      description: 'The engineering layer: .NET, program structure, algorithms, and dependable behavior.'
    },
    top: {
      x: -90, y: 0, title: 'Automate',
      description: 'Reducing repetitive work with tools, scripts, integrations, and repeatable workflows.'
    },
    bottom: {
      x: 90, y: 0, title: 'Ship',
      description: 'Turning a working local build into a reviewed, versioned, deployable result.'
    }
  };

  let coreX = -18;
  let coreY = 28;
  let velocityX = 0;
  let velocityY = 0;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let autoRotate = !prefersReducedMotion;
  let lastFrame = performance.now();

  const coordinateReadout = qs('#coreCoordinates');
  const activeTitle = qs('#coreActiveTitle');
  const activeDescription = qs('#coreActiveDescription');
  const autoButton = qs('#coreAuto');

  function renderCore() {
    techCore.style.transform = `rotateX(${coreX}deg) rotateY(${coreY}deg)`;
    if (coordinateReadout) {
      coordinateReadout.textContent = `X ${Math.round(coreX)}° · Y ${Math.round(coreY)}°`;
    }
  }

  function setCoreReadout(view, markActive = true) {
    const data = coreViews[view];
    if (!data) return;
    if (activeTitle) activeTitle.textContent = data.title;
    if (activeDescription) activeDescription.textContent = data.description;
    if (markActive) {
      qsa('.core-view').forEach(button => {
        button.classList.toggle('is-active', button.dataset.coreView === view);
      });
    }
  }

  function setManualReadout() {
    if (activeTitle) activeTitle.textContent = 'Free orbit';
    if (activeDescription) {
      activeDescription.textContent = 'You are controlling the object directly. Flick it, inspect the depth, or snap back to a named layer.';
    }
    qsa('.core-view').forEach(button => button.classList.remove('is-active'));
  }

  function setAuto(enabled) {
    autoRotate = enabled && !prefersReducedMotion;
    autoButton?.classList.toggle('is-active', autoRotate);
    autoButton?.setAttribute('aria-pressed', String(autoRotate));
    const label = autoButton ? qs('span', autoButton) : null;
    if (label) label.textContent = autoRotate ? 'AUTO' : 'MANUAL';
  }

  function snapCore(view) {
    const data = coreViews[view];
    if (!data) return;
    setAuto(false);
    coreX = data.x;
    coreY = data.y;
    velocityX = 0;
    velocityY = 0;
    techCore.style.transition = 'transform .62s cubic-bezier(.2,.8,.2,1)';
    renderCore();
    setCoreReadout(view);
    setTimeout(() => { techCore.style.transition = ''; }, 650);
  }

  qsa('.core-view').forEach(button => {
    button.addEventListener('click', () => snapCore(button.dataset.coreView));
  });

  coreStage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    velocityX = 0;
    velocityY = 0;
    coreStage.classList.add('is-dragging');
    coreStage.setPointerCapture?.(event.pointerId);
    setAuto(false);
    setManualReadout();
  });

  coreStage.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    coreY += dx * .48;
    coreX -= dy * .38;
    coreX = Math.max(-88, Math.min(88, coreX));
    velocityY = dx * .13;
    velocityX = -dy * .1;
    renderCore();
  });

  function releaseCorePointer(event) {
    if (!dragging) return;
    dragging = false;
    coreStage.classList.remove('is-dragging');
    if (event?.pointerId !== undefined && coreStage.hasPointerCapture?.(event.pointerId)) {
      coreStage.releasePointerCapture(event.pointerId);
    }
  }

  coreStage.addEventListener('pointerup', releaseCorePointer);
  coreStage.addEventListener('pointercancel', releaseCorePointer);

  qsa('[data-core-nudge]').forEach(button => {
    button.addEventListener('click', () => {
      setAuto(false);
      setManualReadout();
      const direction = button.dataset.coreNudge;
      if (direction === 'left') coreY -= 18;
      if (direction === 'right') coreY += 18;
      if (direction === 'up') coreX -= 14;
      if (direction === 'down') coreX += 14;
      coreX = Math.max(-88, Math.min(88, coreX));
      renderCore();
    });
  });

  qs('[data-core-reset]')?.addEventListener('click', () => {
    coreX = -18;
    coreY = 28;
    velocityX = 0;
    velocityY = 0;
    setCoreReadout('front');
    setAuto(!prefersReducedMotion);
    renderCore();
  });

  autoButton?.addEventListener('click', () => setAuto(!autoRotate));

  coreStage.addEventListener('keydown', event => {
    const step = event.shiftKey ? 30 : 12;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'r', 'R', ' '].includes(event.key)) return;
    event.preventDefault();

    if (event.key === ' ') {
      setAuto(!autoRotate);
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      coreX = -18;
      coreY = 28;
      setCoreReadout('front');
      renderCore();
      return;
    }

    setAuto(false);
    setManualReadout();
    if (event.key === 'ArrowLeft') coreY -= step;
    if (event.key === 'ArrowRight') coreY += step;
    if (event.key === 'ArrowUp') coreX -= step;
    if (event.key === 'ArrowDown') coreX += step;
    coreX = Math.max(-88, Math.min(88, coreX));
    renderCore();
  });

  function animateCore(now) {
    const dt = Math.min(32, now - lastFrame) / 16.67;
    lastFrame = now;

    if (!dragging) {
      if (autoRotate) {
        coreY += .12 * dt;
      } else if (Math.abs(velocityX) > .005 || Math.abs(velocityY) > .005) {
        coreX += velocityX * dt;
        coreY += velocityY * dt;
        coreX = Math.max(-88, Math.min(88, coreX));
        velocityX *= Math.pow(.92, dt);
        velocityY *= Math.pow(.92, dt);
      }
      renderCore();
    }

    requestAnimationFrame(animateCore);
  }

  renderCore();
  setCoreReadout('front');
  setAuto(!prefersReducedMotion);
  if (!prefersReducedMotion) requestAnimationFrame(animateCore);
}


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
