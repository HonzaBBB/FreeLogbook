export default function Help({ t = (key) => key }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white tracking-wide">{t('help.getStarted')}</h2>

      <ol className="list-decimal list-inside space-y-4 text-gray-300 text-sm leading-relaxed">
        <li>
          <strong className="text-amber-400">{t('help.step1Title')}</strong> – {t('help.step1Text')}
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step2Title')}</strong> – {t('help.step2Text')}
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step3Title')}</strong> – {t('help.step3Text')}
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step4Title')}</strong> – {t('help.step4Text')}
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step5Title')}</strong> – {t('help.step5Text')}
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
            <li>{t('help.step5Bullet1')}</li>
            <li>{t('help.step5Bullet2')}</li>
          </ul>
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step6Title')}</strong> – {t('help.step6Text')}
        </li>
        <li>
          <strong className="text-amber-400">{t('help.step7Title')}</strong> – {t('help.step7Text')}
        </li>
      </ol>

      <section className="pt-4 border-t border-navy-700 space-y-2">
        <h2 className="text-xl font-semibold text-white tracking-wide">{t('help.dataTitle')}</h2>
        <div className="border border-amber-500/40 bg-amber-500/10 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            {t('help.testingNoticeTitle')}
          </h3>
          <p className="mt-1 text-sm text-amber-50/90 leading-relaxed">
            {t('help.testingNoticeText')}
          </p>
        </div>
        <p className="text-sm text-gray-400">
          {t('help.dataText1')}
        </p>
        <p className="text-sm text-gray-400">
          {t('help.dataText2a')}{' '}
          <span className="font-semibold">Settings → Export JSON Backup</span> and save it somewhere safe. To restore data
          {t('help.dataText2b')}{' '}
          <span className="font-semibold">Settings → Import JSON Backup</span> and select that file.
        </p>
      </section>

      <section className="pt-4 border-t border-navy-700 space-y-2">
        <p className="text-sm text-gray-400">
          {t('help.openSourceText')}
        </p>
        <p className="text-sm text-gray-500">
          {t('help.sourceCodeAt')}{' '}
          <a
            href="https://github.com/HonzaBBB/FreeLogbook"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            {t('help.githubRepo')}
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">
          {t('help.feedback')}{' '}
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
