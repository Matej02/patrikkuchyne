/*
 * Auto-seed při startu serveru. Zajistí, že DB obsahuje real-* fotky.
 * Nespoléhá na build step — soubory jsou v gitu, tady jen doplníme DB záznamy.
 */
const path = require('path');
const fs = require('fs');
const db = require('../db');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const items = [
  { cat: 'moderni', title: 'Moderní kuchyň s ostrůvkem', desc: 'Realizace s dřevěným ostrůvkem a betonovou pracovní deskou' },
  { cat: 'moderni', title: 'Bílá minimalistická kuchyň', desc: null },
  { cat: 'moderni', title: 'Kuchyň s tmavým akcentem', desc: null },
  { cat: 'moderni', title: 'Kuchyň s masivní pracovní deskou', desc: null },
  { cat: 'moderni', title: 'Kompaktní kuchyň do bytu', desc: null },
  { cat: 'rustikalni', title: 'Rustikální kuchyň s masivní deskou', desc: null },
  { cat: 'rustikalni', title: 'Selská kuchyň', desc: null },
  { cat: 'rustikalni', title: 'Kuchyň v přírodních tónech', desc: null },
  { cat: 'rustikalni', title: 'Dřevěná kuchyň se sklem', desc: null },
  { cat: 'ostruvkove', title: 'Kuchyň s velkým ostrůvkem', desc: null },
  { cat: 'ostruvkove', title: 'Ostrůvková kuchyň s barem', desc: null },
  { cat: 'ostruvkove', title: 'Otevřený prostor s kuchyňským ostrůvkem', desc: null },
  { cat: 'dvere', title: 'Interiérové dveře na míru', desc: null },
  { cat: 'dvere', title: 'Dubové posuvné dveře', desc: null },
  { cat: 'dvere', title: 'Prosklené dveře do obývacího pokoje', desc: null },
  { cat: 'dvere', title: 'Bílé lakované dveře', desc: null },
  { cat: 'vestavene-skrine', title: 'Vestavěná šatna na míru', desc: null },
  { cat: 'vestavene-skrine', title: 'Vestavěná skříň v předsíni', desc: null },
  { cat: 'nabytek', title: 'Nábytek do dětského pokoje', desc: null },
  { cat: 'nabytek', title: 'Knihovna do obývacího pokoje', desc: null }
];

function ensureSeed() {
  try {
    const catBySlug = {};
    db.prepare('SELECT * FROM categories').all().forEach(c => catBySlug[c.slug] = c);
    if (Object.keys(catBySlug).length === 0) {
      console.warn('[ensure-seed] žádné kategorie v DB — přeskakuji');
      return;
    }

    const realCount = db.prepare("SELECT COUNT(*) as n FROM photos WHERE filename LIKE 'real-%'").get().n;
    if (realCount >= 15) {
      return; // Už máme dost real fotek, není co dělat
    }

    console.log(`[ensure-seed] DB má ${realCount} real fotek — přeplňuji…`);

    // Smaž demo záznamy z DB (soubory demo-* na disku nejsou z gitu, ale to nevadí)
    db.prepare("DELETE FROM photos WHERE filename LIKE 'demo-%' OR filename LIKE 'real-%'").run();

    const insert = db.prepare(`
      INSERT INTO photos (filename, thumb_filename, title, description, category_id, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    let ok = 0, missing = 0;
    for (let i = 0; i < items.length; i++) {
      const num = String(i + 1).padStart(2, '0');
      const filename = `real-${num}.jpg`;
      const thumbName = `thumb-real-${num}.webp`;
      const item = items[i];
      const cat = catBySlug[item.cat];
      if (!cat) continue;

      // Vlož jen když soubor skutečně existuje na disku
      const fullPath = path.join(uploadsDir, filename);
      if (!fs.existsSync(fullPath)) {
        missing++;
        continue;
      }

      insert.run(filename, thumbName, item.title, item.desc, cat.id, i);
      ok++;
    }
    console.log(`[ensure-seed] vloženo ${ok} real fotek${missing ? ` (${missing} chybí na disku)` : ''}`);
  } catch (err) {
    console.error('[ensure-seed] chyba:', err.message);
  }
}

module.exports = ensureSeed;
