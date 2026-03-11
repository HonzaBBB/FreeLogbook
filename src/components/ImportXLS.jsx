import { useRef, useState } from 'react';
import { parseExcelDuration, parseExcelTime, formatTime, parseTime } from '../utils/timeUtils';
import { calculateNightTime } from '../utils/nightTime';
import { generateId, getFlightSignature } from '../utils/storage';
import { isKnownAirport, saveCustomAirport } from '../utils/airports';
import { resolveUnknownAirports } from '../utils/ourairports';

const REG_MAP = {
  BEE: { reg: 'OK-BEE', type: 'BE40' },
  BII: { reg: 'OK-BII', type: 'BE40' },
  BZZ: { reg: 'OK-BZZ', type: 'BE40' },
  ESC: { reg: 'OK-ESC', type: 'BE4W' },
};

const CREW_CAPTAIN_MAP = {
  BRJ: 'Brzák',
  VLM: 'Vláčilík',
  SVK: 'Svoboda',
  SHV: 'Schwarzmann',
  STJ: 'Stůj',
  HEL: 'Hermann',
};

function normalizeTimeString(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (parseTime(str) === 0) return '';
  return str;
}

function parseFlylogDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  // Expecting YYYY-MM-DD
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
}

function parseFlylogArrival(value) {
  if (!value) return '';
  const str = String(value).trim();
  const parts = str.split('-').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts[parts.length - 1].toUpperCase();
}

function parseJetBeeDate(value) {
  if (!value) return '';
  if (typeof value === 'number') {
    const epoch = new Date((value - 25569) * 86400000);
    const d = epoch.getUTCDate().toString().padStart(2, '0');
    const m = (epoch.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = epoch.getUTCFullYear();
    return `${d}.${m}.${y}`;
  }
  return String(value).trim();
}

function parseRouteField(value) {
  if (!value) return { dep: '', arr: '' };
  const str = String(value).trim();
  const parts = str.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { dep: parts[0].toUpperCase(), arr: parts[1].toUpperCase() };
  if (parts.length === 1) return { dep: parts[0].toUpperCase(), arr: '' };
  return { dep: '', arr: '' };
}

function parseOnOffField(value) {
  if (!value) return { depTime: '', arrTime: '' };
  const str = String(value).trim();
  const parts = str.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { depTime: parts[0], arrTime: parts[1] };
  return { depTime: '', arrTime: '' };
}

function parseOneFile(XLSX, buffer, pilotName, primaryRole = 'pic') {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  const flights = [];
  let currentDate = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;

    // JetBee layout: A = date, B = reg code, D = route, F = CREW (captain code), G = on/off, H = duration
    const [dateVal, regCode, , route, , crewCode, onOff, timeVal] = row;

    if (dateVal && String(dateVal).trim() !== '') {
      currentDate = parseJetBeeDate(dateVal);
    }

    const crewStr = String(crewCode || '').trim();
    if (!crewStr || crewStr === '-') continue;

    const regKey = String(regCode || '').trim().toUpperCase();
    const regInfo = REG_MAP[regKey];
    if (!regInfo) continue;

    const { dep, arr } = parseRouteField(route);
    const { depTime, arrTime } = parseOnOffField(onOff);
    const totalTime = parseExcelDuration(timeVal);

    const crewKey = crewStr.toUpperCase();
    const captainFromCrew = CREW_CAPTAIN_MAP[crewKey];
    const isCopilotPrimary = primaryRole === 'copilot';
    const picName = isCopilotPrimary ? (captainFromCrew || '') : (pilotName || captainFromCrew || '');

    const flight = {
      id: generateId(),
      date: currentDate,
      depICAO: dep,
      depTime: depTime.includes(':') ? depTime : parseExcelTime(depTime),
      arrICAO: arr,
      arrTime: arrTime.includes(':') ? arrTime : parseExcelTime(arrTime),
      acType: regInfo.type,
      reg: regInfo.reg,
      singlePilotSE: false,
      singlePilotME: false,
      multiPilotTime: totalTime,
      totalTime,
      picTime: isCopilotPrimary ? '' : totalTime,
      nightTime: '0:00',
      ifrTime: totalTime,
      landingsDay: 1,
      landingsNight: 0,
      picName,
      copilotTime: isCopilotPrimary ? totalTime : '',
      dualTime: '',
      instructorTime: '',
      remarks: '',
    };

    try {
      flight.nightTime = calculateNightTime(flight);
    } catch {
      flight.nightTime = '0:00';
    }

    if (parseTime(flight.nightTime) > 0 && flight.landingsDay === 1) {
      const arrMins =
        parseTime(flight.arrTime) < parseTime(flight.depTime)
          ? parseTime(flight.arrTime) + 24 * 60
          : parseTime(flight.arrTime);
      const totalMins = arrMins - parseTime(flight.depTime);
      const nightMins = parseTime(flight.nightTime);
      if (nightMins > totalMins * 0.5) {
        flight.landingsNight = 1;
        flight.landingsDay = 0;
      }
    }

    flights.push(flight);
  }

  return flights;
}

function findUnknownAirports(flights) {
  const codes = new Set();
  for (const f of flights) {
    if (f.depICAO && !isKnownAirport(f.depICAO)) codes.add(f.depICAO);
    if (f.arrICAO && !isKnownAirport(f.arrICAO)) codes.add(f.arrICAO);
  }
  return [...codes].sort();
}

function recalcFlights(flights) {
  return flights.map((f) => {
    const updated = { ...f };
    try {
      updated.nightTime = calculateNightTime(updated);
    } catch {
      updated.nightTime = '0:00';
    }
    if (parseTime(updated.nightTime) > 0 && updated.landingsDay === 1) {
      const arrMins =
        parseTime(updated.arrTime) < parseTime(updated.depTime)
          ? parseTime(updated.arrTime) + 24 * 60
          : parseTime(updated.arrTime);
      const totalMins = arrMins - parseTime(updated.depTime);
      const nightMins = parseTime(updated.nightTime);
      if (nightMins > totalMins * 0.5) {
        updated.landingsNight = 1;
        updated.landingsDay = 0;
      }
    }
    return updated;
  });
}

function mapFlylogRowToFlight(row, pilotName, primaryRole = 'pic') {
  const status = String(row.STATUS || '').trim().toUpperCase();
  if (status !== 'DONE') return null;

  const role = primaryRole || 'pic';

  const date = parseFlylogDate(row.DATE);
  const depICAO = String(row.DEPARTURE_AIRPORT || '').trim().toUpperCase();
  const arrICAO = parseFlylogArrival(row.ARRIVAL_AIRPORT);
  const depTime = String(row.TIME_DEPARTURE || '').trim();
  const arrTime = String(row.TIME_ARRIVAL || '').trim();

  const totalTime = normalizeTimeString(row.DURATION_FLIGHT);
  const landingsDay = parseInt(row.LDGS_DAY || '0', 10) || 0;
  const landingsNight = parseInt(row.LDGS_NIGHT || '0', 10) || 0;

  const acType = String(row.AIRCRAFT_TYPE || '').trim().toUpperCase();
  const reg = String(row.AIRCRAFT_REGISTRATION || '').trim().toUpperCase();

  const namePic = String(row.NAME_PIC || '').trim();
  const nameSic = String(row.NAME_SIC || '').trim();
  const nameInstructor = String(row.NAME_INSTRUCTOR || '').trim();

  const remarks = String(row.REMARKS_AND_ENDORSEMENTS || '').trim();

  const hasInstructor = !!nameInstructor;
  const hasSic = !!nameSic;

  const base = {
    id: generateId(),
    date,
    depICAO,
    depTime,
    arrICAO,
    arrTime,
    acType,
    reg,
    singlePilotSE: false,
    singlePilotME: false,
    multiPilotTime: '',
    totalTime,
    picTime: '',
    nightTime: '',
    ifrTime: '',
    landingsDay,
    landingsNight,
    picName: namePic || pilotName || '',
    copilotTime: '',
    dualTime: '',
    instructorTime: '',
    remarks,
  };

  // SE / ME + function logic
  if (hasInstructor) {
    // Logged as dual, not PIC
    base.dualTime = totalTime;
    base.instructorTime = '';
    base.picTime = '';
    base.copilotTime = '';
  } else if (hasSic) {
    // Multi-pilot flight
    base.multiPilotTime = totalTime;
    base.singlePilotSE = false;
    base.singlePilotME = false;
    if (role === 'copilot') {
      base.picTime = '';
      base.copilotTime = totalTime;
    } else {
      base.picTime = totalTime;
      base.copilotTime = '';
    }
  } else {
    // Single-pilot SEP style
    base.multiPilotTime = '';
    base.singlePilotSE = true;
    base.singlePilotME = false;
    if (role === 'copilot') {
      base.picTime = '';
      base.copilotTime = totalTime;
    } else {
      base.picTime = totalTime;
      base.copilotTime = '';
    }
  }

  try {
    base.nightTime = normalizeTimeString(calculateNightTime(base));
  } catch {
    base.nightTime = '';
  }

  if (parseTime(base.nightTime) > 0 && base.landingsDay === 1) {
    const arrMins =
      parseTime(base.arrTime) < parseTime(base.depTime)
        ? parseTime(base.arrTime) + 24 * 60
        : parseTime(base.arrTime);
    const totalMins = arrMins - parseTime(base.depTime);
    const nightMins = parseTime(base.nightTime);
    if (nightMins > totalMins * 0.5) {
      base.landingsNight = 1;
      base.landingsDay = 0;
    }
  }

  return base;
}

export default function ImportXLS({ onImport, pilotName, primaryRole = 'pic', existingFlights = [] }) {
  const fileRef = useRef(null);
  const csvRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [unknownAirports, setUnknownAirports] = useState([]);
  const [airportInputs, setAirportInputs] = useState({});

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const XLSX = await import('xlsx');
    let allFlights = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const flights = parseOneFile(XLSX, buffer, pilotName, primaryRole);
      allFlights.push(...flights);
    }

    const unknownCodes = findUnknownAirports(allFlights);

    if (unknownCodes.length > 0) {
      setResolving(true);
      try {
        const { resolved, unresolved } = await resolveUnknownAirports(unknownCodes);
        setResolvedCount(resolved.length);
        setUnknownAirports(unresolved);

        if (resolved.length > 0) {
          allFlights = recalcFlights(allFlights);
        }
      } catch {
        setUnknownAirports(unknownCodes);
        setResolvedCount(0);
      }
      setResolving(false);
    } else {
      setUnknownAirports([]);
      setResolvedCount(0);
    }

    setAirportInputs({});
    setPreview(allFlights);
  }

  async function handleFlylogChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const Papa = await import('papaparse');
    let allFlights = [];

    for (const file of files) {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = Array.isArray(result.data) ? result.data : [];
      for (const row of rows) {
        const flight = mapFlylogRowToFlight(row, pilotName, primaryRole);
        if (flight) {
          allFlights.push(flight);
        }
      }
    }

    if (allFlights.length === 0) {
      setPreview(null);
      return;
    }

    const unknownCodes = findUnknownAirports(allFlights);

    if (unknownCodes.length > 0) {
      setResolving(true);
      try {
        const { resolved, unresolved } = await resolveUnknownAirports(unknownCodes);
        setResolvedCount(resolved.length);
        setUnknownAirports(unresolved);

        if (resolved.length > 0) {
          allFlights = recalcFlights(allFlights);
        }
      } catch {
        setUnknownAirports(unknownCodes);
        setResolvedCount(0);
      }
      setResolving(false);
    } else {
      setUnknownAirports([]);
      setResolvedCount(0);
    }

    setAirportInputs({});
    setPreview(allFlights);
  }

  function handleAirportInput(icao, field, value) {
    setAirportInputs((prev) => ({
      ...prev,
      [icao]: { ...prev[icao], [field]: value },
    }));
  }

  function handleSaveAirports() {
    let saved = 0;
    for (const icao of unknownAirports) {
      const input = airportInputs[icao];
      if (!input?.lat || !input?.lon) continue;
      const lat = parseFloat(input.lat);
      const lon = parseFloat(input.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      saveCustomAirport(icao, lat, lon, input.name || '');
      saved++;
    }

    if (saved > 0 && preview) {
      const recalculated = recalcFlights(preview);
      setPreview(recalculated);
      setUnknownAirports(findUnknownAirports(recalculated));
    }
  }

  function handleConfirm() {
    if (!preview) return;
    setImporting(true);
    onImport(preview);
    setPreview(null);
    setUnknownAirports([]);
    setAirportInputs({});
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
    if (csvRef.current) csvRef.current.value = '';
  }

  function handleCancel() {
    setPreview(null);
    setUnknownAirports([]);
    setAirportInputs({});
    if (fileRef.current) fileRef.current.value = '';
    if (csvRef.current) csvRef.current.value = '';
  }

  const inputCls =
    'bg-navy-800 border border-navy-600 text-white px-2 py-1 text-xs font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none';

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <label className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm cursor-pointer transition-colors">
          <span>Import JetBee XLS</span>
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <label className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-1.5 text-sm cursor-pointer transition-colors">
          <span>Import Flylog CSV</span>
          <input
            ref={csvRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFlylogChange}
            className="hidden"
          />
        </label>
      </div>

      {resolving && (
        <div className="bg-navy-800 border border-navy-600 p-4 mb-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-300">Looking up airport coordinates...</span>
        </div>
      )}

      {preview && !resolving && (
        <div className="bg-navy-800 border border-amber-500/30 p-4">
          {resolvedCount > 0 && (
            <div className="mb-3 px-3 py-2 border border-green-700/40 bg-green-900/20 text-xs text-green-400">
              Auto-resolved {resolvedCount} airport{resolvedCount > 1 ? 's' : ''} from OurAirports database.
            </div>
          )}

          {unknownAirports.length > 0 && (
            <div className="mb-4 p-3 border border-amber-500/40 bg-navy-900">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                ⚠ {unknownAirports.length} airport{unknownAirports.length > 1 ? 's' : ''} not found — add coordinates manually
              </h4>
              <div className="space-y-2">
                {unknownAirports.map((icao) => (
                  <div key={icao} className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 text-xs w-12">{icao}</span>
                    <input
                      type="text"
                      placeholder="Lat"
                      value={airportInputs[icao]?.lat ?? ''}
                      onChange={(e) => handleAirportInput(icao, 'lat', e.target.value)}
                      className={`${inputCls} w-24`}
                    />
                    <input
                      type="text"
                      placeholder="Lon"
                      value={airportInputs[icao]?.lon ?? ''}
                      onChange={(e) => handleAirportInput(icao, 'lon', e.target.value)}
                      className={`${inputCls} w-24`}
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={airportInputs[icao]?.name ?? ''}
                      onChange={(e) => handleAirportInput(icao, 'name', e.target.value)}
                      className={`${inputCls} w-36`}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveAirports}
                className="mt-3 bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1 text-xs transition-colors"
              >
                Save Airports & Recalculate Night
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-400">
              Preview: {preview.length} flights found
              {(() => {
                const existingSigs = new Set(existingFlights.map(getFlightSignature));
                const dupCount = preview.filter((f) => existingSigs.has(getFlightSignature(f))).length;
                return dupCount > 0 ? ` (${dupCount} duplicate${dupCount > 1 ? 's' : ''} will be skipped)` : '';
              })()}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-1 text-sm transition-colors"
              >
                Import All
              </button>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white px-4 py-1 text-sm border border-navy-600"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-600 text-gray-400">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Dep</th>
                  <th className="px-2 py-1 text-left">Off</th>
                  <th className="px-2 py-1 text-left">Arr</th>
                  <th className="px-2 py-1 text-left">On</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Reg</th>
                  <th className="px-2 py-1 text-left">Total</th>
                  <th className="px-2 py-1 text-left">Night</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((f) => (
                  <tr key={f.id} className="border-b border-navy-700">
                    <td className="px-2 py-1 font-mono">{f.date}</td>
                    <td className="px-2 py-1 font-mono">{f.depICAO}</td>
                    <td className="px-2 py-1 font-mono">{f.depTime}</td>
                    <td className="px-2 py-1 font-mono">{f.arrICAO}</td>
                    <td className="px-2 py-1 font-mono">{f.arrTime}</td>
                    <td className="px-2 py-1 font-mono">{f.acType}</td>
                    <td className="px-2 py-1 font-mono">{f.reg}</td>
                    <td className="px-2 py-1 font-mono">{f.totalTime}</td>
                    <td className="px-2 py-1 font-mono">{f.nightTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
