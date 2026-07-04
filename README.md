# Kuchyně Cíhovský — nový web s administrací

Kompletní web na míru s administračním rozhraním pro správu fotogalerie.
Postaveno na Node.js + Express + SQLite. Vše v jedné složce, žádná externí databáze.

> **📨 Chceš poslat návrh klientovi na email?** Postupuj podle [CLIENT-PREVIEW.md](CLIENT-PREVIEW.md).
> Za 5 minut máš veřejnou URL a znění mailu.

---

## Co web umí

**Veřejná část**
- **Domů** — hero, příběh dílny (od 1998), rozdělení nabídky, poslední realizace
- **Kuchyně** — hlavní činnost, galerie s filtrem podle sub-kategorií (moderní, rustikální, ostrůvkové…)
- **Dále nabízíme** — dveře, vestavěné skříně, nábytek na míru — stejná galerie mechanika, jiná sekce
- **O nás** — příběh, hodnoty, proces spolupráce
- **Kontakt** — formulář posílá **e-mail** provozovateli (přes SMTP) a zároveň zprávu ukládá do administrace jako záloha; obsahuje honeypot proti botům
- Odkazy na **Instagram a Facebook** v patičce
- Barevné ladění: **hnědá / béžová**, teplá krémová
- Responzivní design od 320 px, lightbox v galerii, masonry layout

**Administrace** (`/admin`)
- **Přihlášení** heslem (bcrypt, SQLite session store)
- **Přehled** — statistiky, poslední fotky a zprávy
- **Nahrát fotky** — drag & drop, hromadné nahrání, výběr kategorie (rozdělené na *Kuchyně* / *Dále nabízíme*), automatické WEBP náhledy
- **Fotogalerie** — editace názvu / popisu / kategorie, mazání, filtry podle sekce
- **Kategorie** — přidávání a mazání, každá kategorie patří do jedné ze sekcí (Kuchyně / Dále nabízíme)
- **Zprávy** — kompletní archiv zpráv z kontaktního formuláře (nepřečtené zvýrazněné)
- **Nastavení** — změna hesla

---

## Spuštění (poprvé)

Předpoklad: **Node.js 18 nebo novější**.

```bash
cd kuchyne-web
cp .env.example .env
# otevřete .env a nastavte hesla, kontakty, SMTP, social linky
npm install
npm run init-db
npm start
```

Web běží na **http://localhost:3000**
Administrace: **http://localhost:3000/admin/login**

---

## Konfigurace (.env)

```env
# Server
PORT=3000
SESSION_SECRET=nahodny-dlouhy-retezec

# Admin (výchozí přihlášení — po prvním loginu heslo změňte v Nastavení)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=silne-heslo

# Kontaktní údaje — zobrazují se v patičce a na kontaktní stránce
CONTACT_EMAIL=info@kuchyne-cihovsky.cz
CONTACT_PHONE=+420 000 000 000
CONTACT_ADDRESS=Provozovna, Česká republika
CONTACT_HOURS=Po–Pá 8:00–16:00
INSTAGRAM_URL=https://instagram.com/kuchyne_cihovsky
FACEBOOK_URL=https://facebook.com/kuchyne.cihovsky

# SMTP pro odesílání zpráv z kontaktního formuláře
# Pokud SMTP_HOST necháte prázdný, zprávy se jen ukládají do administrace.
SMTP_HOST=smtp.seznam.cz            # např. seznam / gmail / vlastní
SMTP_PORT=465
SMTP_SECURE=true                    # true pro port 465, false pro 587
SMTP_USER=info@kuchyne-cihovsky.cz
SMTP_PASS=heslo-nebo-app-password
MAIL_FROM="Web Kuchyně Cíhovský <info@kuchyne-cihovsky.cz>"
MAIL_TO=info@kuchyne-cihovsky.cz    # kam chodí poptávky
```

Pro Gmail použijte **App Password** (ne své hlavní heslo).

---

## Struktura projektu

```
kuchyne-web/
├── server.js               # Express aplikace
├── db.js                   # připojení k SQLite
├── package.json
├── .env.example            # šablona konfigurace
├── scripts/
│   └── init-db.js          # inicializace databáze + admin
├── routes/
│   ├── public.js           # veřejné stránky (/, /kuchyne, /dale-nabizime, ...)
│   └── admin.js            # administrace
├── middleware/
│   └── auth.js             # ochrana admin sekce
├── lib/
│   ├── mailer.js           # nodemailer wrapper (SMTP + fallback)
│   └── session-store.js    # SQLite session store (better-sqlite3)
├── views/                  # EJS šablony
│   ├── index.ejs           # domů
│   ├── section.ejs         # sdílená šablona pro Kuchyně i Dále nabízíme
│   ├── o-nas.ejs
│   ├── kontakt.ejs
│   ├── 404.ejs / 500.ejs
│   ├── partials/           # header, footer, head
│   └── admin/              # login, dashboard, upload, ...
├── public/
│   ├── css/
│   │   ├── style.css       # veřejný web
│   │   └── admin.css       # administrace
│   ├── js/
│   │   ├── main.js         # lightbox, mobilní menu
│   │   └── admin.js        # drag & drop upload
│   └── uploads/            # SEM se ukládají nahrané fotky
└── data/
    └── db.sqlite           # databáze (auto)
```

---

## Práce v administraci

### Přidání kategorie

1. **Administrace → Kategorie**
2. Vyberte **sekci** (Kuchyně / Dále nabízíme)
3. Zadejte název (např. „Retro kuchyně" nebo „Posuvné dveře")
4. Slug se vygeneruje automaticky, nebo si ho můžete přepsat

### Nahrávání fotek

1. **Administrace → Nahrát fotky**
2. Přetáhněte nebo vyberte soubory (klidně 20 najednou)
3. Zvolte kategorii z rozbaleného seznamu (rozdělené na Kuchyně / Dále nabízíme)
4. Případně vyplňte název a popis (platí pro všechny nahrávané)
5. Fotky se objeví na příslušné stránce webu (`/kuchyne` nebo `/dale-nabizime`)
6. Jednotlivé fotky lze později upravit / smazat v **Fotogalerie**

**Podporované formáty:** JPG, PNG, WEBP, AVIF
**Max. velikost:** 15 MB / soubor
**Automaticky se generují** WEBP náhledy 800×800 pro rychlé načítání galerie

### Kontaktní formulář

Když někdo odešle formulář:
- Zpráva se **uloží do administrace** (sekce Zprávy)
- Pokud je nastavený SMTP v `.env`, odešle se **e-mail** na `MAIL_TO`
- Pokud SMTP není nastavený, e-mail se neposílá — všechny zprávy najdete v administraci

Formulář má **honeypot** ochranu proti botům (skryté pole, které boti automaticky vyplňují).

---

## Nasazení na produkci

- Nastavte `SESSION_SECRET` v `.env` na dlouhý náhodný řetězec
- Změňte `ADMIN_PASSWORD` v `.env`
- Za reverzní proxy (nginx / Caddy) použijte HTTPS
- Server běží defaultně na portu **3000** — lze změnit v `.env` (`PORT=…`)
- Data (databáze + nahrané fotky) jsou ve složkách `data/` a `public/uploads/` —
  ty pravidelně **zálohujte**

Pro trvalý běh doporučuji `pm2`:

```bash
npm install -g pm2
pm2 start server.js --name kuchyne
pm2 save
pm2 startup
```

---

## Design

Design je "brutalist-elegant" v teplé béžovo-hnědé paletě:
- **Béžové pozadí** (#efe4d0), **espresso hnědá** ink (#2b1e12)
- **Saddle brown akcent** (#8b5a2b) na CTA, ikony, čísla
- Bold serifová displej-typografie **Fraunces**, tělo **Inter**
- Ostré hrany, sharp shadows, žádné rounded corners
- Full-bleed masonry galerie s hover lightbox

Barvy a fonty jdou snadno změnit v `public/css/style.css` v CSS proměnných na začátku souboru.
