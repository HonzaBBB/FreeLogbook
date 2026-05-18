import { useMemo } from 'react';
import { parseTime, parseDateDMY } from '../utils/timeUtils';
import { getFlightMepMinutes } from '../utils/flightMep';

function StatCard({ label, value, unit, compact = false }) {
  return (
    <div className={`bg-navy-800 border border-navy-600 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400 uppercase tracking-wider mb-1`}>{label}</div>
      <div className={`font-mono text-amber-400 font-semibold ${compact ? 'text-lg' : 'text-xl'}`}>
        {value}
        {unit && <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400 ml-1`}>{unit}</span>}
      </div>
    </div>
  );
}

function formatHours(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export default function Dashboard({ flights, carryOver = {}, t = (key) => key }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    let totalMins = 0;
    let picMins = 0;
    let mepMins = 0;
    let nightMins = 0;
    let ifrMins = 0;
    let monthFlights = 0;
    let yearFlights = 0;
    let monthMins = 0;
    let yearMins = 0;

    for (const f of flights) {
      const ft = parseTime(f.totalTime);
      const pt = parseTime(f.picTime);
      const nt = parseTime(f.nightTime);
      const it = parseTime(f.ifrTime);

      totalMins += ft;
      nightMins += nt;
      ifrMins += it;
      picMins += pt;
      mepMins += getFlightMepMinutes(f);

      const fDate = parseDateDMY(f.date);
      if (fDate) {
        if (fDate.getUTCFullYear() === currentYear) {
          yearFlights++;
          yearMins += ft;
          if (fDate.getUTCMonth() === currentMonth) {
            monthFlights++;
            monthMins += ft;
          }
        }
      }
    }

    const coTotal = parseTime(carryOver.totalTime);
    const coPic = parseTime(carryOver.picTime);
    const coNight = parseTime(carryOver.nightTime);
    const coIfr = parseTime(carryOver.ifrTime);
    const coMep = parseTime(carryOver.singlePilotMepTime);

    return {
      totalHours: formatHours(totalMins + coTotal),
      picHours: formatHours(picMins + coPic),
      mepHours: formatHours(mepMins + coMep),
      nightHours: formatHours(nightMins + coNight),
      ifrHours: formatHours(ifrMins + coIfr),
      totalFlights: flights.length,
      monthFlights,
      yearFlights,
      monthHours: formatHours(monthMins),
      yearHours: formatHours(yearMins),
    };
  }, [flights, carryOver]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 mb-4 sm:hidden">
        <StatCard label={t('dashboard.totalHours')} value={stats.totalHours} compact />
        <StatCard label={t('dashboard.picHours')} value={stats.picHours} compact />
        <StatCard label={t('dashboard.mepHours')} value={stats.mepHours} compact />
        <StatCard label={t('dashboard.nightHours')} value={stats.nightHours} compact />
        <StatCard label={t('dashboard.totalFlights')} value={stats.totalFlights} compact />
      </div>
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-6 gap-2 mb-6">
        <StatCard label={t('dashboard.totalHours')} value={stats.totalHours} />
        <StatCard label={t('dashboard.picHours')} value={stats.picHours} />
        <StatCard label={t('dashboard.mepHours')} value={stats.mepHours} />
        <StatCard label={t('dashboard.nightHours')} value={stats.nightHours} />
        <StatCard label={t('dashboard.ifrHours')} value={stats.ifrHours} />
        <StatCard label={t('dashboard.totalFlights')} value={stats.totalFlights} />
        <StatCard label={t('dashboard.thisMonth')} value={stats.monthFlights} unit={`${t('dashboard.flightsUnit')} · ${stats.monthHours}`} />
        <StatCard label={t('dashboard.thisYear')} value={stats.yearFlights} unit={`${t('dashboard.flightsUnit')} · ${stats.yearHours}`} />
      </div>
    </>
  );
}
