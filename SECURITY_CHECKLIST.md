# Security Checklist

Pracovní checklist pro postupné odstranění reálných bezpečnostních rizik nalezených v auditu.

## Stav

- [~] KRITICKÁ: Opravit leak `service_role` klíče (rozpracováno)
- [ ] VYSOKÁ: Vyřešit zranitelnou závislost `xlsx`
- [ ] STŘEDNÍ: Omezit leak interních chyb do UI
- [ ] STŘEDNÍ: Nastavit bezpečnostní HTTP hlavičky
- [ ] Ověřit Supabase RLS mimo repo (DB konzole / SQL editor)

---

## 1) KRITICKÁ - Exponovaný Supabase `service_role` v klientu

### Riziko
- Pokud je `service_role` v `VITE_*` proměnné, je veřejně dostupný v browser bundle.
- Útočník může obejít RLS a číst/upravovat data všech uživatelů.

### Dotčené soubory
- `.env.local`
- `src/lib/supabaseClient.js`

### Checklist
- [ ] V Supabase vytvořit nový `anon` key (nebo potvrdit správný existující).
- [ ] Okamžitě rotovat/invalidovat uniklý `service_role` key.
- [x] Do `.env.local` dát pouze `VITE_SUPABASE_URL` + skutečný `VITE_SUPABASE_ANON_KEY`.
- [x] Ověřit, že `service_role` není nikde v klientských env (`VITE_*`) ani v kódu.
- [ ] Zkontrolovat deploy platformu (Netlify/Vercel) a nahradit staré klíče.
- [ ] Provést redeploy aplikace.
- [ ] Udělat rychlou kontrolu podezřelých přístupů v Supabase logách.
- [x] Přidat guard v klientu: pokud je v `VITE_SUPABASE_ANON_KEY` detekován `service_role`, Supabase klient se neinicializuje.

### Done kritéria
- [ ] V klientu není žádný `service_role` key.
- [ ] Aplikace funguje se `anon` klíčem.
- [ ] Starý kompromitovaný klíč je neplatný.

---

## 2) VYSOKÁ - Zranitelná závislost `xlsx`

### Riziko
- Known vulnerabilities (Prototype Pollution, ReDoS) při zpracování uživatelských souborů.

### Dotčené soubory
- `package.json`
- `src/components/ImportXLS.jsx`

### Checklist
- [ ] Rozhodnout strategii: upgrade/nahrazení `xlsx`.
- [ ] Pokud bezpečná verze není dostupná, nahradit knihovnu alternativou.
- [ ] Přidat limit velikosti importovaného souboru (např. max MB).
- [ ] Přidat fail-fast validaci typu souboru před parsingem.
- [ ] Ošetřit timeout/abort dlouhého parsování.
- [ ] Otestovat import validního i záměrně problémového souboru.
- [ ] Spustit `npm audit --omit=dev` a potvrdit odstranění high vuln.

### Done kritéria
- [ ] `npm audit --omit=dev` nehlásí high vuln pro import stack.
- [ ] Import stále funguje pro běžné scénáře.

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

## 4) STŘEDNÍ - Chybějící security HTTP headers

### Riziko
- Slabší ochrana proti clickjackingu, některým XSS dopadům a downgrade útokům.

### Dotčené části
- Hosting konfigurace (v repu aktuálně není `netlify.toml` ani `_headers`).

### Checklist
- [ ] Přidat konfiguraci bezpečnostních hlaviček na hostingu.
- [ ] Nastavit minimálně:
  - [ ] `Content-Security-Policy`
  - [ ] `Strict-Transport-Security`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `Referrer-Policy`
- [ ] Otestovat hlavičky na produkční URL.
- [ ] U CSP doladit výjimky tak, aby aplikace fungovala bez oslabení politiky.

### Done kritéria
- [ ] Všechny hlavičky jsou aktivní v produkci.
- [ ] App funguje bez CSP porušení (nebo jen s odůvodněnými výjimkami).

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

## Průběžná kontrola po každé změně

- [ ] `npm run build` projde bez chyby.
- [ ] Základní smoke test: login, sync, import, reset password.
- [ ] Zapsat stručně co bylo změněno a proč.

