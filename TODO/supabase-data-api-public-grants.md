# Supabase: Data API a schéma `public` (e-mail / oznámení)

Shrnutí oznámení Supabase (květen 2026) a co z toho plyne pro **Logbook** i obecně.

---

## Co se mění (shrnutí)

- Tabulky ve schématu **`public`** už **nebudou automaticky** viditelné přes **Data API** (PostgREST: `supabase-js`, HTTP na `/rest/v1/`, GraphQL).
- U **nových tabulek** v `public` bude potřeba **explicitní `GRANT`** pro role `anon`, `authenticated`, případně `service_role` — podle toho, kdo má přes API číst/zapisovat.
- **Existující tabulky** si podle oznámení **ponechají stávající granty**; změna se týká nových tabulek a nových projektů dřív, u starších projektů později vynuceně.

### Milníky

| Datum | Co platí |
|--------|----------|
| **30. 5. 2026** | Výchozí chování u **všech nových** projektů — nové tabulky v `public` bez grantu nejsou přes Data API dostupné. |
| **30. 10. 2026** | **Všechny existující** projekty — stejné pravidlo vynuceně i tam (nové tabulky / doplnění grantů podle nového modelu). |

---

## Jsme dotčeni? (Logbook)

**Ano, koncepčně:** aplikace používá `@supabase/supabase-js` a volá `.from('logbook_snapshots')` — to je Data API, ne čistě přímé Postgres připojení.

**Prakticky záleží na DB:**

- Pokud tabulka `logbook_snapshots` (a další) už v projektu existuje a má granty z doby, kdy Supabase je dávala automaticky, **do října 2026 na ní samotné nic „nespadne“** kvůli tomuto konkrétnímu oznámení (jde o **nové** tabulky a postupné sjednocení).
- Jakmile přidáš **novou** tabulku v `public` bez grantů (migrace, SQL v konzoli), po **30. 5.** u nového projektu / po **30. 10.** obecně můžeš dostat **chybu `42501`** (PostgREST; v chybové hlášce má být nápověda s přesným `GRANT`).

---

## Akce, které z toho vyplývají

1. **Zařadit granty do každého „create table“ toku**  
   Jakmile v repu přibudou migrace nebo dokumentovaný SQL pro sync tabulky (`logbook_snapshots` atd.), hned za `CREATE TABLE` přidat `GRANT` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + politiky — stejně jako doporučuje Supabase v mailu.

2. **Před 30. 10. 2026**  
   Projít v Supabase Dashboard / SQL editoru existující tabulky uživatelských dat: mají RLS + politiky + smysluplné granty? (To už máte částečně v `SECURITY_CHECKLIST.md`; tohle je doplněk kvůli novému výchozímu chování.)

3. **Při debugu API**  
   Pokud u nové tabulky uvidíš `42501`, nejdřív ověř granty, ne „proč nefunguje RLS“ — Supabase má vracet nápovědu s `GRANT`.

---

## Takeaways pro jiné / budoucí projekty

- **Šablona migrace:** `CREATE TABLE` → `GRANT` (`anon` / `authenticated` / `service_role` podle potřeby) → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`. Bez grantů už nepočítej, že „public = automaticky přes REST“.
- **Oddělení rolí:** `anon` typicky jen `SELECT` tam, kde to dává smysl; mutace často jen `authenticated`; backend/cron s `service_role` jen tam, kde musí — a **nikdy** do frontend env.
- **Ne-Data API stack:** Pokud aplikace jde **jen** přes přímé DB připojení (ORM na connection string), tohle konkrétní omezení Data API se jí netýká — ale většina Supabase + `supabase-js` aplikací Data API používá.
- **Dokumentace pro tým:** jeden „db onboarding“ snippet v repu (nebo v interní wiki) šetří opakování chyb 30. 10.

---

## Checklist (zkopíruj a odškrtávej)

### Obecné (každý nový Supabase projekt s Data API)

- [ ] V migracích / provisioning SQL je za každou novou tabulkou v `public` explicitní `GRANT` pro potřebné role.
- [ ] Zapnuté RLS (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`) na tabulkách s uživatelskými daty.
- [ ] Politiky odpovídají tomu, kdo má co číst/měnit (často `auth.uid()` = vlastní řádky).
- [ ] `service_role` není v klientských env proměnných (jen server / Edge Functions, pokud vůbec).

### Logbook (až bude / je tabulka sync)

- [ ] Tabulka `logbook_snapshots` má granty pro `authenticated` (min. `select`, `insert`, `update` podle `upsert`/load) a případně úzký `anon`, pokud by někdy šel číst bez přihlášení (u vás pravděpodobně ne).
- [ ] RLS na `logbook_snapshots` odpovídá „uživatel vidí/mění jen `user_id` = svůj účet“.
- [ ] Každá **nová** tabulka přidaná po 30. 5. 2026 (nový projekt) nebo před říjnem s vědomím říjnového termínu má v repu kompletní SQL včetně grantů.
- [ ] Po nasazení nové tabulky: rychlý test z aplikace (`select` / `upsert`) a případně kontrola chyby `42501` v logu.

### Kalendář

- [ ] **Do 30. 5. 2026:** mít návyk / šablonu migrace s granty (kvůli novým projektům).
- [ ] **Do 30. 10. 2026:** ověřit existující produkční projekt(y) — tabulky, RLS, granty — aby přechod nebyl překvapení.

---

## Reference (z mailu — ukázka grantů)

```sql
grant select on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;
```

Konkrétní práva uprav podle toho, co tabulka opravdu potřebuje (např. `anon` často vůbec ne).

---

*Poznámka: oficiální znění a přesné chování může Supabase ještě upřesnit — sleduj [Supabase changelog / docs](https://supabase.com/docs). Tento soubor je pracovní shrnutí z e-mailu a z kontextu repozitáře Logbook.*
