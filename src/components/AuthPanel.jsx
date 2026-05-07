import { useState } from 'react';

export default function AuthPanel({
  onSignIn,
  onSignUp,
  onForgotPassword,
  busy = false,
  configured = true,
  initialMode = 'signin',
  t = (key) => key,
  title,
  subtitle,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setMessage(t('auth.signUpSuccess'));
      }
    } catch (error) {
      setMessage(formatAuthMessage(error));
    }
  }

  async function handleForgotPassword() {
    setMessage('');
    if (!email.trim()) {
      setMessage(t('auth.enterEmailFirst'));
      return;
    }
    try {
      await onForgotPassword(email.trim());
      setMessage(t('auth.resetSent'));
    } catch (error) {
      setMessage(formatAuthMessage(error, 'Password reset failed.'));
    }
  }

  function formatAuthMessage(error, fallback = 'Authentication failed.') {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many attempts. Try again in a few minutes or use another email.';
    }
    return error?.message || fallback;
  }

  return (
    <div className="flex items-center justify-center p-1">
      <div className="w-full max-w-md bg-navy-800 border border-navy-600 p-6 space-y-4">
        <h1 className="text-xl font-bold tracking-wide text-white">
          {title || (
            <>
              <span className="text-amber-400">FREE</span>LOGBOOK
            </>
          )}
        </h1>
        <p className="text-sm text-gray-400">
          {subtitle || t('auth.panelSubtitle')}
        </p>

        {!configured && (
          <p className="text-sm text-red-300">
            {t('auth.notConfigured')}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`px-3 py-1 text-sm uppercase tracking-wider ${
              mode === 'signin' ? 'text-amber-400 border-b border-amber-400' : 'text-gray-400'
            }`}
          >
            {t('auth.signIn')}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-3 py-1 text-sm uppercase tracking-wider ${
              mode === 'signup' ? 'text-amber-400 border-b border-amber-400' : 'text-gray-400'
            }`}
          >
            {t('auth.signUp')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            className="w-full bg-navy-900 border border-navy-600 text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            minLength={6}
            required
            className="w-full bg-navy-900 border border-navy-600 text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy-900 font-semibold px-4 py-2 text-sm uppercase tracking-wider transition-colors"
          >
            {busy ? t('auth.pleaseWait') : mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
          </button>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy || !configured}
              className="w-full bg-navy-700 border border-navy-600 hover:border-amber-500 disabled:opacity-50 text-white px-4 py-2 text-sm uppercase tracking-wider transition-colors"
            >
              {t('auth.forgotPassword')}
            </button>
          )}
        </form>

        {message && <p className="text-sm text-amber-300">{message}</p>}
      </div>
    </div>
  );
}
