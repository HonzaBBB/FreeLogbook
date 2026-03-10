import { useState, useMemo } from 'react';
import { parseTime, parseDateDMY } from '../utils/timeUtils';
import { isKnownAirport } from '../utils/airports';

const COLUMNS = [
  { key: 'date', label: 'Date', mono: true },
  { key: 'depICAO', label: 'Dep', mono: true },
  { key: 'depTime', label: 'Off', mono: true },
  { key: 'arrICAO', label: 'Arr', mono: true },
  { key: 'arrTime', label: 'On', mono: true },
  { key: 'acType', label: 'Type', mono: true },
  { key: 'reg', label: 'Reg', mono: true },
  { key: 'singlePilotSE', label: 'SP SE', mono: true, isBool: true },
  { key: 'singlePilotME', label: 'SP ME', mono: true, isBool: true },
  { key: 'multiPilotTime', label: 'Multi', mono: true },
  { key: 'totalTime', label: 'Total', mono: true },
  { key: 'nightTime', label: 'Night', mono: true },
  { key: 'ifrTime', label: 'IFR', mono: true },
  { key: 'landingsDay', label: 'L/D' },
  { key: 'landingsNight', label: 'L/N' },
  { key: 'copilotTime', label: 'Copilot', mono: true },
  { key: 'dualTime', label: 'Dual', mono: true },
  { key: 'instructorTime', label: 'Instructor', mono: true },
  { key: 'remarks', label: 'Remarks' },
];

export default function FlightTable({ flights, onDelete, onEdit }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return flights;
    const q = filter.toLowerCase();
    return flights.filter(
      (f) =>
        f.date?.toLowerCase().includes(q) ||
        f.depICAO?.toLowerCase().includes(q) ||
        f.arrICAO?.toLowerCase().includes(q) ||
        f.acType?.toLowerCase().includes(q) ||
        f.reg?.toLowerCase().includes(q) ||
        f.remarks?.toLowerCase().includes(q),
    );
  }, [flights, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';

      if (sortKey === 'date') {
        const da = parseDateDMY(va);
        const db = parseDateDMY(vb);
        if (da && db) {
          const timeA = parseTime(a.depTime);
          const timeB = parseTime(b.depTime);
          va = da.getTime() + timeA;
          vb = db.getTime() + timeB;
        }
      } else if (['multiPilotTime', 'totalTime', 'nightTime', 'ifrTime', 'copilotTime', 'dualTime', 'instructorTime'].includes(sortKey)) {
        va = parseTime(va);
        vb = parseTime(vb);
      } else if (['landingsDay', 'landingsNight', 'singlePilotSE', 'singlePilotME'].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }

      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortAsc]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter flights... (ICAO, date, reg, type)"
          className="bg-navy-800 border border-navy-600 text-white px-3 py-1.5 text-sm font-mono w-72 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">{sorted.length} flights</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-navy-600">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-2 py-2 text-left text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-amber-400 select-none whitespace-nowrap"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-amber-500">{sortAsc ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              <th className="px-2 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((flight) => (
              <tr
                key={flight.id}
                className="border-b border-navy-700 hover:bg-navy-800 transition-colors"
              >
                {COLUMNS.map((col) => {
                  const value = flight[col.key];
                  const isIcao = col.key === 'depICAO' || col.key === 'arrICAO';
                  const unknown = isIcao && value && !isKnownAirport(value);
                  const display =
                    col.isBool ? (value ? '✓' : '') : (value || '');
                  return (
                    <td
                      key={col.key}
                      className={`px-2 py-1.5 whitespace-nowrap ${col.mono ? 'font-mono' : ''} ${
                        value ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {unknown && (
                        <span className="text-amber-500 mr-1" title="Unknown airport — add coords in Settings">
                          ⚠
                        </span>
                      )}
                      {display || '—'}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(flight)}
                    className="text-gray-500 hover:text-amber-400 mr-2 text-xs"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this flight?')) onDelete(flight.id);
                    }}
                    className="text-gray-500 hover:text-red-400 text-xs"
                    title="Delete"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-gray-500">
                  No flights yet. Add a flight manually or import from XLS.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
