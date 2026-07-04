const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = crypto.randomBytes(10).toString('hex');
    cb(null, `${Date.now()}-${safe}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|avif)$/i.test(file.mimetype);
    if (!ok) return cb(new Error('Nepovolený typ souboru — jen JPG, PNG, WEBP, AVIF'));
    cb(null, true);
  }
});

// ── LOGIN ────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('admin/login', { title: 'Přihlášení', error: null, layout: false });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.render('admin/login', {
      title: 'Přihlášení',
      error: 'Nesprávné přihlašovací údaje.',
      layout: false
    });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── DASHBOARD ────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const stats = {
    photos: db.prepare('SELECT COUNT(*) AS c FROM photos').get().c,
    categories: db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
    messages: db.prepare('SELECT COUNT(*) AS c FROM messages').get().c,
    unreadMessages: db.prepare('SELECT COUNT(*) AS c FROM messages WHERE read = 0').get().c
  };
  const recentPhotos = db.prepare(`
    SELECT p.*, c.name AS cat_name FROM photos p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC LIMIT 6
  `).all();
  const recentMessages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').all();

  res.render('admin/dashboard', {
    title: 'Administrace',
    stats,
    recentPhotos,
    recentMessages
  });
});

// ── FOTOGRAFIE ───────────────────────────────────────────────────────────
router.get('/fotky', requireAuth, (req, res) => {
  const filter = req.query.kategorie;
  let photos;
  if (filter) {
    photos = db.prepare(`
      SELECT p.*, c.name AS cat_name, c.slug AS cat_slug FROM photos p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE c.slug = ?
      ORDER BY p.sort_order, p.created_at DESC
    `).all(filter);
  } else {
    photos = db.prepare(`
      SELECT p.*, c.name AS cat_name, c.slug AS cat_slug FROM photos p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
    `).all();
  }
  res.render('admin/photos', { title: 'Fotogalerie', photos, filter });
});

router.get('/nahrat', requireAuth, (req, res) => {
  res.render('admin/upload', { title: 'Nahrát fotky', error: null, success: null });
});

router.post('/nahrat', requireAuth, upload.array('photos', 30), async (req, res) => {
  try {
    const files = req.files || [];
    const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    const insert = db.prepare(`
      INSERT INTO photos (filename, thumb_filename, title, description, category_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const f of files) {
      const thumbName = 'thumb-' + f.filename.replace(/\.[^.]+$/, '.webp');
      const thumbPath = path.join(uploadsDir, thumbName);
      try {
        await sharp(f.path)
          .rotate()
          .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(thumbPath);
      } catch (err) {
        console.warn('Thumbnail selhal, používám originál:', err.message);
      }
      insert.run(
        f.filename,
        fs.existsSync(thumbPath) ? thumbName : f.filename,
        title || null,
        description || null,
        categoryId
      );
    }

    res.render('admin/upload', {
      title: 'Nahrát fotky',
      error: null,
      success: `Nahráno ${files.length} ${files.length === 1 ? 'fotka' : 'fotek'}.`
    });
  } catch (err) {
    console.error(err);
    res.render('admin/upload', { title: 'Nahrát fotky', error: err.message, success: null });
  }
});

router.post('/fotky/:id/upravit', requireAuth, upload.single('replacement'), async (req, res) => {
  const { title, description, category_id } = req.body;
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.redirect('/admin/fotky');

  // Výměna souboru — pokud nahrál nový, smaž staré, zpracuj nový
  if (req.file) {
    // Zpracovat nový soubor stejně jako v /nahrat
    const f = req.file;
    const thumbName = 'thumb-' + f.filename.replace(/\.[^.]+$/, '.webp');
    const thumbPath = path.join(uploadsDir, thumbName);
    try {
      await sharp(f.path)
        .rotate()
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(thumbPath);
    } catch (err) {
      console.warn('Thumbnail selhal:', err.message);
    }
    // Smazat staré soubory
    for (const oldName of [photo.filename, photo.thumb_filename]) {
      if (!oldName) continue;
      const p = path.join(uploadsDir, oldName);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) { console.warn(e.message); }
      }
    }
    db.prepare(`
      UPDATE photos SET filename = ?, thumb_filename = ?, title = ?, description = ?, category_id = ? WHERE id = ?
    `).run(
      f.filename,
      fs.existsSync(thumbPath) ? thumbName : f.filename,
      (title || '').trim() || null,
      (description || '').trim() || null,
      category_id ? Number(category_id) : null,
      req.params.id
    );
  } else {
    // Jen aktualizovat metadata
    db.prepare(`
      UPDATE photos SET title = ?, description = ?, category_id = ? WHERE id = ?
    `).run(
      (title || '').trim() || null,
      (description || '').trim() || null,
      category_id ? Number(category_id) : null,
      req.params.id
    );
  }
  res.redirect('/admin/fotky' + (req.query.kategorie ? '?kategorie=' + req.query.kategorie : ''));
});

router.post('/fotky/:id/smazat', requireAuth, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (photo) {
    for (const name of [photo.filename, photo.thumb_filename]) {
      if (!name) continue;
      const p = path.join(uploadsDir, name);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) { console.warn(e.message); }
      }
    }
    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  }
  res.redirect('/admin/fotky');
});

// ── KATEGORIE ────────────────────────────────────────────────────────────
router.get('/kategorie', requireAuth, (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM photos WHERE category_id = c.id) AS photo_count
    FROM categories c ORDER BY section, sort_order, name
  `).all();
  res.render('admin/categories', { title: 'Kategorie', categories, error: null });
});

router.post('/kategorie', requireAuth, (req, res) => {
  const { name, slug, description, sort_order, section } = req.body;
  const cleanSlug = (slug || name || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const sec = section === 'ostatni' ? 'ostatni' : 'kuchyne';
  if (!name || !cleanSlug) return res.redirect('/admin/kategorie');
  try {
    db.prepare(`
      INSERT INTO categories (name, slug, description, section, sort_order) VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), cleanSlug, (description || '').trim() || null, sec, Number(sort_order) || 0);
  } catch (err) {
    console.warn(err.message);
  }
  res.redirect('/admin/kategorie');
});

router.post('/kategorie/:id/smazat', requireAuth, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.redirect('/admin/kategorie');
});

// ── ZPRÁVY ───────────────────────────────────────────────────────────────
router.get('/zpravy', requireAuth, (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  db.prepare('UPDATE messages SET read = 1 WHERE read = 0').run();
  res.render('admin/messages', { title: 'Zprávy', messages });
});

router.post('/zpravy/:id/smazat', requireAuth, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.redirect('/admin/zpravy');
});

// ── ZMĚNA HESLA ──────────────────────────────────────────────────────────
router.get('/nastaveni', requireAuth, (req, res) => {
  res.render('admin/settings', { title: 'Nastavení', error: null, success: null });
});

router.post('/nastaveni/heslo', requireAuth, (req, res) => {
  const { current, next: newPass, confirm } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || !bcrypt.compareSync(current || '', user.password_hash)) {
    return res.render('admin/settings', { title: 'Nastavení', error: 'Současné heslo je nesprávné.', success: null });
  }
  if (!newPass || newPass.length < 8) {
    return res.render('admin/settings', { title: 'Nastavení', error: 'Nové heslo musí mít alespoň 8 znaků.', success: null });
  }
  if (newPass !== confirm) {
    return res.render('admin/settings', { title: 'Nastavení', error: 'Hesla se neshodují.', success: null });
  }
  const hash = bcrypt.hashSync(newPass, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.render('admin/settings', { title: 'Nastavení', error: null, success: 'Heslo bylo změněno.' });
});

module.exports = router;
