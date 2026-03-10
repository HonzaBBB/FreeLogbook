import { useMemo } from 'react';
import { parseTime, parseDateDMY } from '../utils/timeUtils';

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-navy-800 border border-navy-600 px-4 py-3">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-xl text-amber-400 font-semibold">
        {value}
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function formatHours(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export default function Dashboard({ flights, carryOver = {} }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    let totalMins = 0;
    let picMins = 0;
    let nightMins = 0;
    let ifrMins = 0;
    let monthFlights = 0;
    let yearFlights = 0;
    let monthMins = 0;
    let yearMins = 0;

    for (const f of flights) {
      const ft = parseTime(f.totalTime);
      const pt = parseTime(f.picTime || f.totalTime);
      const nt = parseTime(f.nightTime);
      const it = parseTime(f.ifrTime);

      totalMins += ft;
      nightMins += nt;
      ifrMins += it;
      picMins += pt;

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

    return {
      totalHours: formatHours(totalMins + coTotal),
      picHours: formatHours(picMins + coPic),
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
      <StatCard label="Total hours" value={stats.totalHours} />
      <StatCard label="PIC hours" value={stats.picHours} />
      <StatCard label="Night hours" value={stats.nightHours} />
      <StatCard label="IFR hours" value={stats.ifrHours} />
      <StatCard label="Total flights" value={stats.totalFlights} />
      <StatCard label="This month" value={stats.monthFlights} unit={`flights · ${stats.monthHours}`} />
      <StatCard label="This year" value={stats.yearFlights} unit={`flights · ${stats.yearHours}`} />
    </div>
  );
}
