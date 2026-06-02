/* =====================
   MOBILE MENU
   ===================== */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

/* =====================
   ANIMATED COUNTERS
   ===================== */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1200;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current);
    }
  }, 16);
}

// Trigger counters when hero section enters viewport
const counterEls = document.querySelectorAll('.stat-num[data-target]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counterEls.forEach(el => counterObserver.observe(el));

/* =====================
   SCROLL FADE-IN
   ===================== */
const fadeEls = document.querySelectorAll('.project-card, .skill-group, .contact-wrapper');

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${i * 0.08}s`;
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  fadeObserver.observe(el);
});

// Add .visible class handler
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
  document.head.appendChild(style);
});

/* =====================
   ACTIVE NAV HIGHLIGHT
   ===================== */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.style.color = 'var(--c-text)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => navObserver.observe(s));

/* =====================
   CONTACT FORM
   ===================== */
function handleSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('formNote');
  const btn = e.target.querySelector('button[type="submit"]');

  btn.textContent = 'sending...';
  btn.disabled = true;

  // Simulate sending (replace with your real backend/Formspree/EmailJS call)
  setTimeout(() => {
    note.textContent = '✓ message sent! i\'ll get back to you soon.';
    btn.textContent = 'send message';
    btn.disabled = false;
    e.target.reset();

    // Clear note after 5 seconds
    setTimeout(() => { note.textContent = ''; }, 5000);
  }, 1200);
}

/* =====================
   MOBILE MENU
   ===================== */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

/* =====================
   ANIMATED COUNTERS
   ===================== */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1200;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current);
    }
  }, 16);
}

// Trigger counters when hero section enters viewport
const counterEls = document.querySelectorAll('.stat-num[data-target]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counterEls.forEach(el => counterObserver.observe(el));

/* =====================
   SCROLL FADE-IN
   ===================== */
const fadeEls = document.querySelectorAll('.project-card, .skill-group, .contact-wrapper');

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${i * 0.08}s`;
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  fadeObserver.observe(el);
});

// Add .visible class handler
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
  document.head.appendChild(style);
});

/* =====================
   ACTIVE NAV HIGHLIGHT
   ===================== */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.style.color = 'var(--c-text)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => navObserver.observe(s));

/* =====================
   CONTACT FORM
   ===================== */
function handleSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('formNote');
  const btn = e.target.querySelector('button[type="submit"]');

  btn.textContent = 'sending...';
  btn.disabled = true;

  // Simulate sending (replace with your real backend/Formspree/EmailJS call)
  const data = new FormData(e.target);
    const res = await fetch('https://formspree.io/f/meedylgw', {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) { note.textContent = '✓ sent!'; e.target.reset(); }
    else { note.textContent = '✗ something went wrong, try emailing directly.'; }
}

/*
  ========================
  HOW TO CONNECT THE FORM
  ========================
  Option 1 — Formspree (easiest, free):
    1. Sign up at formspree.io
    2. Create a form and get your endpoint URL
    3. Replace the setTimeout simulation above with:

    const data = new FormData(e.target);
    const res = await fetch('https://formspree.io/f/YOUR_ID', {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) { note.textContent = '✓ sent!'; e.target.reset(); }
    else { note.textContent = '✗ something went wrong, try emailing directly.'; }

  Option 2 — EmailJS (no backend needed):
    Load the EmailJS SDK, then call emailjs.sendForm(...)
*/

