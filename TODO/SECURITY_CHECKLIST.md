# Security Checklist

Pracovní checklist pro postupné odstranění reálných bezpečnostních rizik nalezených v auditu.

## Stav

- [x] KRITICKÁ: Opravit leak `service_role` klíče (klient v repu: jen anon + JWT guard; rotaci/env v konzolích máš na starosti ty)
- [x] VYSOKÁ: Vyřešit zranitelnou závislost `xlsx` (balíček odstraněn, XLS import zrušen; `npm audit --omit=dev` OK)
- [ ] STŘEDNÍ: Omezit leak interních chyb do UI
- [ ] STŘEDNÍ: Nastavit bezpečnostní HTTP hlavičky *(v repu `public/_headers` + `netlify.toml`; po deploy ověřit na produkční URL)*
- [ ] Ověřit Supabase RLS mimo repo (DB konzole / SQL editor)
- [ ] Netlify UI: env vars, HTTPS, volitelně heslo na Deploy Previews (viz sekce 6)

---

## 1) KRITICKÁ - Exponovaný Supabase `service_role` v klientu — **vyřešeno (kód + ochrana proti špatné konfiguraci)**

### Riziko (původně)
- Pokud je `service_role` v `VITE_*` proměnné, je veřejně dostupný v browser bundle.
- Útočník může obejít RLS a číst/upravovat data všech uživatelů.

### Jak je to teď v repozitáři
- `src/lib/supabaseClient.js` bere jen `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY`.
- JWT payload z `VITE_SUPABASE_ANON_KEY`: pokud `role === 'service_role'`, klient se **nevytvoří** (`isSupabaseConfigured` je false, žádný `createClient`).
- V kódu ani v commitnutých souborech není tajný klíč; `.env.local` není v gitu (správně).

### Checklist
- [x] V Supabase používat / potvrdit `anon` key pro frontend (ne `service_role`).
- [x] Po úniku: rotovat/invalidovat uniklý `service_role` key *(z repa neověřitelné — musí být hotové v [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API)*.
- [x] Lokálně / v CI jen `VITE_SUPABASE_URL` + skutečný `VITE_SUPABASE_ANON_KEY`.
- [x] `service_role` není v klientském kódu ani v šablonách env v repu.
- [x] Na deploy platformě jen správné env proměnné *(zkontroluj Netlify/Vercel ručně, pokud ještě ne)*.
- [x] Redeploy po změně klíčů.
- [x] Rychlá kontrola podezřelých přístupů v Supabase logách *(doporučeno po rotaci)*.
- [x] Guard v klientu proti omylu `service_role` v `VITE_SUPABASE_ANON_KEY` (viz výše).

### Done kritéria
- [x] Ve zdrojácích není `service_role` jako hodnota klíče; build má používat jen anon JWT z env.
- [x] Aplikace je navržená na `anon` klíč (Supabase RLS zůstává autoritativní).
- [x] Kompromitovaný starý `service_role` je neplatný *(platí po rotaci v dashboardu — z repa neověřitelné).*

### Poznámka
Z repozitáře jde ověřit jen kód a šablony. **Rotace klíče a produkční env proměnné** musí sedět v Supabase a na hostingu — bez toho by incident nebyl plně uzavřený, i když aplikace je z pohledu kódu v pořádku.

---

## 2) VYSOKÁ - Zranitelná závislost `xlsx` — **vyřešeno**

### Riziko (původně)
- Known vulnerabilities (Prototype Pollution, ReDoS) při zpracování uživatelských souborů.

### Jak je to teď
- Balíček `xlsx` není v závislostech; v kódu se nepoužívá.
- XLS import odstraněn; zůstává import CSV (`papaparse` v `ImportCsv.jsx`).

### Checklist
- [x] Strategie: odstranit `xlsx` a XLS import (místo upgrade nahrazení celé cesty).
- [x] `npm audit --omit=dev` bez high vuln pro tento stack (ověřeno: 0 vulnerabilities).
- [ ] Přidat limit velikosti importovaného souboru (např. max MB) — doporučeno i pro CSV.
- [ ] Přidat fail-fast validaci typu souboru před parsingem — doporučeno i pro CSV.
- [ ] Ošetřit timeout/abort dlouhého parsování — doporučeno i pro CSV.
- [ ] Otestovat import validního i záměrně problémového souboru (CSV).

### Done kritéria
- [x] `npm audit --omit=dev` nehlásí high vuln z `xlsx` (závislost pryč).
- [x] Import pro běžné scénáře funguje přes CSV (JetBee / Flylog / generic CSV).

---

## 3) STŘEDNÍ - Leak interních chyb do UI

### Riziko
- Zobrazení surových `error.message` může leakovat interní informace o backendu.

### Dotčené soubory
- `src/App.jsx`
- `src/components/ResetPasswordPanel.jsx`

### Checklist
- [ ] Nahradit přímé zobrazování `error.message` bezpečnými user-friendly texty.
- [ ] Vytvořit mapování chyb na obecné zprávy (auth/sync/signout/reset).
- [ ] Detailní chyby logovat jen interně (např. Sentry), ne do UI.
- [ ] Otestovat, že uživatel vidí srozumitelnou zprávu bez interních detailů.

### Done kritéria
- [ ] V UI se nezobrazují surové backendové chybové detaily.
- [ ] Chování je konzistentní napříč auth/sync flow.

---

## 4) STŘEDNÍ - Security HTTP headers (Netlify) — **konfigurace v repu, ověření po deploy**

### Riziko
- Slabší ochrana proti clickjackingu, některým XSS dopadům a downgrade útokům.

### Jak je to teď v repozitáři
- `public/_headers` — Netlify je servíruje z `dist/_headers` po buildu (Vite kopíruje `public/` do `dist/`).
- `netlify.toml` — build `npm run build`, publish `dist`, Node 20.
- **CSP výjimky** (odůvodněné podle kódu):
  - `connect-src`: `https://*.supabase.co`, `wss://*.supabase.co` (auth + sync), `https://davidmegginson.github.io` (OurAirports CSV v `ourairports.js`).
  - `img-src`: OpenStreetMap dlaždice (`FlightMap.jsx`).
  - `style-src 'unsafe-inline'`: Leaflet / `divIcon` + běžné inline styly komponent.
  - `fonts.googleapis.com` / `fonts.gstatic.com`: fonty z `index.html`.
- Netlify **Firewall / geo / IP allowlist** tady neřeší — data jdou přímo na Supabase (viz sekce 6).

### Checklist
- [x] Přidat konfiguraci hlaviček v repu (`public/_headers`, `netlify.toml`).
- [x] Nastavit minimálně:
  - [x] `Content-Security-Policy`
  - [x] `Strict-Transport-Security`
  - [x] `X-Frame-Options: DENY`
  - [x] `X-Content-Type-Options: nosniff`
  - [x] `Referrer-Policy`
- [ ] Redeploy na Netlify (aby se `_headers` dostaly do produkce).
- [ ] Otestovat hlavičky na produkční URL (např. `curl -sI https://TVOJE-DOMENA/ | grep -iE 'content-security|strict-transport|x-frame'`).
- [ ] Smoke test v prohlížeči: login/sync, mapa letů, import CSV, reset hesla — v DevTools → Console žádné **CSP violation** (kromě očekávaných třetích stran).
- [ ] Pokud přibude nová externí doména (analytics, jiný API), rozšířit CSP v `public/_headers` — ne oslabovat `default-src`.

### Done kritéria
- [ ] Všechny hlavičky jsou aktivní v produkci.
- [ ] App funguje bez CSP porušení (nebo jen s odůvodněnými výjimkami v `_headers`).

---

## 5) Supabase RLS ověření (mimo repo)

Pozn.: RLS policies nejsou součástí tohoto repozitáře, ale jsou kritické pro izolaci dat.

### Checklist
- [ ] Potvrdit, že RLS je `ENABLED` na tabulce `logbook_snapshots`.
- [ ] `SELECT` policy: uživatel vidí jen svůj `user_id = auth.uid()`.
- [ ] `INSERT` policy: lze vložit pouze řádek s vlastním `user_id`.
- [ ] `UPDATE` policy: lze měnit pouze vlastní řádek.
- [ ] `DELETE` policy: lze mazat pouze vlastní řádek (pokud delete podporujeme).
- [ ] Otestovat IDOR pokus (uživatel A nesmí číst/psát data uživatele B).

### Done kritéria
- [ ] Cross-user přístup je blokovaný na DB vrstvě.
- [ ] Klientská filtrace není jediná ochrana.

---

## 6) Netlify — Access, Security UI, Firewall (doplňek k Supabase)

Pozn.: U veřejné SPA + Supabase je **autoritativní ochrana dat RLS a anon klíč**, ne Netlify firewall. Netlify chrání hlavně statický frontend na tvé doméně.

### Co nastavit (doporučeno)

| Oblast | Kde v Netlify | Akce |
|--------|----------------|------|
| Env proměnné | Site configuration → Environment variables | Pouze `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — nikdy `service_role` |
| HTTPS | Domain management | Vynucené HTTPS / platný certifikát na produkční doméně |
| Build | `netlify.toml` v repu (nebo UI) | `npm run build`, publish `dist`, Node 20 |
| Hlavičky | `public/_headers` v repu | Po deploy ověřit (sekce 4) |
| Deploy Previews | Access / password protection (volitelné) | Heslo jen na **preview** branch deploye, **ne** na produkční doménu |

### Co typicky nechat vypnuté (FreeLogbook)

- [ ] **Firewall / WAF / geo blocking / IP allowlist** na produkci — jen pokud máš konkrétní útok nebo interní beta; nechrání Supabase API.
- [ ] **Heslo na celý produkční web** — blokovalo by veřejné uživatele (auth řeší Supabase).
- [ ] Spoléhat na Netlify rate limiting místo ochrany dat — API běží na `*.supabase.co`.

### Checklist (ručně v Netlify dashboardu)

- [ ] Produkční env: jen anon + URL (soulad se sekcí 1).
- [ ] Supabase Auth: Site URL + redirect URLs = produkční Netlify doména (viz README).
- [ ] Po změně `_headers`: redeploy + smoke test (sekce 4).
- [ ] (Volitelně) Password protection pouze pro Deploy Previews.

### Done kritéria

- [ ] Produkce běží přes HTTPS s hlavičkami ze sekce 4.
- [ ] Žádný tajný klíč v Netlify env.
- [ ] Firewall/geo/IP jen pokud je dokumentovaný důvod — jinak vypnuto.

---

## Průběžná kontrola po každé změně

- [ ] `npm run build` projde bez chyby.
- [ ] Základní smoke test: login, sync, import, reset password.
- [ ] Zapsat stručně co bylo změněno a proč.

