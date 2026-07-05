require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('./lib/session-store');

const db = require('./db');
const ensureSeed = require('./lib/ensure-seed');
const { attachUser } = require('./middleware/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

ensureSeed();

const app = express();
const PORT = process.env.PORT || 3000;

const BUILD_VERSION = 'v20';

// Skutečné údaje dílny — hardcoded, aby staré env vars na Renderu nepřebily.
// Klient dodá aktualizace až budou známé (IČO, provozní hodiny, sociální sítě).
const REAL_CONTACT = {
  email: 'cihovsky@c-box.cz',
  phone: '+420 608 032 103',
  address: 'Olešník 6, 373 50 Olešník',
  hours: 'Po–Pá 7:00–15:30',
  owner: 'Vlastimil Čihovský',
  instagram: 'https://instagram.com/kuchyne_cihovsky',
  facebook: 'https://facebook.com/kuchyne.cihovsky'
};

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
  res.locals.contact = REAL_CONTACT;
  res.locals.path = req.path;
  next();
});

app.get('/__version', (req, res) => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  let files = [];
  let readErr = null;
  try { files = fs.readdirSync(uploadsDir); } catch (e) { readErr = e.message; }
  const realFiles = files.filter(f => f.startsWith('real-') && f.endsWith('.jpg'));
  const dbRealCount = db.prepare("SELECT COUNT(*) as n FROM photos WHERE filename LIKE 'real-%'").get().n;
  res.json({
    build: BUILD_VERSION,
    node: process.version,
    cwd: process.cwd(),
    __dirname,
    uploadsDir,
    uploadsDirExists: fs.existsSync(uploadsDir),
    totalFilesInUploads: files.length,
    realFilesOnDisk: realFiles.length,
    firstFiles: files.slice(0, 10),
    readErr,
    realRecordsInDb: dbRealCount,
  });
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
  console.log(`\n  Kuchyně Čihovský — server běží na http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin/login\n`);
});
