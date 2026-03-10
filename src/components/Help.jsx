export default function Help() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white tracking-wide">Jak začít</h2>

      <ol className="list-decimal list-inside space-y-4 text-gray-300 text-sm leading-relaxed">
        <li>
          <strong className="text-amber-400">Nastavte si jméno</strong> – v záložce Settings vyplňte Pilot Name a uložte.
        </li>
        <li>
          <strong className="text-amber-400">Vyplňte Previous Logbook Totals</strong> – pokud už máte předchozí hodiny z papírového/elektronického logbooku, zadejte je do Settings. Tyto hodnoty se budou přičítat ke všem souhrnům.
        </li>
        <li>
          <strong className="text-amber-400">Import nebo ruční zápis</strong> – lety můžete přidat buď:
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
            <li>importem XLS souboru z JetBee (v záložce Flights nahoře),</li>
            <li>nebo ručně přes tlačítko „+ Add Flight“.</li>
          </ul>
        </li>
      </ol>

      <section className="pt-4 border-t border-navy-700">
        <p className="text-sm text-gray-500">
          Nápady na zlepšení? Napište na{' '}
          <a
            href="mailto:janbrzak.prg@gmail.com"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            janbrzak.prg@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
