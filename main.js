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
      button.style.transform = `translate(${x * .08}px, ${y * .12}px)`;
    });
    button.addEventListener('pointerleave', () => button.style.transform = '');
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
  card.addEventListener('click', () => openProject(card.dataset.project));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(card.dataset.project);
    }
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
