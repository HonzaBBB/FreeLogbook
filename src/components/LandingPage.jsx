export default function LandingPage({ t, onSignUp, onSignIn, onPrivacyClick, children }) {
  const features = [
    {
      title: t('landing.featureOneTitle'),
      text: t('landing.featureOneText'),
    },
    {
      title: t('landing.featureTwoTitle'),
      text: t('landing.featureTwoText'),
    },
    {
      title: t('landing.featureThreeTitle'),
      text: t('landing.featureThreeText'),
    },
  ];

  const steps = [t('landing.stepOne'), t('landing.stepTwo'), t('landing.stepThree')];

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <section className="bg-navy-800 border border-navy-600 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400 mb-3">{t('landing.badge')}</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight max-w-4xl">{t('landing.title')}</h1>
          <p className="text-sm md:text-base text-gray-300 mt-4 max-w-3xl">{t('landing.subtitle')}</p>
          <div className="mt-5 max-w-3xl border border-amber-500/40 bg-amber-500/10 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              {t('landing.testingNoticeTitle')}
            </h2>
            <p className="mt-2 text-sm text-amber-50/90 leading-relaxed">
              {t('landing.testingNoticeText')}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onSignUp}
              className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-5 py-2 text-sm uppercase tracking-wider transition-colors"
            >
              {t('landing.primaryCta')}
            </button>
            <button
              onClick={onSignIn}
              className="bg-navy-700 border border-navy-500 hover:border-amber-500 text-white px-5 py-2 text-sm uppercase tracking-wider transition-colors"
            >
              {t('landing.secondaryCta')}
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <article key={feature.title} className="bg-navy-800 border border-navy-600 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">{feature.title}</h2>
              <p className="text-sm text-gray-400 mt-2">{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="bg-navy-800 border border-navy-600 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200 mb-3">{t('landing.stepsTitle')}</h2>
          <ol className="grid md:grid-cols-3 gap-3">
            {steps.map((step, index) => (
              <li key={step} className="bg-navy-900 border border-navy-700 px-3 py-3 text-sm text-gray-300">
                <span className="text-amber-400 mr-2 font-semibold">0{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-navy-800 border border-navy-600 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-300">{t('landing.mobileAppTitle')}</h2>
          <p className="text-sm text-gray-300 mt-2">{t('landing.mobileAppText')}</p>
        </section>

        {children}

        <footer className="text-center text-xs text-gray-500 space-x-2">
          <button
            type="button"
            onClick={onPrivacyClick}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {t('privacy.linkLabel')}
          </button>
          <span>|</span>
          <span>
            {t('landing.footerPrefix')}{' '}
            <a
              href={t('landing.footerUrl')}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              {t('landing.footerLabel')}
            </a>
          </span>
        </footer>
      </main>
    </div>
  );
}
