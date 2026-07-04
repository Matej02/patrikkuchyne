const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendContactMail } = require('../lib/mailer');

// ── HOME ─────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const featured = db.prepare(`
    SELECT p.*, c.slug AS cat_slug, c.name AS cat_name, c.section AS cat_section
    FROM photos p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all();

  res.render('index', {
    title: 'Kuchyně Čihovský — kuchyně na míru',
    featured
  });
});

// ── SECTION PAGES ────────────────────────────────────────────────────────
function renderSection(res, section, opts) {
  const activeCategory = opts.activeCategory || null;
  const sectionCats = db.prepare(
    'SELECT * FROM categories WHERE section = ? ORDER BY sort_order, name'
  ).all(section);

  const photos = activeCategory
    ? db.prepare(`
        SELECT p.*, c.slug AS cat_slug, c.name AS cat_name
        FROM photos p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.category_id = ?
        ORDER BY p.sort_order, p.created_at DESC
      `).all(activeCategory.id)
    : db.prepare(`
        SELECT p.*, c.slug AS cat_slug, c.name AS cat_name
        FROM photos p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE c.section = ?
        ORDER BY p.created_at DESC
      `).all(section);

  res.render('section', {
    title: opts.title,
    heading: opts.heading,
    lead: opts.lead,
    section,
    baseUrl: opts.baseUrl,
    sectionCats,
    photos,
    activeCategory
  });
}

// Kuchyně (hlavní činnost)
router.get('/kuchyne', (req, res) => {
  renderSection(res, 'kuchyne', {
    title: 'Kuchyně na míru — Kuchyně Čihovský',
    heading: 'Kuchyně',
    lead: 'Naše hlavní řemeslo. Každá kuchyně vzniká v naší dílně přesně na míru vašemu prostoru a způsobu vaření.',
    baseUrl: '/kuchyne'
  });
});

router.get('/kuchyne/:slug', (req, res, next) => {
  const cat = db.prepare('SELECT * FROM categories WHERE slug = ? AND section = ?').get(req.params.slug, 'kuchyne');
  if (!cat) return next();
  renderSection(res, 'kuchyne', {
    title: `${cat.name} — Kuchyně Čihovský`,
    heading: cat.name,
    lead: cat.description || 'Vybraná fotografie z realizací.',
    baseUrl: '/kuchyne',
    activeCategory: cat
  });
});

// Dále nabízíme (dveře, skříně, ostatní)
router.get('/dale-nabizime', (req, res) => {
  renderSection(res, 'ostatni', {
    title: 'Dále nabízíme — Kuchyně Čihovský',
    heading: 'Dále nabízíme',
    lead: 'Kromě kuchyní vyrábíme na míru také dveře, vestavěné skříně a další nábytek. Vše ze stejné dílny a se stejným řemeslným standardem.',
    baseUrl: '/dale-nabizime'
  });
});

router.get('/dale-nabizime/:slug', (req, res, next) => {
  const cat = db.prepare('SELECT * FROM categories WHERE slug = ? AND section = ?').get(req.params.slug, 'ostatni');
  if (!cat) return next();
  renderSection(res, 'ostatni', {
    title: `${cat.name} — Kuchyně Čihovský`,
    heading: cat.name,
    lead: cat.description || 'Vybraná fotografie z realizací.',
    baseUrl: '/dale-nabizime',
    activeCategory: cat
  });
});

// Zpětná kompatibilita — původní /realizace vede na kuchyně
router.get('/realizace', (req, res) => res.redirect(301, '/kuchyne'));
router.get('/realizace/:slug', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!cat) return res.redirect(301, '/kuchyne');
  const base = cat.section === 'ostatni' ? '/dale-nabizime' : '/kuchyne';
  res.redirect(301, `${base}/${cat.slug}`);
});

// ── O NÁS ────────────────────────────────────────────────────────────────
router.get('/o-nas', (req, res) => {
  res.render('o-nas', { title: 'O nás — Kuchyně Čihovský' });
});

// ── KONTAKT ──────────────────────────────────────────────────────────────
router.get('/kontakt', (req, res) => {
  res.render('kontakt', { title: 'Kontakt — Kuchyně Čihovský', sent: false, error: null });
});

router.post('/kontakt', async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const phone = (req.body.phone || '').trim();
  const extraMessage = (req.body.message || '').trim();
  const plan = (req.body.plan || '').trim();
  const term = (req.body.term || '').trim();
  const budget = (req.body.budget || '').trim();

  // honeypot
  if ((req.body.website || '').trim() !== '') {
    return res.render('kontakt', { title: 'Kontakt — Kuchyně Čihovský', sent: true, error: null });
  }
  if (!name || !email) {
    return res.render('kontakt', {
      title: 'Kontakt — Kuchyně Čihovský',
      sent: false,
      error: 'Vyplňte prosím jméno a e-mail.'
    });
  }

  // Sestavit strukturovanou zprávu z wizardu
  const parts = [];
  if (plan) parts.push(`Co plánuje: ${plan}`);
  if (term) parts.push(`Termín: ${term}`);
  if (budget) parts.push(`Rozpočet: ${budget}`);
  if (extraMessage) parts.push('\nVzkaz:\n' + extraMessage);
  const message = parts.join('\n') || extraMessage || '(bez zprávy)';

  db.prepare(`
    INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)
  `).run(name, email, phone, message);

  try {
    await sendContactMail({ name, email, phone, message });
  } catch (err) {
    console.error('Odeslání e-mailu selhalo:', err.message);
  }

  res.render('kontakt', { title: 'Kontakt — Kuchyně Čihovský', sent: true, error: null });
});

module.exports = router;
