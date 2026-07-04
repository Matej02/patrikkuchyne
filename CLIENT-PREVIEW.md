# Poslání návrhu klientovi — workflow

Tento dokument popisuje, jak dostat návrh online (veřejná URL), aby si to klient
mohl v pohodě prokliknout z e-mailu.

---

## Co dostane klient

- **Plnou funkční verzi webu** — 5 stránek, funguje navigace, mobil, formulář
- **Galerii se 12 ukázkovými fotkami** — béžové placeholdery s popisem realizace a
  jasným označením *UKÁZKA*, aby klient hned viděl, kde budou jeho fotky
- **Přístup do administrace**, kde si může sám vyzkoušet nahrání fotky, mazání, editaci
- **Kontaktní formulář** — funguje, zprávy se ukládají do administrace
  (na produkci pak zapneme Resend a chodí přímo na e-mail)

---

## Rychlé nasazení na Render.com (5 minut, zdarma)

Render.com má free tier přímo pro Node.js aplikace. Web usne po 15 minutách nečinnosti
a při dalším requestu se probudí (~30 sekund). Pro klientský preview naprosto stačí.

### 1) Zaregistruj se na render.com

Můžeš přes GitHub — je to nejrychlejší.

### 2) Push kód do (nového nebo existujícího) GitHub repa

```bash
cd ~/Desktop/patrik/kuchyne-web
git init
git add .
git commit -m "Initial commit — Kuchyně Čihovský web"
# Vytvoř na github.com nový repo, pak:
git remote add origin git@github.com:TVUJ-USER/kuchyne-cihovsky.git
git branch -M main
git push -u origin main
```

### 3) Deploy na Render

1. Na Renderu klikni **New +** → **Web Service**
2. Vyber svůj GitHub repo `kuchyne-cihovsky`
3. Render sám detekuje `render.yaml` a předvyplní všechno — jen potvrď
4. Klikni **Create Web Service**
5. Počkej 2–3 minuty, dokud běží první build (npm install + init-db + seed-demo)

### 4) Získej URL

Po deployi budeš mít URL typu `https://kuchyne-cihovsky.onrender.com`.

**Přihlašovací údaje do administrace** (nastaveny v `render.yaml`):
- **Jméno:** `admin`
- **Heslo:** `kuchyne2026`

⚠ Po předání klientovi si heslo změň v `render.yaml`, nebo mu ho ještě před nasazením
uprav — klient s ním pak zachází sám.

---

## Alternativa: dočasný tunel z tvého počítače (2 minuty, zdarma)

Pokud nechceš zakládat GitHub repo a chceš rychlý dočasný odkaz na 24 hodin:

```bash
# Terminal 1 — spusť lokálně web
cd ~/Desktop/patrik/kuchyne-web
npm run seed-demo   # pokud jsi ještě nespustil
npm start

# Terminal 2 — pusť tunel
npx localtunnel --port 3000
# nebo alternativně:
# npx ngrok http 3000
```

Localtunnel vypíše veřejnou URL typu `https://xxx.loca.lt`.
Nevýhoda: web funguje jen dokud běží tvůj počítač a Terminal.

Doporučuju spíš Render — je stabilní, klient se může vracet a nemusíš mít zapnutý PC.

---

## Znění mailu klientovi (návrh, uprav podle sebe)

```
Předmět: Návrh nového webu Kuchyně Čihovský — k prohlédnutí

Dobrý den,

posílám první verzi nového webu. Můžete si vše prokliknout na tomto odkazu:

  → https://kuchyne-cihovsky.onrender.com

Fotky v galerii jsou zatím ukázkové placeholdery — na finálním webu budou
Vaše skutečné realizace. Klidně si to prohlédněte na mobilu i na počítači.

Do administrace pro správu fotek se přihlásíte zde:

  → https://kuchyne-cihovsky.onrender.com/admin/login
  Jméno: admin
  Heslo: kuchyne2026

V administraci si můžete zkusit nahrát libovolnou fotku, přiřadit ji ke kategorii
a smazat. Přesně takhle bude vypadat správa Vaší galerie.

Co byste chtěli změnit, přidat nebo upravit? Rád si zavoláme.

Zdraví,
Patrik
```

---

## Až klient odsouhlasí návrh

1. **Vyčistit demo obsah** — v administraci smazat všech 12 ukázkových fotek,
   nebo přes SQLite: `DELETE FROM photos WHERE filename LIKE 'demo-%'`
2. **Rozhodnout hosting** — Wedos VPS (Node.js) nebo přepsat na PHP pro sdílený
   hosting (viz [README.md](README.md))
3. **Zapnout Resend** — vyplnit `RESEND_API_KEY` v `.env`, verifikovat doménu,
   nastavit `MAIL_FROM` na adresu z verifikované domény
4. **Změnit admin heslo** klientovi na něco, co si zvolí sám
5. **Napojit skutečnou doménu** kuchyne-cihovsky.cz na hosting

---

## Časté otázky klienta

**„Web se pomalu načítá poprvé"** — Render free tier uspí web po 15 min. nečinnosti,
první request ho probudí (~30s). Na produkci u Wedosu tohle nebude.

**„Formulář odeslal, kam to jde?"** — Zpráva se uložila do administrace (sekce Zprávy).
Na produkci s Resendem půjde i na e-mail info@kuchyne-cihovsky.cz.

**„Můžu si to sám naprogramovat / stáhnout?"** — Klidně, celý kód je ve složce
`kuchyne-cihovsky` na GitHubu. Ale doporučujeme, ať to nasadíme my.
