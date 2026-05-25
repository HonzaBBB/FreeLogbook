# Checklist: Supabase auth e-maily přes Resend (Lfeelogbook)

Cíl: transakční maily (signup, reset hesla…) posílat přes **Resend**, v hlavičce jako **Lfeelogbook**, s vlastní šablonou v Supabase — ne výchozí „Supabase Auth“.

Doména je u **Wedosu**; schránku mailu tam nemusíš mít — stačí DNS záznamy pro ověření domény u Resend.

---

## 1) Resend — účet a doména

- [ ] Účet na [Resend](https://resend.com) je založený (hotovo).
- [ ] V Resend přidej **Domain** → zadej svoji doménu (např. `tvoje-domena.cz`).
- [ ] Resend ukáže DNS záznamy (**SPF**, **DKIM**, případně další). Bez ověření domény hrozí spam nebo zákaz odesílání.

### DNS u Wedosu

- [ ] Ve **Wedos administraci** otevři DNS záznamy pro danou doménu (správa domény → DNS / DNS záznamy — přesný název záleží na UI Wedosu).
- [ ] Zkopíruj z Resend do DNS **přesně** podle jejich návodu (typicky TXT pro SPF/DKIM, někdy CNAME).
- [ ] Po uložení počkej na propagaci (často minuty až hodiny; Resend ukáže stav **Verified**).

### Volitelně

- [ ] **DMARC** (TXT na `_dmarc`) — zvyšuje důvěru u příjemců; Resend často ukáže doporučení nebo odkaz na návod.

---

## 2) Resend — SMTP údaje pro Supabase

Supabase potřebuje **Custom SMTP** (ne jen API klíč do aplikace).

- [ ] V Resend vytvoř **API Key** s oprávněním k odesílání (schovej si ho — zobrazí se jednou).
- [ ] V dokumentaci Resend ověř aktuální **SMTP** parametry (mění se zřídka). Typicky:
  - **Host:** `smtp.resend.com`
  - **Port:** `465` (SSL) nebo `587` (STARTTLS)
  - **Username:** `resend`
  - **Password:** tvůj **API key** (začíná často `re_…`)
- [ ] **From e-mail** musí používat **ověřenou doménu**, např. `noreply@tvoje-domena.cz` (nebo kontakt@… — jak nastavíš v Resend / šablonách).

---

## 3) Supabase — Custom SMTP

V **Supabase Dashboard** projektu:

- [ ] **Project Settings** → **Authentication** (nebo sekce související s e-maily / SMTP — záleží na verzi UI).
- [ ] Zapni / vyplň **Custom SMTP**:
  - host, port, uživatelské jméno, heslo (API key od Resend),
  - **Sender email** = adresa z ověřené domény,
  - **Sender name** = např. `Lfeelogbook`.
- [ ] Ulož a pokud Supabase nabízí „Send test email“, pošli zkoušku.

---

## 4) Supabase — šablony e-mailů a branding

- [ ] **Authentication** → **Email templates** (název se může mírně lišit).
- [ ] Uprav šablony, které používáš, minimálně **Confirm signup** (a případně Magic link, Reset password, Change email).
  - **Subject:** např. „Potvrď registraci — Lfeelogbook“.
  - **Tělo:** vlastní text; pokud jde o HTML, přidej jednoduchý layout, patičku s názvem aplikace.
- [ ] Nevymaž proměnné pro odkazy — Supabase je potřebuje (např. odkaz na potvrzení). V editoru šablony je obvykle nápověda k dostupným proměnným.

---

## 5) Supabase — URL a přesměrování

- [ ] **Authentication** → **URL Configuration**: **Site URL** = adresa nasazené aplikace (nebo lokální URL pro vývoj, podle tvého nastavení).
- [ ] **Redirect URLs** obsahují všechny adresy, kam smí Auth přesměrovat po kliknutí v mailu (včetně `http://localhost:…` pro dev, pokud ho používáš).

---

## 6) Ověření koncem konců

- [ ] Zkus **novou registraci** testovacím e-mailem → mail přijde od **Lfeelogbook** / tvé domény, ne „Supabase Auth“.
- [ ] Klikni na odkaz v mailu → účet se potvrdí a jsi přesměrovaný na správnou URL.
- [ ] Zkontroluj složku spam u různých poskytatelů (Seznam, Gmail); pokud padá do spamu, doladit DMARC/obsah šablony a ověřit, že doména je v Resend **Verified**.

---

## Rychlý odkaz — co jsme vyřešili konceptem

| Téma | Řešení |
|------|--------|
| Hezčí mail + text „Lfeelogbook“ | Úprava šablon v Supabase + **Sender name** u SMTP |
| „Od koho“ mail vypadá profesionálně | **Custom SMTP** (Resend) + ověřená doména |
| Doména jen u Wedosu bez mailboxu | Stačí **DNS záznamy** pro Resend u Wedosu |

---

*Poslední aktualizace: květen 2026. SMTP údaje Resend vždy ověř v jejich aktuální dokumentaci.*
