import { useState } from 'react';

export default function ResetPasswordPanel({ onSubmit, busy = false }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('Password must have at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      await onSubmit(password);
      setMessage('Password updated successfully.');
    } catch (error) {
      setMessage(error.message || 'Password update failed.');
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-navy-800 border border-navy-600 p-6 space-y-4">
        <h1 className="text-xl font-bold tracking-wide text-white">
          <span className="text-amber-400">FREE</span>LOGBOOK
        </h1>
        <p className="text-sm text-gray-400">Set your new password to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            required
            className="w-full bg-navy-900 border border-navy-600 text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={6}
            required
            className="w-full bg-navy-900 border border-navy-600 text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy-900 font-semibold px-4 py-2 text-sm uppercase tracking-wider transition-colors"
          >
            {busy ? 'Please wait...' : 'Set New Password'}
          </button>
        </form>

        {message && <p className="text-sm text-amber-300">{message}</p>}
      </div>
    </div>
  );
}
