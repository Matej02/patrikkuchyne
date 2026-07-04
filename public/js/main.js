(function () {
  'use strict';

  // ── LOADED CLASS (spustí hero animace) ─────────────────────────
  requestAnimationFrame(() => {
    document.body.classList.add('is-loaded');
  });

  // ── STICKY HEADER — přidá class po scroll ──────────────────────
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── MOBILE MENU ────────────────────────────────────────────────
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    siteNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
      });
    });
  }

  // ── REVEAL ON SCROLL ───────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

    document.querySelectorAll('[data-reveal], .timeline-step, .testimonial').forEach(el => io.observe(el));
  }

  // ── ANIMATED COUNTERS ──────────────────────────────────────────
  const counterItems = document.querySelectorAll('[data-counter]');
  if (counterItems.length && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.counter, 10) || 0;
        const numEl = el.querySelector('.counter-num');
        if (!numEl) return;
        const duration = 1800;
        const start = performance.now();
        const easeOut = t => 1 - Math.pow(1 - t, 3);

        function step(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const value = Math.round(target * easeOut(progress));
          numEl.textContent = value;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.4 });
    counterItems.forEach(el => counterObserver.observe(el));
  }

  // ── HORIZONTAL SCROLL BUTTONS ──────────────────────────────────
  const hscrollTrack = document.querySelector('[data-hscroll]');
  const hscrollPrev = document.querySelector('[data-hscroll-prev]');
  const hscrollNext = document.querySelector('[data-hscroll-next]');
  if (hscrollTrack && hscrollPrev && hscrollNext) {
    const scrollBy = () => {
      const card = hscrollTrack.querySelector('.hscroll-card');
      return card ? card.getBoundingClientRect().width + 20 : 400;
    };
    hscrollPrev.addEventListener('click', () => {
      hscrollTrack.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
    });
    hscrollNext.addEventListener('click', () => {
      hscrollTrack.scrollBy({ left: scrollBy(), behavior: 'smooth' });
    });

    // Drag-to-scroll (desktop only, not touch)
    let isDown = false, startX = 0, scrollStart = 0;
    hscrollTrack.addEventListener('mousedown', (e) => {
      if (e.target.closest('a')) return;
      isDown = true;
      hscrollTrack.style.cursor = 'grabbing';
      startX = e.pageX;
      scrollStart = hscrollTrack.scrollLeft;
      e.preventDefault();
    });
    ['mouseup', 'mouseleave'].forEach(evt => {
      hscrollTrack.addEventListener(evt, () => {
        isDown = false;
        hscrollTrack.style.cursor = '';
      });
    });
    hscrollTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      hscrollTrack.scrollLeft = scrollStart - dx;
    });
  }

  // ── BEFORE / AFTER SLIDER ──────────────────────────────────────
  const baSlider = document.querySelector('[data-ba-slider]');
  if (baSlider) {
    const after = baSlider.querySelector('.ba-after');
    const handle = baSlider.querySelector('[data-ba-handle]');
    let dragging = false;

    function setPos(clientX) {
      const rect = baSlider.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const pct = (x / rect.width) * 100;
      after.style.clipPath = `inset(0 0 0 ${pct}%)`;
      handle.style.left = `${pct}%`;
    }

    baSlider.addEventListener('mousedown', (e) => {
      dragging = true;
      setPos(e.clientX);
    });
    baSlider.addEventListener('touchstart', (e) => {
      dragging = true;
      setPos(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (dragging) setPos(e.clientX);
    });
    window.addEventListener('touchmove', (e) => {
      if (dragging) setPos(e.touches[0].clientX);
    }, { passive: true });

    ['mouseup', 'touchend'].forEach(evt => {
      window.addEventListener(evt, () => { dragging = false; });
    });

    // Auto-demo animace prvních 2 sekund
    let demo = true;
    const rect = baSlider.getBoundingClientRect();
    let t0 = null;
    function demoFrame(t) {
      if (!demo) return;
      if (!t0) t0 = t;
      const elapsed = t - t0;
      const cycle = 3000;
      const p = (elapsed % cycle) / cycle;
      const pct = 30 + 40 * Math.sin(p * Math.PI * 2);
      after.style.clipPath = `inset(0 0 0 ${pct}%)`;
      handle.style.left = `${pct}%`;
      if (elapsed < 2500) requestAnimationFrame(demoFrame);
    }
    // Start demo when slider is visible
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            requestAnimationFrame(demoFrame);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.5 });
      io.observe(baSlider);
    }
    baSlider.addEventListener('mousedown', () => { demo = false; });
    baSlider.addEventListener('touchstart', () => { demo = false; }, { passive: true });
  }

  // ── PARALLAX na CTA banner background ──────────────────────────
  const ctaBg = document.querySelector('.cta-banner-bg img');
  if (ctaBg) {
    const banner = document.querySelector('.cta-banner');
    let ticking = false;
    function updateParallax() {
      const rect = banner.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportH) {
        ticking = false;
        return;
      }
      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      const translateY = (progress - 0.5) * 100;
      ctaBg.style.transform = `translateY(${translateY}px)`;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── MULTI-STEP WIZARD (kontakt) ────────────────────────────────
  const wizard = document.querySelector('[data-wizard]');
  if (wizard) {
    const steps = wizard.querySelectorAll('.wizard-step');
    const labels = wizard.querySelectorAll('[data-step-label]');
    const fill = wizard.querySelector('[data-progress-fill]');
    const summary = wizard.querySelector('[data-wizard-summary]');
    const totalSteps = steps.length;
    let current = 1;

    function goTo(n) {
      if (n < 1 || n > totalSteps) return;
      const target = wizard.querySelector(`.wizard-step[data-step="${n}"]`);
      if (!target) return;

      // validace předchozích kroků při postupu vpřed
      if (n > current) {
        for (let i = current; i < n; i++) {
          const step = wizard.querySelector(`.wizard-step[data-step="${i}"]`);
          const inputs = step.querySelectorAll('input[required]:not([type=radio]), input[type=radio][required]');
          const radios = step.querySelectorAll('input[type=radio][required]');
          if (radios.length && !Array.from(radios).some(r => r.checked)) {
            step.classList.add('wizard-step--error');
            setTimeout(() => step.classList.remove('wizard-step--error'), 400);
            return;
          }
          for (const inp of inputs) {
            if (inp.type !== 'radio' && !inp.checkValidity()) {
              inp.reportValidity();
              return;
            }
          }
        }
      }

      current = n;
      steps.forEach(s => s.classList.toggle('is-active', s.dataset.step == n));
      labels.forEach(l => l.classList.toggle('is-active', l.dataset.stepLabel == n));
      labels.forEach(l => l.classList.toggle('is-done', Number(l.dataset.stepLabel) < n));
      if (fill) fill.style.width = ((n - 1) / (totalSteps - 1) * 100) + '%';

      // souhrn na posledním kroku
      if (n === totalSteps && summary) {
        const plan = wizard.querySelector('input[name=plan]:checked');
        const term = wizard.querySelector('input[name=term]:checked');
        const budget = wizard.querySelector('input[name=budget]:checked');
        summary.innerHTML = `
          <div class="wizard-summary-inner">
            <span class="eyebrow">Vaše volba</span>
            <ul>
              ${plan ? `<li><strong>Co:</strong> ${plan.value}</li>` : ''}
              ${term ? `<li><strong>Kdy:</strong> ${term.value}</li>` : ''}
              ${budget ? `<li><strong>Rozpočet:</strong> ${budget.value}</li>` : ''}
            </ul>
          </div>
        `;
      }

      // scroll to top of wizard on step change (mobile)
      wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    wizard.querySelectorAll('[data-wizard-next]').forEach(btn => {
      btn.addEventListener('click', () => goTo(current + 1));
    });
    wizard.querySelectorAll('[data-wizard-prev]').forEach(btn => {
      btn.addEventListener('click', () => goTo(current - 1));
    });

    // Klik na label = skok pokud je krok již vyplněný
    labels.forEach(l => {
      l.addEventListener('click', () => {
        const n = Number(l.dataset.stepLabel);
        if (n <= current || l.classList.contains('is-done')) goTo(n);
      });
    });

    // Klik na radio = přejít automaticky na další krok (jen kroky 1-3)
    wizard.querySelectorAll('.wizard-step[data-step="1"] input[type=radio], .wizard-step[data-step="2"] input[type=radio], .wizard-step[data-step="3"] input[type=radio]').forEach(radio => {
      radio.addEventListener('change', () => {
        setTimeout(() => goTo(current + 1), 250);
      });
    });
  }

  // ── LIGHTBOX ───────────────────────────────────────────────────
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
})();
