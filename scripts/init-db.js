#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    section TEXT NOT NULL DEFAULT 'kuchyne',
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    thumb_filename TEXT,
    title TEXT,
    description TEXT,
    category_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure section column exists on older installs
const catCols = db.prepare("PRAGMA table_info(categories)").all().map(c => c.name);
if (!catCols.includes('section')) {
  db.exec("ALTER TABLE categories ADD COLUMN section TEXT NOT NULL DEFAULT 'kuchyne'");
  console.log('✓ Přidán sloupec section do categories');
}

// Seed default categories
const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (catCount === 0) {
  const insert = db.prepare(
    'INSERT INTO categories (slug, name, description, section, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  // Kuchyně
  insert.run('moderni', 'Moderní kuchyně', 'Čisté linie, minimalistický design', 'kuchyne', 1);
  insert.run('rustikalni', 'Rustikální kuchyně', 'Přírodní materiály a tradiční řemeslo', 'kuchyne', 2);
  insert.run('ostruvkove', 'Ostrůvkové kuchyně', 'Kuchyně s pracovním ostrůvkem', 'kuchyne', 3);

  // Dále nabízíme
  insert.run('dvere', 'Dveře na míru', 'Interiérové dveře a zárubně', 'ostatni', 1);
  insert.run('vestavene-skrine', 'Vestavěné skříně', 'Šatny a úložné prostory', 'ostatni', 2);
  insert.run('nabytek', 'Nábytek na míru', 'Komody, knihovny, dětské pokoje', 'ostatni', 3);
  console.log('✓ Vytvořeny výchozí kategorie (Kuchyně + Dále nabízíme)');
}

// Create / update admin — heslo se vždy synchronizuje z env vars
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const hash = bcrypt.hashSync(password, 12);
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (!existing) {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`✓ Vytvořen admin účet — přihlašovací jméno: ${username}`);
} else {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log(`✓ Aktualizováno heslo admina '${username}' z ADMIN_PASSWORD env`);
}
console.log(`  Heslo: ${password}`);
console.log('  DŮLEŽITÉ: pro produkci nastavte ADMIN_PASSWORD v .env nebo v Render dashboardu.');

db.close();
console.log('✓ Databáze připravena');
