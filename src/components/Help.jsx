export default function Help() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white tracking-wide">How to get started</h2>

      <ol className="list-decimal list-inside space-y-4 text-gray-300 text-sm leading-relaxed">
        <li>
          <strong className="text-amber-400">Set your name</strong> – open the Settings tab, fill in Pilot Name and save it.
        </li>
        <li>
          <strong className="text-amber-400">Fill in Previous Logbook Totals</strong> – if you already have hours in a paper/electronic logbook, enter them in Settings. These values are added on top of all cumulative totals.
        </li>
        <li>
          <strong className="text-amber-400">Add flights</strong> – you can add flights either:
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
            <li>by importing an XLS file from JetBee (in the Flights tab),</li>
            <li>or manually using the “+ Add Flight” button.</li>
          </ul>
        </li>
        <li>
          <strong className="text-amber-400">Optional: choose your primary role</strong> – if you mostly fly as copilot/FO,
          you can change <span className="font-semibold">Settings → Primary role</span> from PIC to Copilot. This controls
          whether multi-pilot jet time (including JetBee imports) is counted as PIC time or Copilot time. If you always fly
          single-pilot or don&apos;t care about this split, you can simply ignore this setting.
        </li>
      </ol>

      <section className="pt-4 border-t border-navy-700 space-y-2">
        <h2 className="text-xl font-semibold text-white tracking-wide">Data & backups</h2>
        <p className="text-sm text-gray-400">
          All your flights and settings are stored locally in your browser (localStorage). There is no server and no
          account – if you clear browser data, you will lose the logbook unless you keep a backup.
        </p>
        <p className="text-sm text-gray-400">
          To keep a backup, go to <span className="font-semibold">Settings → Export JSON Backup</span> and save the file
          somewhere safe. To restore your data later (or on another device), use{' '}
          <span className="font-semibold">Settings → Import JSON Backup</span> and select that file.
        </p>
      </section>

      <section className="pt-4 border-t border-navy-700 space-y-2">
        <p className="text-sm text-gray-400">
          FREELOGBOOK is free to use and modify. Feel free to reuse the code, adapt it for your own needs,
          or take only the parts that are useful to you.
        </p>
        <p className="text-sm text-gray-500">
          Source code is available at{' '}
          <a
            href="https://github.com/HonzaBBB/FreeLogbook"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            my GitHub repository
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">
          Ideas or feedback? Drop me a line at{' '}
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
