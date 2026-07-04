#!/usr/bin/env node
/*
 * Seed skutečnými fotkami stažených z původního webu kuchyne-cihovsky.cz
 * Klient uvidí své vlastní realizace v novém designu.
 *
 * Použití: npm run seed-real
 *
 * Fotky se stahují live z původního webu při buildu.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const db = require('../db');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const SOURCE_BASE = 'https://www.kuchyne-cihovsky.cz/';

// Kategorie → cesty na původním webu, s tituly
const items = [
  // Moderní kuchyně
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Ko%2001.jpg', cat: 'moderni', title: 'Moderní kuchyň s ostrůvkem', desc: 'Realizace s dřevěným ostrůvkem a betonovou pracovní deskou' },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Ko%2002.jpg', cat: 'moderni', title: 'Bílá minimalistická kuchyň', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Ko%2003.jpg', cat: 'moderni', title: 'Kuchyň s tmavým akcentem', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Ko%2004.jpg', cat: 'moderni', title: 'Kuchyň s masivní pracovní deskou', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Ko%2005.jpg', cat: 'moderni', title: 'Kompaktní kuchyň do bytu', desc: null },

  // Rustikální
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_0.jpg', cat: 'rustikalni', title: 'Rustikální kuchyň s masivní deskou', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_1.jpg', cat: 'rustikalni', title: 'Selská kuchyň', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_10.jpg', cat: 'rustikalni', title: 'Kuchyň v přírodních tónech', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_11.jpg', cat: 'rustikalni', title: 'Dřevěná kuchyň se sklem', desc: null },

  // Ostrůvkové
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_2.jpg', cat: 'ostruvkove', title: 'Kuchyň s velkým ostrůvkem', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_12.jpg', cat: 'ostruvkove', title: 'Ostrůvková kuchyň s barem', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/kuchyne/Kuchyn_1_13.jpg', cat: 'ostruvkove', title: 'Otevřený prostor s kuchyňským ostrůvkem', desc: null },

  // Dveře
  { srcPath: 'tl_files/cihovsky/DATA/fotky/dvere/dvere01.jpg', cat: 'dvere', title: 'Interiérové dveře na míru', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/dvere/dvere02.jpg', cat: 'dvere', title: 'Dubové posuvné dveře', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/dvere/dvere03.jpg', cat: 'dvere', title: 'Prosklené dveře do obývacího pokoje', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/dvere/dvere04.jpg', cat: 'dvere', title: 'Bílé lakované dveře', desc: null },

  // Vestavěné skříně
  { srcPath: 'tl_files/cihovsky/DATA/fotky/nabytek/0001.jpg', cat: 'vestavene-skrine', title: 'Vestavěná šatna na míru', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/nabytek/IMG_20200118_191310.jpg', cat: 'vestavene-skrine', title: 'Vestavěná skříň v předsíni', desc: null },

  // Nábytek
  { srcPath: 'tl_files/cihovsky/DATA/fotky/nabytek/IMG_20200118_191812.jpg', cat: 'nabytek', title: 'Nábytek do dětského pokoje', desc: null },
  { srcPath: 'tl_files/cihovsky/DATA/fotky/nabytek/IMG_20200118_200318.jpg', cat: 'nabytek', title: 'Knihovna do obývacího pokoje', desc: null }
];

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processOne(item, idx) {
  const num = String(idx + 1).padStart(2, '0');
  const filename = `real-${num}.jpg`;
  const thumbName = `thumb-real-${num}.webp`;
  const url = SOURCE_BASE + item.srcPath;

  const buf = await download(url);

  // Full-size (optimalizované)
  await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(uploadsDir, filename));

  // Náhled WEBP
  await sharp(buf)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(uploadsDir, thumbName));

  return { filename, thumbName };
}

async function main() {
  console.log('▸ Seedování reálnými fotkami z původního webu…\n');

  // Načíst kategorie
  const catBySlug = {};
  db.prepare('SELECT * FROM categories').all().forEach(c => catBySlug[c.slug] = c);

  // Odstranit dřívější demo & real fotky
  const prev = db.prepare("SELECT filename, thumb_filename FROM photos WHERE filename LIKE 'demo-%' OR filename LIKE 'real-%'").all();
  for (const row of prev) {
    for (const name of [row.filename, row.thumb_filename]) {
      if (!name) continue;
      const p = path.join(uploadsDir, name);
      if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch (_) {} }
    }
  }
  db.prepare("DELETE FROM photos WHERE filename LIKE 'demo-%' OR filename LIKE 'real-%'").run();

  const insert = db.prepare(`
    INSERT INTO photos (filename, thumb_filename, title, description, category_id, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let ok = 0, fail = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cat = catBySlug[item.cat];
    if (!cat) {
      console.warn(`  ⚠ kategorie '${item.cat}' nenalezena`);
      fail++;
      continue;
    }
    try {
      const { filename, thumbName } = await processOne(item, i);
      insert.run(filename, thumbName, item.title, item.desc, cat.id, i);
      console.log(`  ✓ ${filename}  ·  ${item.title}  (${cat.name})`);
      ok++;
    } catch (err) {
      console.warn(`  ✗ ${item.srcPath} → ${err.message}`);
      fail++;
    }
  }

  console.log(`\n✓ Nahráno ${ok} fotek${fail ? ` (${fail} selhalo)` : ''}.`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
