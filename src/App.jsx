import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import FlightTable from './components/FlightTable';
import FlightForm from './components/FlightForm';
import ImportXLS from './components/ImportXLS';
import LogbookPrint from './components/LogbookPrint';
import Settings from './components/Settings';
import Help from './components/Help';
import FlightMap from './components/FlightMap';
import AuthPanel from './components/AuthPanel';
import ResetPasswordPanel from './components/ResetPasswordPanel';
import LandingPage from './components/LandingPage';
import PrivacyPolicy, { PRIVACY_POLICY_VERSION } from './components/PrivacyPolicy';
import { getFlights, saveFlights, addFlight, updateFlight, deleteFlight, getSettings, getFlightSignature, exportAllData } from './utils/storage';
import { ensureOurAirports, isOurAirportsReady } from './utils/ourairports';
import { parseDateDMY } from './utils/timeUtils';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { detectInitialLanguage, getText, normalizeLanguage } from './i18n';
import {
  getSession,
  onAuthStateChange,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  updatePassword,
  signOut,
  readCustomAirports,
  writeSnapshotToLocal,
  hasAnySnapshotData,
  loadCloudSnapshot,
  upsertCloudSnapshot,
} from './services/cloudSyncService';

export default function App() {
  const [flights, setFlights] = useState(() => getFlights());
  const [settings, setSettings] = useState(() => getSettings());
  const [activeTab, setActiveTab] = useState('flights');
  const [editFlight, setEditFlight] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [airportsLoading, setAirportsLoading] = useState(!isOurAirportsReady());
  const [session, setSession] = useState(null);
  const [authBusy, setAuthBusy] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [publicAuthMode, setPublicAuthMode] = useState('');
  const [showPublicPrivacy, setShowPublicPrivacy] = useState(false);
  const [privacyReturnTab, setPrivacyReturnTab] = useState('flights');
  const [locale, setLocale] = useState(() => normalizeLanguage(getSettings().language) || detectInitialLanguage());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileImport, setShowMobileImport] = useState(false);
  const [mapDatePreset, setMapDatePreset] = useState('all');
  const publicAuthPanelRef = useRef(null);

  const t = useCallback((key, fallback = '') => getText(locale, key, fallback), [locale]);
  const tabs = [
    { id: 'flights', label: t('menu.flights') },
    { id: 'map', label: t('menu.map') },
    { id: 'settings', label: t('menu.settings') },
    { id: 'help', label: t('menu.help') },
  ];

  const buildLocalSnapshot = useCallback(() => {
    const payload = JSON.parse(exportAllData());
    return {
      flights: payload.flights || [],
      settings: payload.settings || {},
      customAirports: payload.customAirports || {},
    };
  }, []);

  const syncToCloud = useCallback(async (nextFlights, nextSettings) => {
    if (!session?.user) return;
    try {
      setSyncStatus('Syncing...');
      await upsertCloudSnapshot(session.user.id, {
        flights: nextFlights,
        settings: nextSettings,
        customAirports: readCustomAirports(),
      });
      setSyncStatus('Synced');
    } catch (error) {
      setSyncStatus(`Sync error: ${error.message}`);
    }
  }, [session]);

  useEffect(() => {
    if (isOurAirportsReady()) return;
    ensureOurAirports()
      .catch(() => {})
      .finally(() => setAirportsLoading(false));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthBusy(false);
      return;
    }
    let subscription;
    getSession()
      .then((currentSession) => setSession(currentSession))
      .finally(() => setAuthBusy(false));
    subscription = onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }
      setSession(nextSession);
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function pullOrPushInitialSnapshot() {
      if (!session?.user) return;
      try {
        setSyncStatus('Loading cloud data...');
        const cloudSnapshot = await loadCloudSnapshot(session.user.id);
        if (cloudSnapshot && hasAnySnapshotData(cloudSnapshot)) {
          writeSnapshotToLocal(cloudSnapshot);
          setFlights(getFlights());
          const nextSettings = getSettings();
          setSettings(nextSettings);
          if (nextSettings?.language) {
            setLocale(normalizeLanguage(nextSettings.language) || detectInitialLanguage());
          }
          setSyncStatus('Cloud data loaded');
        } else {
          const localSnapshot = buildLocalSnapshot();
          await upsertCloudSnapshot(session.user.id, localSnapshot);
          setSyncStatus('Initial sync completed');
        }
      } catch (error) {
        setSyncStatus(`Cloud error: ${error.message}`);
      }
    }
    pullOrPushInitialSnapshot();
  }, [buildLocalSnapshot, session]);

  useEffect(() => {
    if (!session && publicAuthMode) {
      // Po kliknutí na přihlášení/registraci panel posuneme do viditelné části stránky.
      publicAuthPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [publicAuthMode, session]);

  const refresh = useCallback(() => {
    setFlights(getFlights());
    const nextSettings = getSettings();
    setSettings(nextSettings);
    if (nextSettings?.language) {
      setLocale(normalizeLanguage(nextSettings.language) || detectInitialLanguage());
    }
    const snapshot = JSON.parse(exportAllData());
    syncToCloud(snapshot.flights || [], snapshot.settings || {});
  }, [syncToCloud]);

  function handleSaveFlight(flight) {
    if (editFlight) {
      const nextFlights = updateFlight(flight.id, flight);
      setFlights(nextFlights);
      syncToCloud(nextFlights, settings);
      setEditFlight(null);
    } else {
      const nextFlights = addFlight(flight);
      setFlights(nextFlights);
      syncToCloud(nextFlights, settings);
    }
    setShowForm(false);
  }

  function handleDeleteFlight(id) {
    const nextFlights = deleteFlight(id);
    setFlights(nextFlights);
    syncToCloud(nextFlights, settings);
  }

  function handleEdit(flight) {
    setEditFlight(flight);
    setActiveTab('flights');
    setShowForm(true);
  }

  function handleCancelEdit() {
    setEditFlight(null);
    setShowForm(false);
  }

  function handleImport(newFlights) {
    const current = getFlights();
    const existingSigs = new Set(current.map(getFlightSignature));
    const toAdd = newFlights.filter((f) => !existingSigs.has(getFlightSignature(f)));
    const skipped = newFlights.length - toAdd.length;

    const merged = [...current, ...toAdd];
    merged.sort((a, b) => {
      const da = sortableDate(a);
      const db = sortableDate(b);
      return da - db;
    });
    saveFlights(merged);
    setFlights(merged);
    syncToCloud(merged, settings);

    if (skipped > 0) {
      window.alert(`Imported ${toAdd.length} flights. ${skipped} duplicate(s) skipped.`);
    }
  }

  function sortableDate(f) {
    if (!f.date) return 0;
    const parts = f.date.split('.');
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts.map(Number);
    const tp = (f.depTime || '0:00').split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, tp[0] || 0, tp[1] || 0)).getTime();
  }

  const filteredMapFlights = useMemo(() => {
    if (mapDatePreset === 'all') return flights;

    const now = new Date();
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let rangeStart = null;
    let rangeEnd = null;

    if (mapDatePreset === 'thisMonth') {
      // Celý aktuální kalendářní měsíc.
      rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
    } else if (mapDatePreset === 'previousMonth') {
      const firstDayCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      rangeStart = new Date(Date.UTC(firstDayCurrentMonth.getUTCFullYear(), firstDayCurrentMonth.getUTCMonth() - 1, 1));
      rangeEnd = new Date(Date.UTC(firstDayCurrentMonth.getUTCFullYear(), firstDayCurrentMonth.getUTCMonth(), 1) - 1);
    } else if (mapDatePreset === 'thisYear') {
      rangeStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      rangeEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1) - 1);
    } else {
      return flights;
    }

    return flights.filter((flight) => {
      const flightDate = parseDateDMY(flight.date);
      if (!flightDate) return false;
      return flightDate >= rangeStart && flightDate <= rangeEnd;
    });
  }, [flights, mapDatePreset]);

  if (showPrint) {
    return <LogbookPrint flights={flights} onClose={() => setShowPrint(false)} carryOver={settings.carryOver} t={t} />;
  }

  if (needsPasswordReset) {
    return (
      <ResetPasswordPanel
        busy={authBusy}
        onSubmit={async (newPassword) => {
          setAuthBusy(true);
          try {
            await updatePassword(newPassword);
            setNeedsPasswordReset(false);
            window.history.replaceState({}, document.title, '/');
            setSyncStatus('Password changed');
          } finally {
            setAuthBusy(false);
          }
        }}
      />
    );
  }

  if (!session) {
    return (
      <LandingPage
        t={t}
        onSignUp={() => {
          setShowPublicPrivacy(false);
          setPublicAuthMode('signup');
        }}
        onSignIn={() => {
          setShowPublicPrivacy(false);
          setPublicAuthMode('signin');
        }}
        onPrivacyClick={() => {
          setPublicAuthMode('');
          setShowPublicPrivacy(true);
        }}
      >
        {showPublicPrivacy && (
          <PrivacyPolicy
            locale={locale}
            onBack={() => setShowPublicPrivacy(false)}
          />
        )}
        {!showPublicPrivacy && publicAuthMode && (
          <section ref={publicAuthPanelRef} className="bg-navy-800 border border-navy-600 p-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-300 mb-3">
              {publicAuthMode === 'signup' ? t('landing.authTitleSignUp') : t('landing.authTitleSignIn')}
            </h2>
            <AuthPanel
              configured={isSupabaseConfigured}
              busy={authBusy}
              t={t}
              title={null}
              subtitle={t('landing.authSubtitle')}
              initialMode={publicAuthMode}
              privacyPolicyVersion={PRIVACY_POLICY_VERSION}
              onPrivacyClick={() => {
                setPublicAuthMode('');
                setShowPublicPrivacy(true);
              }}
              onSignIn={async (email, password) => {
                setAuthBusy(true);
                try {
                  await signInWithEmail(email, password);
                } finally {
                  setAuthBusy(false);
                }
              }}
              onSignUp={async (email, password, consentMetadata) => {
                setAuthBusy(true);
                try {
                  await signUpWithEmail(email, password, consentMetadata);
                } finally {
                  setAuthBusy(false);
                }
              }}
              onForgotPassword={async (email) => {
                const redirectTo = `${window.location.origin}/`;
                await requestPasswordReset(email, redirectTo);
              }}
            />
          </section>
        )}
      </LandingPage>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[430px] md:max-w-none">
      <header className="border-b border-navy-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-wide text-white">
            <span className="text-amber-400">FREE</span>LOGBOOK
          </h1>
          {airportsLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border border-gray-500 border-t-amber-400 rounded-full animate-spin" />
              <span>Loading airports DB...</span>
            </div>
          )}
            <nav className="hidden md:flex gap-1 ml-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-sm uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
            </nav>
          </div>
          <div className="flex gap-2 items-center">
            {syncStatus && (
              <div className="text-xs text-gray-500 hidden lg:flex items-center mr-1">
                {syncStatus}
              </div>
            )}
            <div className="text-xs text-gray-300 hidden md:flex items-center mr-2 max-w-[220px] truncate" title={session.user.email}>
              {t('app.signedInAs', `Signed in as ${session.user.email}`).replace('{email}', session.user.email)}
            </div>
            <button
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  setSyncStatus(`Sign out failed: ${error.message}`);
                }
              }}
              className="hidden md:block bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
            >
              {t('app.logOut')}
            </button>
            {activeTab === 'flights' && (
              <>
              <button
                onClick={() => { setShowForm(!showForm); setEditFlight(null); }}
                className="hidden md:block bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1.5 text-sm uppercase tracking-wider transition-colors"
              >
                {showForm ? t('app.hideForm') : t('app.addFlight')}
              </button>
              <button
                onClick={() => setShowPrint(true)}
                className="hidden md:block bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm uppercase tracking-wider transition-colors"
              >
                {t('app.printLogbook')}
              </button>
              </>
            )}
            <button
              onClick={() => setShowMobileMenu((prev) => !prev)}
              className="md:hidden bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
            >
              {t('app.menu', 'Menu')}
            </button>
          </div>
        </div>
        {activeTab === 'flights' && (
          <div className="md:hidden mt-3">
            <button
              onClick={() => {
                setActiveTab('flights');
                setEditFlight(null);
                setShowForm((prev) => !prev);
                setShowMobileMenu(false);
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-2 text-sm uppercase tracking-wider transition-colors"
            >
              {t('app.addFlight')}
            </button>
          </div>
        )}
      </header>

      {showMobileMenu && (
        <div className="md:hidden border-b border-navy-700 bg-navy-900 px-4 py-3">
          <div className="text-xs text-gray-400 mb-3">
            {t('app.signedInAs', `Signed in as ${session.user.email}`).replace('{email}', session.user.email)}
          </div>
          {syncStatus && <div className="text-xs text-gray-500 mb-3">{syncStatus}</div>}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => { setActiveTab('map'); setShowMobileMenu(false); }}
              className="bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('menu.map')}
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setShowMobileMenu(false); }}
              className="bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('menu.settings')}
            </button>
            <button
              onClick={() => { setActiveTab('help'); setShowMobileMenu(false); }}
              className="bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('menu.help')}
            </button>
            <button
              onClick={() => {
                setActiveTab('flights');
                setShowMobileImport((prev) => !prev);
                setShowMobileMenu(false);
              }}
              className="bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('import.importAll', 'Import')}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowPrint(true); setShowMobileMenu(false); }}
              className="flex-1 bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('app.printLogbook')}
            </button>
            <button
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  setSyncStatus(`Sign out failed: ${error.message}`);
                } finally {
                  setShowMobileMenu(false);
                }
              }}
              className="flex-1 bg-navy-800 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
            >
              {t('app.logOut')}
            </button>
          </div>
        </div>
      )}

      <main className="px-4 py-4 pb-24 md:pb-4 max-w-[1600px] mx-auto w-full">
        {activeTab === 'flights' && (
          <>
            {showForm && (
              <FlightForm
                onSave={handleSaveFlight}
                editFlight={editFlight}
                onCancel={handleCancelEdit}
                pilotName={settings.pilotName}
                primaryRole={settings.primaryRole || 'pic'}
                existingFlights={flights}
                t={t}
              />
            )}
            <Dashboard flights={flights} carryOver={settings.carryOver} t={t} />
            <div className="hidden md:block">
              <ImportXLS
                onImport={handleImport}
                pilotName={settings.pilotName}
                primaryRole={settings.primaryRole || 'pic'}
                existingFlights={flights}
                t={t}
              />
            </div>
            {showMobileImport && (
              <div className="md:hidden">
                <ImportXLS
                  onImport={handleImport}
                  pilotName={settings.pilotName}
                  primaryRole={settings.primaryRole || 'pic'}
                  existingFlights={flights}
                  t={t}
                />
              </div>
            )}
            <FlightTable
              flights={flights}
              onDelete={handleDeleteFlight}
              onEdit={handleEdit}
              t={t}
            />
          </>
        )}
        {activeTab === 'map' && (
          <>
            <section className="bg-navy-800 border border-navy-600 p-4 mb-3">
              <label htmlFor="map-date-preset" className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                {t('map.datePresetLabel', 'Date range')}
              </label>
              <select
                id="map-date-preset"
                value={mapDatePreset}
                onChange={(event) => setMapDatePreset(event.target.value)}
                className="w-full max-w-xs bg-navy-900 border border-navy-600 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="all">{t('map.presets.all', 'All data')}</option>
                <option value="thisMonth">{t('map.presets.thisMonth', 'This month')}</option>
                <option value="previousMonth">{t('map.presets.previousMonth', 'Previous month')}</option>
                <option value="thisYear">{t('map.presets.thisYear', 'This year')}</option>
              </select>
            </section>
            <FlightMap flights={filteredMapFlights} airportsReady={!airportsLoading} />
          </>
        )}
        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            locale={locale}
            t={t}
            onSettingsChange={(nextSettings) => {
              setSettings(nextSettings);
              if (nextSettings?.language) {
                setLocale(normalizeLanguage(nextSettings.language) || detectInitialLanguage());
              }
              syncToCloud(flights, nextSettings);
            }}
            onDataChange={refresh}
          />
        )}
        {activeTab === 'help' && <Help t={t} />}
        {activeTab === 'privacy' && (
          <PrivacyPolicy
            locale={locale}
            onBack={() => setActiveTab(privacyReturnTab)}
          />
        )}
      </main>

      {activeTab !== 'privacy' && (
        <footer className="px-4 pb-24 md:pb-6 text-center text-xs text-gray-500">
          <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
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
            <span className="hidden md:inline text-gray-600">|</span>
            <button
              type="button"
              onClick={() => {
                setPrivacyReturnTab(activeTab);
                setActiveTab('privacy');
              }}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              {t('privacy.linkLabel')}
            </button>
          </div>
        </footer>
      )}

      </div>

      {activeTab !== 'privacy' && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-navy-700 bg-navy-900/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[430px] px-3 py-2">
          <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('flights');
              setShowMobileMenu(false);
            }}
            className={`px-3 py-2 text-xs uppercase tracking-wider border ${
              activeTab === 'flights'
                ? 'border-amber-500 text-amber-400 bg-navy-800'
                : 'border-navy-600 text-gray-300'
            }`}
          >
            {t('menu.flights')}
          </button>
          <button
            onClick={() => {
              setActiveTab('flights');
              setEditFlight(null);
              setShowForm(true);
              setShowMobileMenu(false);
            }}
            className="px-3 py-2 text-xs uppercase tracking-wider bg-amber-500 text-navy-900 font-semibold"
          >
            {t('app.addFlight')}
          </button>
          <button
            onClick={() => setShowMobileMenu((prev) => !prev)}
            className={`px-3 py-2 text-xs uppercase tracking-wider border ${
              showMobileMenu
                ? 'border-amber-500 text-amber-400 bg-navy-800'
                : 'border-navy-600 text-gray-300'
            }`}
          >
            {t('app.menu', 'More')}
          </button>
        </div>
        </div>
      </nav>
      )}
    </div>
  );
}
