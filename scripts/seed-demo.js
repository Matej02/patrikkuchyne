#!/usr/bin/env node
/*
 * Seed demo obsahu — nasype do galerie placeholder fotografie ve stylu webu,
 * aby klient při prohlížení nedostal prázdné stránky.
 *
 * Použití: npm run seed-demo
 * Placeholdery jsou generované SVG přes Sharp, jsou označené jako UKÁZKA.
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../db');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Warm béžová paleta v souladu s designem webu
const palettes = [
  { bg1: '#efe4d0', bg2: '#cdb994', ink: '#2b1e12', label: '#6b4220' },
  { bg1: '#e8d4b3', bg2: '#a67a4a', ink: '#2b1e12', label: '#4f2d15' },
  { bg1: '#d9bf94', bg2: '#8b5a2b', ink: '#f7ecd4', label: '#2b1e12' },
  { bg1: '#f7ecd4', bg2: '#c99966', ink: '#2b1e12', label: '#6b4220' },
  { bg1: '#c4a373', bg2: '#6b4220', ink: '#f7ecd4', label: '#efe4d0' },
];

const demos = [
  // Kuchyně — sekce 'kuchyne'
  { section: 'kuchyne', slug: 'moderni',    title: 'Bílá minimalistická kuchyň',    subtitle: 'Praha 6, 2024' },
  { section: 'kuchyne', slug: 'moderni',    title: 'Kuchyň s antracitovými dvířky', subtitle: 'Brno, 2024' },
  { section: 'kuchyne', slug: 'moderni',    title: 'Dubová kuchyň v novostavbě',    subtitle: 'Beroun, 2023' },
  { section: 'kuchyne', slug: 'rustikalni', title: 'Rustikální kuchyň s trámy',     subtitle: 'Kutná Hora, 2023' },
  { section: 'kuchyne', slug: 'rustikalni', title: 'Selská kuchyň v roubence',      subtitle: 'Vysočina, 2022' },
  { section: 'kuchyne', slug: 'ostruvkove', title: 'Ostrůvková kuchyň s barem',     subtitle: 'Průhonice, 2024' },
  { section: 'kuchyne', slug: 'ostruvkove', title: 'Velký ostrov s dřezem',         subtitle: 'Říčany, 2023' },
  // Dále nabízíme — sekce 'ostatni'
  { section: 'ostatni', slug: 'dvere',            title: 'Dubové posuvné dveře',        subtitle: 'Modřice, 2024' },
  { section: 'ostatni', slug: 'dvere',            title: 'Interiérové dveře v ořechu',  subtitle: 'Praha 5, 2023' },
  { section: 'ostatni', slug: 'vestavene-skrine', title: 'Šatna na míru — otec a syn',  subtitle: 'Zlín, 2024' },
  { section: 'ostatni', slug: 'vestavene-skrine', title: 'Vestavěná skříň v předsíni',  subtitle: 'Praha 8, 2023' },
  { section: 'ostatni', slug: 'nabytek',          title: 'Knihovna do obývacího pokoje', subtitle: 'Olomouc, 2024' },
];

function makeSvg({ w, h, palette, title, subtitle }) {
  const p = palette;
  // Několik nepravidelných obdélníků naznačujících skříňky/šuplíky
  const seed = title.length;
  const rects = [];
  const cols = 4;
  const cellW = w / cols;
  const cellH = h / 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + 6;
      const y = r * cellH + 6 + (h * 0.15);
      const rw = cellW - 12;
      const rh = cellH - 12;
      const opacity = 0.06 + ((seed + r * cols + c) % 5) * 0.02;
      rects.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${rw.toFixed(0)}" height="${rh.toFixed(0)}" fill="${p.ink}" opacity="${opacity}"/>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="${p.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${rects.join('\n  ')}
  <g font-family="Georgia, serif">
    <text x="${w/2}" y="${h*0.42}" text-anchor="middle" font-size="${Math.round(w*0.055)}" font-weight="900" fill="${p.ink}" letter-spacing="-1">${escapeXml(title)}</text>
    <text x="${w/2}" y="${h*0.52}" text-anchor="middle" font-size="${Math.round(w*0.028)}" fill="${p.label}" font-style="italic">${escapeXml(subtitle)}</text>
  </g>
  <g font-family="'Courier New', monospace">
    <rect x="${w*0.35}" y="${h*0.78}" width="${w*0.3}" height="${h*0.06}" fill="${p.ink}"/>
    <text x="${w/2}" y="${h*0.822}" text-anchor="middle" font-size="${Math.round(w*0.022)}" font-weight="700" fill="${p.bg1}" letter-spacing="4">UKÁZKA</text>
  </g>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, ch => ({
    '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'
  }[ch]));
}

async function generate(entry, idx) {
  const p = palettes[idx % palettes.length];
  // Různé poměry, ať to v masonry vypadá živě
  const shapes = [
    { w: 1200, h: 900 },
    { w: 1200, h: 1500 },
    { w: 1200, h: 800 },
    { w: 1200, h: 1350 },
  ];
  const shape = shapes[idx % shapes.length];

  const bigSvg = Buffer.from(makeSvg({
    w: shape.w, h: shape.h, palette: p,
    title: entry.title, subtitle: entry.subtitle
  }));

  const filename = `demo-${String(idx + 1).padStart(2, '0')}.jpg`;
  const thumbName = `thumb-demo-${String(idx + 1).padStart(2, '0')}.webp`;

  await sharp(bigSvg).jpeg({ quality: 88 }).toFile(path.join(uploadsDir, filename));
  await sharp(bigSvg)
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(uploadsDir, thumbName));

  return { filename, thumbName };
}

async function main() {
  console.log('▸ Seedování demo obsahu…\n');

  // Ujistit se, že demo kategorie existují (byly nasázeny už v init-db)
  const catBySlug = {};
  db.prepare('SELECT * FROM categories').all().forEach(c => catBySlug[c.slug] = c);

  // Smazat případné dřívější demo fotky (soubory + DB záznamy)
  const previous = db.prepare("SELECT filename, thumb_filename FROM photos WHERE filename LIKE 'demo-%'").all();
  previous.forEach(row => {
    for (const name of [row.filename, row.thumb_filename]) {
      if (!name) continue;
      const p = path.join(uploadsDir, name);
      if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch (_) {} }
    }
  });
  db.prepare("DELETE FROM photos WHERE filename LIKE 'demo-%'").run();

  const insert = db.prepare(`
    INSERT INTO photos (filename, thumb_filename, title, description, category_id, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let created = 0;
  for (let i = 0; i < demos.length; i++) {
    const entry = demos[i];
    const cat = catBySlug[entry.slug];
    if (!cat) {
      console.warn(`  ⚠ kategorie '${entry.slug}' nenalezena, přeskočeno`);
      continue;
    }
    const { filename, thumbName } = await generate(entry, i);
    insert.run(
      filename, thumbName,
      entry.title,
      `Ukázková fotografie — sem přijde vaše skutečná realizace po předání webu.`,
      cat.id, i
    );
    console.log(`  ✓ ${filename}  ·  ${entry.title}  (${cat.name})`);
    created++;
  }

  console.log(`\n✓ Nasypáno ${created} demo fotek. Klient teď uvidí plnou galerii.\n`);
  console.log('  Odstranit demo obsah: smažte v adminu, nebo znovu spusťte s prázdnou DB.\n');
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
