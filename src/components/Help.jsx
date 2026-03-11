export default function Help() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white tracking-wide">Jak začít</h2>

      <ol className="list-decimal list-inside space-y-4 text-gray-300 text-sm leading-relaxed">
        <li>
          <strong className="text-amber-400">Nastav si jméno</strong> – v záložce Settings vyplň Pilot Name a ulož.
        </li>
        <li>
          <strong className="text-amber-400">Vyplň Previous Logbook Totals</strong> – pokud už máš předchozí hodiny z papírového/elektronického logbooku, zadej je do Settings. Tyto hodnoty se ti budou přičítat ke všem souhrnům.
        </li>
        <li>
          <strong className="text-amber-400">Import nebo ruční zápis</strong> – lety můžeš přidat buď:
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
            <li>importem XLS souboru z JetBee (v záložce Flights nahoře),</li>
            <li>nebo ručně přes tlačítko „+ Add Flight“.</li>
          </ul>
        </li>
      </ol>

      <section className="pt-4 border-t border-navy-700 space-y-2">
        <p className="text-sm text-gray-400">
          FREELOGBOOK je k dispozici zdarma pro používání i úpravy. Klidně si vezmi kód, uprav ho podle sebe
          nebo použij jen části, které se ti hodí.
        </p>
        <p className="text-sm text-gray-500">
          Zdrojový kód najdeš na{' '}
          <a
            href="https://github.com/HonzaBBB/FreeLogbook"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            mém GitHubu
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">
          Nápady na zlepšení? Napiš na{' '}
          <a
            href="mailto:janbrzak.prg@gmail.com"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            janbrzak.prg@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
