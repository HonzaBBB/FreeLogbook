import { useState, useMemo } from 'react';
import { parseTime, parseDateDMY } from '../utils/timeUtils';
import { isKnownAirport } from '../utils/airports';

export default function FlightTable({ flights, onDelete, onEdit, t = (key) => key }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const columns = [
    { key: 'date', label: t('logbook.columns.date'), mono: true },
    { key: 'depICAO', label: t('logbook.columns.dep'), mono: true },
    { key: 'depTime', label: t('logbook.columns.off'), mono: true },
    { key: 'arrICAO', label: t('logbook.columns.arr'), mono: true },
    { key: 'arrTime', label: t('logbook.columns.on'), mono: true },
    { key: 'acType', label: t('logbook.columns.type'), mono: true },
    { key: 'reg', label: t('logbook.columns.reg'), mono: true },
    { key: 'singlePilotSE', label: t('logbook.columns.spSe'), mono: true, isBool: true },
    { key: 'singlePilotME', label: t('logbook.columns.spMe'), mono: true, isBool: true },
    { key: 'multiPilotTime', label: t('logbook.columns.multi'), mono: true },
    { key: 'totalTime', label: t('logbook.columns.total'), mono: true },
    { key: 'nightTime', label: t('logbook.columns.night'), mono: true },
    { key: 'ifrTime', label: t('logbook.columns.ifr'), mono: true },
    { key: 'landingsDay', label: t('logbook.columns.landingsDay') },
    { key: 'landingsNight', label: t('logbook.columns.landingsNight') },
    { key: 'copilotTime', label: t('logbook.columns.copilot'), mono: true },
    { key: 'dualTime', label: t('logbook.columns.dual'), mono: true },
    { key: 'instructorTime', label: t('logbook.columns.instructor'), mono: true },
    { key: 'remarks', label: t('logbook.columns.remarks') },
  ];

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

  function confirmDelete(flightId) {
    onDelete(flightId);
    setPendingDeleteId(null);
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('logbook.filterPlaceholder')}
          className="bg-navy-800 border border-navy-600 text-white px-3 py-2 text-base sm:text-sm font-mono w-full sm:w-72 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">{t('logbook.flightsCount', `${sorted.length} flights`).replace('{count}', sorted.length)}</span>
      </div>

      <div className="md:hidden space-y-2">
        {sorted.map((flight) => (
          <article key={flight.id} className="bg-navy-800 border border-navy-600 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">{flight.date || '—'}</div>
                <div className="font-mono text-sm text-white">{flight.depICAO || '----'} {'->'} {flight.arrICAO || '----'}</div>
              </div>
              <div className="font-mono text-sm text-amber-400">{flight.totalTime || '0:00'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="text-gray-400">{t('logbook.columns.off')}: <span className="text-gray-200 font-mono">{flight.depTime || '—'}</span></div>
              <div className="text-gray-400">{t('logbook.columns.on')}: <span className="text-gray-200 font-mono">{flight.arrTime || '—'}</span></div>
              <div className="text-gray-400">{t('logbook.columns.type')}: <span className="text-gray-200 font-mono">{flight.acType || '—'}</span></div>
              <div className="text-gray-400">{t('logbook.columns.reg')}: <span className="text-gray-200 font-mono">{flight.reg || '—'}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(flight)}
                className="flex-1 bg-navy-700 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
              >
                {t('logbook.edit')}
              </button>
              <button
                onClick={() => setPendingDeleteId(flight.id)}
                className="flex-1 bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 text-xs uppercase tracking-wider"
              >
                {t('logbook.delete')}
              </button>
            </div>
            {pendingDeleteId === flight.id && (
              <div className="mt-3 border border-red-600 bg-red-950/50 p-3">
                <p className="text-sm font-semibold text-red-200">{t('logbook.deleteConfirm')}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => confirmDelete(flight.id)}
                    className="flex-1 bg-red-700 hover:bg-red-600 text-white px-3 py-2 text-xs uppercase tracking-wider"
                  >
                    {t('logbook.confirmDelete')}
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(null)}
                    className="flex-1 bg-navy-700 border border-navy-600 text-gray-200 px-3 py-2 text-xs uppercase tracking-wider"
                  >
                    {t('logbook.cancelDelete')}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 border border-navy-700">
            {t('logbook.emptyState')}
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-navy-600">
              {columns.map((col) => (
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
              <th className="px-2 py-2 w-56"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((flight) => (
              <tr
                key={flight.id}
                className="border-b border-navy-700 hover:bg-navy-800 transition-colors"
              >
                {columns.map((col) => {
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
                        <span className="text-amber-500 mr-1" title={t('logbook.unknownAirportTitle')}>
                          ⚠
                        </span>
                      )}
                      {display || '—'}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {pendingDeleteId === flight.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-red-300 font-semibold">{t('logbook.deleteConfirm')}</span>
                      <button
                        onClick={() => confirmDelete(flight.id)}
                        className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 text-xs uppercase tracking-wider"
                      >
                        {t('logbook.confirmDelete')}
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="bg-navy-700 border border-navy-600 text-gray-200 px-2 py-1 text-xs uppercase tracking-wider"
                      >
                        {t('logbook.cancelDelete')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(flight)}
                        className="text-gray-500 hover:text-amber-400 mr-2 text-xs"
                        title={t('logbook.edit')}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(flight.id)}
                        className="text-gray-500 hover:text-red-400 text-xs"
                        title={t('logbook.delete')}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">
                  {t('logbook.emptyState')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
