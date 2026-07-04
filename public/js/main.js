(function () {
  'use strict';

  // ── Mobile menu ────────────────────────────────────────────────
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ── Lightbox ───────────────────────────────────────────────────
  const items = Array.from(document.querySelectorAll('[data-lightbox]'));
  if (items.length === 0) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <button class="lightbox-close" aria-label="Zavřít">×</button>
    <button class="lightbox-nav lightbox-nav--prev" aria-label="Předchozí">‹</button>
    <img alt="" />
    <button class="lightbox-nav lightbox-nav--next" aria-label="Další">›</button>
    <div class="lightbox-info"><strong></strong><span></span></div>
  `;
  document.body.appendChild(box);

  const img = box.querySelector('img');
  const titleEl = box.querySelector('.lightbox-info strong');
  const descEl = box.querySelector('.lightbox-info span');
  let index = 0;

  function open(i) {
    index = (i + items.length) % items.length;
    const el = items[index];
    img.src = el.href;
    titleEl.textContent = el.dataset.title || '';
    descEl.textContent = el.dataset.desc || '';
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    img.src = '';
  }

  items.forEach((el, i) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  box.addEventListener('click', (e) => {
    if (e.target === box || e.target === img) close();
  });
  box.querySelector('.lightbox-close').addEventListener('click', close);
  box.querySelector('.lightbox-nav--prev').addEventListener('click', (e) => { e.stopPropagation(); open(index - 1); });
  box.querySelector('.lightbox-nav--next').addEventListener('click', (e) => { e.stopPropagation(); open(index + 1); });

  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(index - 1);
    if (e.key === 'ArrowRight') open(index + 1);
  });

  // ── Reveal on scroll ───────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section-head, .service-card, .value, .process li').forEach(el => io.observe(el));
  }
})();
