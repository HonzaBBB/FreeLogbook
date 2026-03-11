import { useState, useRef } from 'react';
import { getSettings, saveSettings, exportAllData, importAllData, clearAllData } from '../utils/storage';
import { getCustomAirports, saveCustomAirport, removeCustomAirport } from '../utils/airports';

const CARRY_OVER_FIELDS = [
  { key: 'totalTime', label: 'Total time', placeholder: 'H:MM' },
  { key: 'multiPilotTime', label: 'Multi-pilot', placeholder: 'H:MM' },
  { key: 'nightTime', label: 'Night', placeholder: 'H:MM' },
  { key: 'ifrTime', label: 'IFR', placeholder: 'H:MM' },
  { key: 'picTime', label: 'PIC time', placeholder: 'H:MM' },
  { key: 'copilotTime', label: 'Copilot', placeholder: 'H:MM' },
  { key: 'dualTime', label: 'Dual', placeholder: 'H:MM' },
  { key: 'instructorTime', label: 'Instructor', placeholder: 'H:MM' },
  { key: 'landingsDay', label: 'Landings day', placeholder: '0', type: 'number' },
  { key: 'landingsNight', label: 'Landings night', placeholder: '0', type: 'number' },
];

export default function Settings({ settings, onSettingsChange, onDataChange }) {
  const [pilotName, setPilotName] = useState(settings.pilotName || '');
  const [primaryRole, setPrimaryRole] = useState(settings.primaryRole || 'pic');
  const [carryOver, setCarryOver] = useState(settings.carryOver || {});
  const [newIcao, setNewIcao] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');
  const [newName, setNewName] = useState('');
  const [customAirports, setCustomAirports] = useState(getCustomAirports());
  const [importStatus, setImportStatus] = useState('');
  const [totalsSaved, setTotalsSaved] = useState(false);
  const fileRef = useRef(null);

  function handleSavePilot() {
    const updated = { ...settings, pilotName: pilotName.trim(), primaryRole };
    saveSettings(updated);
    onSettingsChange(updated);
  }

  function handleCarryOverChange(key, value) {
    setCarryOver((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveCarryOver() {
    const updated = { ...settings, carryOver };
    saveSettings(updated);
    onSettingsChange(updated);
    setTotalsSaved(true);
    setTimeout(() => setTotalsSaved(false), 3000);
  }

  function handleAddAirport(e) {
    e.preventDefault();
    if (!newIcao || !newLat || !newLon) return;
    saveCustomAirport(newIcao, newLat, newLon, newName);
    setCustomAirports(getCustomAirports());
    setNewIcao('');
    setNewLat('');
    setNewLon('');
    setNewName('');
  }

  function handleRemoveAirport(icao) {
    removeCustomAirport(icao);
    setCustomAirports(getCustomAirports());
  }

  function handleExportJSON() {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freelogbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = importAllData(evt.target.result);
        setImportStatus(`Imported ${data.flights?.length || 0} flights successfully.`);
        onDataChange();
        onSettingsChange(getSettings());
      } catch (err) {
        setImportStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    if (!window.confirm('Are you sure? This will delete ALL flights and settings.')) return;
    if (!window.confirm('Really? This cannot be undone.')) return;
    clearAllData();
    onDataChange();
    onSettingsChange({});
    setPilotName('');
    setPrimaryRole('pic');
    setCarryOver({});
  }

  const inputCls =
    'bg-navy-800 border border-navy-600 text-white px-3 py-1.5 text-sm font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Pilot Name</h3>
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={pilotName}
            onChange={(e) => setPilotName(e.target.value)}
            placeholder="Your full name"
            className={`${inputCls} w-64`}
          />
          <button
            onClick={handleSavePilot}
            className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1.5 text-sm transition-colors"
          >
            Save
          </button>
        </div>
        <div className="mt-3 space-y-1">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Primary role</div>
          <div className="flex gap-4 text-xs text-gray-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="primaryRole"
                value="pic"
                checked={primaryRole === 'pic'}
                onChange={() => setPrimaryRole('pic')}
              />
              <span>PIC (captain)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="primaryRole"
                value="copilot"
                checked={primaryRole === 'copilot'}
                onChange={() => setPrimaryRole('copilot')}
              />
              <span>Copilot / FO</span>
            </label>
          </div>
          <p className="text-[11px] text-gray-500">
            Used for defaults and JetBee imports – decides whether multi-pilot jet time is counted as PIC or Copilot time.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Previous Logbook Totals</h3>
        <p className="text-xs text-gray-500 mb-3">
          Carry-over totals from your previous paper/electronic logbook. These are added to all cumulative sums.
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          {CARRY_OVER_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{f.label}</span>
              <input
                type={f.type || 'text'}
                value={carryOver[f.key] ?? ''}
                onChange={(e) => handleCarryOverChange(f.key, f.type === 'number' ? e.target.value : e.target.value)}
                placeholder={f.placeholder}
                className={`${inputCls} w-24`}
              />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveCarryOver}
            className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1.5 text-sm transition-colors"
          >
            Save Totals
          </button>
          {totalsSaved && (
            <span className="text-sm text-green-400">Totals saved.</span>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Custom Airports</h3>
        <form onSubmit={handleAddAirport} className="flex gap-2 flex-wrap mb-3">
          <input type="text" value={newIcao} onChange={(e) => setNewIcao(e.target.value)} placeholder="ICAO" className={`${inputCls} w-20`} />
          <input type="text" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="Lat" className={`${inputCls} w-24`} />
          <input type="text" value={newLon} onChange={(e) => setNewLon(e.target.value)} placeholder="Lon" className={`${inputCls} w-24`} />
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (optional)" className={`${inputCls} w-40`} />
          <button type="submit" className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm transition-colors">
            Add
          </button>
        </form>
        {Object.keys(customAirports).length > 0 && (
          <div className="space-y-1">
            {Object.entries(customAirports).map(([icao, data]) => (
              <div key={icao} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-amber-400 w-12">{icao}</span>
                <span className="font-mono text-gray-400">
                  {data.lat}, {data.lon}
                </span>
                {data.name && <span className="text-gray-500">{data.name}</span>}
                <button onClick={() => handleRemoveAirport(icao)} className="text-red-400 hover:text-red-300 text-xs ml-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Data</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExportJSON} className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm transition-colors">
            Export JSON Backup
          </button>
          <label className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm cursor-pointer transition-colors">
            Import JSON Backup
            <input ref={fileRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
          <button onClick={handleClearAll} className="bg-red-900/50 border border-red-700 hover:border-red-500 text-red-300 px-4 py-1.5 text-sm transition-colors">
            Clear All Data
          </button>
        </div>
        {importStatus && <p className="text-sm text-amber-400 mt-2">{importStatus}</p>}
      </section>
    </div>
  );
}
