const PRIVACY_POLICY_EFFECTIVE_DATE = '2026-05-07';
export const PRIVACY_POLICY_VERSION = `privacy-${PRIVACY_POLICY_EFFECTIVE_DATE}`;

const owner = {
  name: 'Jan Brzák',
  address: 'Felklova 2009, 252 63 Roztoky, Česká republika',
  ico: '09970878',
  email: 'janbrzak.prg@gmail.com',
};

const content = {
  cs: {
    title: 'Zásady ochrany osobních údajů',
    updated: 'Účinné od 7. 5. 2026',
    intro:
      'Tyto zásady popisují, jaké osobní údaje zpracováváme ve webové aplikaci FreeLogbook, proč je potřebujeme a jaká máš práva.',
    close: 'Zpět',
    sections: [
      {
        title: '1. Správce osobních údajů',
        paragraphs: [
          `${owner.name}, ${owner.address}, IČO: ${owner.ico}`,
          `Kontakt pro dotazy k osobním údajům: ${owner.email}`,
        ],
      },
      {
        title: '2. Jaké údaje zpracováváme',
        bullets: [
          'e-mailovou adresu a přihlašovací údaje potřebné pro vytvoření účtu a přihlášení,',
          'data logbooku, zejména záznamy o letech, nastavení pilota, vlastní letiště a součty hodin,',
          'technické údaje pro provoz aplikace, zejména IP adresu, user agent, čas přístupu a request metadata v rámci hostingu,',
          'data uložená lokálně v prohlížeči pomocí localStorage, aby aplikace fungovala rychle a byla dostupná i před synchronizací.',
        ],
      },
      {
        title: '3. Proč údaje zpracováváme',
        bullets: [
          'pro vytvoření a správu uživatelského účtu,',
          'pro uložení, zálohu a synchronizaci pilotního logbooku mezi zařízeními,',
          'pro export, import, tisk a další funkce aplikace,',
          'pro bezpečnost, provoz a základní statistiky návštěvnosti webu.',
        ],
      },
      {
        title: '4. Právní základ zpracování',
        paragraphs: [
          'Údaje potřebné pro fungování služby zpracováváme zejména za účelem plnění smlouvy nebo provedení opatření před jejím uzavřením podle čl. 6 odst. 1 písm. b GDPR. Technické logy a bezpečnostní údaje zpracováváme na základě oprávněného zájmu podle čl. 6 odst. 1 písm. f GDPR. Souhlas se zpracováním osobních údajů při registraci slouží jako potvrzení, že ses s těmito zásadami seznámil/a.',
        ],
      },
      {
        title: '5. Kde jsou data uložena',
        bullets: [
          'Supabase ukládá databázi aplikace v regionu Frankfurt, Německo. Data logbooku jsou tedy fyzicky uložena v EU.',
          'Netlify zajišťuje hosting webové aplikace. Netlify, Inc. je společnost z USA a může zpracovávat IP adresy a technická metadata přístupu v rámci globální CDN a access logů.',
          'Přenos osobních údajů mimo EU je krytý smluvními a právními mechanismy poskytovatelů, zejména DPA, Standard Contractual Clauses a případně EU-US Data Privacy Framework.',
        ],
      },
      {
        title: '6. Cookies a localStorage',
        paragraphs: [
          'FreeLogbook nepoužívá marketingové cookies ani analytické skripty typu Google Analytics. Pro přihlášení, lokální uložení logbooku a nastavení aplikace používáme nezbytné úložiště prohlížeče, zejména localStorage. Bez tohoto úložiště by aplikace nemohla správně fungovat.',
          'Návštěvnost lze sledovat přes serverové statistiky Netlify bez vkládání cookies do prohlížeče.',
        ],
      },
      {
        title: '7. Jak dlouho údaje uchováváme',
        paragraphs: [
          'Údaje uchováváme po dobu existence uživatelského účtu. Po žádosti o smazání účtu data odstraníme bez zbytečného odkladu, pokud nám zákon neukládá delší uchování. Technické logy uchovávají poskytovatelé hostingu podle svých bezpečnostních a provozních pravidel.',
        ],
      },
      {
        title: '8. Tvá práva',
        bullets: [
          'právo na přístup k osobním údajům,',
          'právo na opravu nepřesných údajů,',
          'právo na výmaz,',
          'právo na omezení zpracování,',
          'právo na přenositelnost dat,',
          'právo vznést námitku proti zpracování na základě oprávněného zájmu,',
          'právo podat stížnost u Úřadu pro ochranu osobních údajů.',
        ],
      },
      {
        title: '9. Export a smazání dat',
        paragraphs: [
          'Data logbooku si můžeš kdykoli exportovat v Nastavení pomocí JSON zálohy. Pokud chceš účet nebo data smazat, napiš na janbrzak.prg@gmail.com z e-mailu, kterým je účet registrovaný.',
        ],
      },
      {
        title: '10. Zpracovatelé',
        bullets: [
          'Supabase Inc. - autentizace, databáze a synchronizace dat; databáze je v regionu Frankfurt, Německo.',
          'Netlify, Inc. - hosting webové aplikace, CDN, access logy a případně serverové statistiky návštěvnosti.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Effective from May 7, 2026',
    intro:
      'This policy explains what personal data FreeLogbook processes, why it is needed, and what rights you have.',
    close: 'Back',
    sections: [
      {
        title: '1. Data controller',
        paragraphs: [
          `${owner.name}, ${owner.address}, Company ID: ${owner.ico}`,
          `Privacy contact: ${owner.email}`,
        ],
      },
      {
        title: '2. Personal data we process',
        bullets: [
          'email address and authentication data needed to create an account and sign in,',
          'logbook data such as flight records, pilot settings, custom airports, and hour totals,',
          'technical data needed to operate the service, such as IP address, user agent, request time, and request metadata,',
          'data stored locally in the browser using localStorage so the app can work quickly and before cloud sync completes.',
        ],
      },
      {
        title: '3. Why we process data',
        bullets: [
          'to create and manage user accounts,',
          'to store, back up, and sync pilot logbook data across devices,',
          'to provide import, export, print, and other application features,',
          'to maintain security, operate the website, and understand basic traffic statistics.',
        ],
      },
      {
        title: '4. Legal basis',
        paragraphs: [
          'Data required for the service is processed mainly for performance of a contract or pre-contractual steps under Article 6(1)(b) GDPR. Technical logs and security data are processed based on legitimate interest under Article 6(1)(f) GDPR. The registration consent confirms that you have read and accepted this policy.',
        ],
      },
      {
        title: '5. Where data is stored',
        bullets: [
          'Supabase stores the application database in the Frankfurt, Germany region. Logbook data is therefore physically stored in the EU.',
          'Netlify hosts the web application. Netlify, Inc. is a US company and may process IP addresses and technical request metadata through its global CDN and access logs.',
          'Transfers outside the EU are covered by provider legal mechanisms, especially DPA, Standard Contractual Clauses, and where applicable the EU-US Data Privacy Framework.',
        ],
      },
      {
        title: '6. Cookies and localStorage',
        paragraphs: [
          'FreeLogbook does not use marketing cookies or analytics scripts such as Google Analytics. For sign-in, local logbook storage, and app settings, we use necessary browser storage, mainly localStorage. The app cannot work properly without this storage.',
          'Traffic can be measured through Netlify server-side analytics without placing analytics cookies in the browser.',
        ],
      },
      {
        title: '7. Retention',
        paragraphs: [
          'We keep data for as long as the user account exists. After an account deletion request, data is deleted without undue delay unless law requires longer retention. Technical logs are retained by hosting providers according to their security and operational rules.',
        ],
      },
      {
        title: '8. Your rights',
        bullets: [
          'right of access,',
          'right to rectification,',
          'right to erasure,',
          'right to restriction of processing,',
          'right to data portability,',
          'right to object to processing based on legitimate interest,',
          'right to lodge a complaint with the Czech Data Protection Authority.',
        ],
      },
      {
        title: '9. Export and deletion',
        paragraphs: [
          'You can export your logbook data anytime in Settings using the JSON backup. To delete your account or data, contact janbrzak.prg@gmail.com from the email address used for registration.',
        ],
      },
      {
        title: '10. Processors',
        bullets: [
          'Supabase Inc. - authentication, database, and data sync; database region Frankfurt, Germany.',
          'Netlify, Inc. - web hosting, CDN, access logs, and optional server-side traffic analytics.',
        ],
      },
    ],
  },
};

export default function PrivacyPolicy({ locale = 'en', onBack }) {
  const policy = content[locale === 'cs' ? 'cs' : 'en'];

  return (
    <section className="bg-navy-800 border border-navy-600 p-5 md:p-6 text-gray-300">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400 mb-2">FreeLogbook</p>
          <h1 className="text-2xl font-bold text-white">{policy.title}</h1>
          <p className="text-xs text-gray-500 mt-1">{policy.updated}</p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="self-start bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm uppercase tracking-wider transition-colors"
          >
            {policy.close}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-300 mb-6 max-w-3xl">{policy.intro}</p>

      <div className="space-y-5">
        {policy.sections.map((section) => (
          <article key={section.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-100 mb-2">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-sm text-gray-400 mb-2 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-400 leading-relaxed">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {onBack && (
        <div className="mt-8 text-center text-xs text-gray-500">
          <button
            type="button"
            onClick={onBack}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {policy.close}
          </button>
        </div>
      )}
    </section>
  );
}
