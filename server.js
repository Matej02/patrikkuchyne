require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('./lib/session-store');

const db = require('./db');
const { attachUser } = require('./middleware/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore(),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'lax'
  }
}));

app.use(attachUser);

// Global template data — categories + contact info needed in nav/footer everywhere
const allCatsStmt = db.prepare('SELECT * FROM categories ORDER BY section, sort_order, name');
app.use((req, res, next) => {
  const cats = allCatsStmt.all();
  res.locals.categories = cats;
  res.locals.categoriesKuchyne = cats.filter(c => c.section === 'kuchyne');
  res.locals.categoriesOstatni = cats.filter(c => c.section === 'ostatni');
  res.locals.contact = {
    email: process.env.CONTACT_EMAIL || 'info@kuchyne-cihovsky.cz',
    phone: process.env.CONTACT_PHONE || '+420 000 000 000',
    address: process.env.CONTACT_ADDRESS || 'Provozovna, Česká republika',
    hours: process.env.CONTACT_HOURS || 'Po–Pá 8:00–16:00',
    instagram: process.env.INSTAGRAM_URL || '',
    facebook: process.env.FACEBOOK_URL || ''
  };
  res.locals.path = req.path;
  next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Stránka nenalezena' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Chyba serveru' });
});

app.listen(PORT, () => {
  console.log(`\n  Kuchyně Cíhovský — server běží na http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin/login\n`);
});
