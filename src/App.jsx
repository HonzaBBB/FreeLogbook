import { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import FlightTable from './components/FlightTable';
import FlightForm from './components/FlightForm';
import ImportXLS from './components/ImportXLS';
import LogbookPrint from './components/LogbookPrint';
import Settings from './components/Settings';
import Help from './components/Help';
import { getFlights, saveFlights, addFlight, updateFlight, deleteFlight, getSettings, getFlightSignature } from './utils/storage';
import { ensureOurAirports, isOurAirportsReady } from './utils/ourairports';

const TABS = [
  { id: 'flights', label: 'Flights' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
];

export default function App() {
  const [flights, setFlights] = useState(() => getFlights());
  const [settings, setSettings] = useState(() => getSettings());
  const [activeTab, setActiveTab] = useState('flights');
  const [editFlight, setEditFlight] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [airportsLoading, setAirportsLoading] = useState(!isOurAirportsReady());

  useEffect(() => {
    if (isOurAirportsReady()) return;
    ensureOurAirports()
      .catch(() => {})
      .finally(() => setAirportsLoading(false));
  }, []);

  const refresh = useCallback(() => {
    setFlights(getFlights());
  }, []);

  function handleSaveFlight(flight) {
    if (editFlight) {
      setFlights(updateFlight(flight.id, flight));
      setEditFlight(null);
    } else {
      setFlights(addFlight(flight));
    }
    setShowForm(false);
  }

  function handleDeleteFlight(id) {
    setFlights(deleteFlight(id));
  }

  function handleEdit(flight) {
    setEditFlight(flight);
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

  if (showPrint) {
    return <LogbookPrint flights={flights} onClose={() => setShowPrint(false)} carryOver={settings.carryOver} />;
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="border-b border-navy-700 px-4 py-3 flex items-center justify-between">
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
          <nav className="flex gap-1 ml-6">
            {TABS.map((tab) => (
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
        <div className="flex gap-2">
          {activeTab === 'flights' && (
            <>
              <button
                onClick={() => { setShowForm(!showForm); setEditFlight(null); }}
                className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1.5 text-sm uppercase tracking-wider transition-colors"
              >
                {showForm ? 'Hide Form' : '+ Add Flight'}
              </button>
              <button
                onClick={() => setShowPrint(true)}
                className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm uppercase tracking-wider transition-colors"
              >
                Print Logbook
              </button>
            </>
          )}
        </div>
      </header>

      <main className="px-4 py-4 max-w-[1600px] mx-auto">
        {activeTab === 'flights' && (
          <>
            <Dashboard flights={flights} carryOver={settings.carryOver} />
            <ImportXLS
              onImport={handleImport}
              pilotName={settings.pilotName}
              primaryRole={settings.primaryRole || 'pic'}
              existingFlights={flights}
            />
            {showForm && (
              <FlightForm
                onSave={handleSaveFlight}
                editFlight={editFlight}
                onCancel={handleCancelEdit}
                pilotName={settings.pilotName}
                primaryRole={settings.primaryRole || 'pic'}
                existingFlights={flights}
              />
            )}
            <FlightTable
              flights={flights}
              onDelete={handleDeleteFlight}
              onEdit={handleEdit}
            />
          </>
        )}
        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
            onDataChange={refresh}
          />
        )}
        {activeTab === 'help' && <Help />}
      </main>
    </div>
  );
}
