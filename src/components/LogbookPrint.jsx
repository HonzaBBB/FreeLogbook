import { useMemo } from 'react';
import { parseTime, formatTime } from '../utils/timeUtils';

const ROWS_PER_PAGE = 14;

function chunk(arr, size) {
  const pages = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

function sumField(flights, field) {
  return flights.reduce((acc, f) => acc + parseTime(f[field]), 0);
}

function sumNum(flights, field) {
  return flights.reduce((acc, f) => acc + (parseInt(f[field]) || 0), 0);
}

function fmt(mins) {
  return formatTime(mins);
}

export default function LogbookPrint({ flights, onClose, carryOver = {} }) {
  const pages = useMemo(() => chunk(flights, ROWS_PER_PAGE), [flights]);

  const runningTotals = useMemo(() => {
    let prevMulti = parseTime(carryOver.multiPilotTime);
    let prevTotal = parseTime(carryOver.totalTime);
    let prevNight = parseTime(carryOver.nightTime);
    let prevIFR = parseTime(carryOver.ifrTime);
    let prevLdgD = parseInt(carryOver.landingsDay) || 0;
    let prevLdgN = parseInt(carryOver.landingsNight) || 0;
    let prevPic = parseTime(carryOver.picTime);
    let prevCopilot = parseTime(carryOver.copilotTime);
    let prevDual = parseTime(carryOver.dualTime);
    let prevInstructor = parseTime(carryOver.instructorTime);

    return pages.map((page) => {
      const pageMulti = sumField(page, 'multiPilotTime');
      const pageTotal = sumField(page, 'totalTime');
      const pageNight = sumField(page, 'nightTime');
      const pageIFR = sumField(page, 'ifrTime');
      const pageLdgD = sumNum(page, 'landingsDay');
      const pageLdgN = sumNum(page, 'landingsNight');
      const pagePic = sumField(page, 'picTime');
      const pageCopilot = sumField(page, 'copilotTime');
      const pageDual = sumField(page, 'dualTime');
      const pageInstructor = sumField(page, 'instructorTime');

      const result = {
        page: {
          multi: pageMulti,
          total: pageTotal,
          night: pageNight,
          ifr: pageIFR,
          ldgD: pageLdgD,
          ldgN: pageLdgN,
          pic: pagePic,
          copilot: pageCopilot,
          dual: pageDual,
          instructor: pageInstructor,
        },
        prev: {
          multi: prevMulti,
          total: prevTotal,
          night: prevNight,
          ifr: prevIFR,
          ldgD: prevLdgD,
          ldgN: prevLdgN,
          pic: prevPic,
          copilot: prevCopilot,
          dual: prevDual,
          instructor: prevInstructor,
        },
        grand: {
          multi: prevMulti + pageMulti,
          total: prevTotal + pageTotal,
          night: prevNight + pageNight,
          ifr: prevIFR + pageIFR,
          ldgD: prevLdgD + pageLdgD,
          ldgN: prevLdgN + pageLdgN,
          pic: prevPic + pagePic,
          copilot: prevCopilot + pageCopilot,
          dual: prevDual + pageDual,
          instructor: prevInstructor + pageInstructor,
        },
      };

      prevMulti += pageMulti;
      prevTotal += pageTotal;
      prevNight += pageNight;
      prevIFR += pageIFR;
      prevLdgD += pageLdgD;
      prevLdgN += pageLdgN;
      prevPic += pagePic;
      prevCopilot += pageCopilot;
      prevDual += pageDual;
      prevInstructor += pageInstructor;

      return result;
    });
  }, [pages]);

  return (
    <div className="logbook-print-overlay fixed inset-0 bg-white z-50 overflow-auto print:static">
      <div className="no-print p-4 bg-gray-100 flex items-center justify-between sticky top-0 z-10 border-b">
        <span className="text-sm text-gray-600">
          Print preview — {flights.length} flights, {pages.length} pages
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-500"
          >
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-1.5 text-sm hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>

      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className="logbook-page">
          <div className="page-header">
            <span>PILOT LOGBOOK</span>
            <span>Page {pageIdx + 1} / {pages.length}</span>
          </div>

          <table className="logbook-table">
            <thead>
              <tr className="header-main">
                <th rowSpan="2" className="col-date">1<br /><small>DATE</small></th>
                <th colSpan="2">2 — DEPARTURE</th>
                <th colSpan="2">3 — ARRIVAL</th>
                <th colSpan="2">4 — AIRCRAFT</th>
                <th colSpan="3">5 — FLIGHT TIME</th>
                <th rowSpan="2" className="col-total">6<br /><small>TOTAL<br />TIME</small></th>
                <th rowSpan="2" className="col-pic">7<br /><small>PIC<br />NAME</small></th>
                <th colSpan="2">8 — LANDINGS</th>
                <th colSpan="2">9 — CONDITIONS</th>
                <th rowSpan="2" className="col-pictime">10<br /><small>PIC<br />TIME</small></th>
                <th rowSpan="2" className="col-pic">11<br /><small>COPILOT</small></th>
                <th rowSpan="2" className="col-pic">12<br /><small>DUAL</small></th>
                <th rowSpan="2" className="col-pic">13<br /><small>INSTRUCTOR</small></th>
                <th rowSpan="2" className="col-remarks">14<br /><small>REMARKS</small></th>
              </tr>
              <tr className="header-sub">
                <th><small>AERODROME</small></th>
                <th><small>TIME<br />UTC</small></th>
                <th><small>AERODROME</small></th>
                <th><small>TIME<br />UTC</small></th>
                <th><small>TYPE</small></th>
                <th><small>REG</small></th>
                <th><small>SP<br />SE</small></th>
                <th><small>SP<br />ME</small></th>
                <th><small>MULTI-<br />PILOT</small></th>
                <th><small>DAY</small></th>
                <th><small>NIGHT</small></th>
                <th><small>NIGHT</small></th>
                <th><small>IFR</small></th>
              </tr>
            </thead>
            <tbody>
              {page.map((f, rowIdx) => (
                <tr key={f.id || rowIdx}>
                  <td className="mono">{f.date}</td>
                  <td className="mono">{f.depICAO}</td>
                  <td className="mono">{f.depTime}</td>
                  <td className="mono">{f.arrICAO}</td>
                  <td className="mono">{f.arrTime}</td>
                  <td className="mono">{f.acType}</td>
                  <td className="mono">{f.reg}</td>
                  <td className="mono">{f.singlePilotSE ? '☑' : ''}</td>
                  <td className="mono">{f.singlePilotME ? '☑' : ''}</td>
                  <td className="mono">{f.multiPilotTime || ''}</td>
                  <td className="mono bold">{f.totalTime}</td>
                  <td className="small-text">{f.picName}</td>
                  <td className="mono">{f.landingsDay || ''}</td>
                  <td className="mono">{f.landingsNight || ''}</td>
                  <td className="mono">{f.nightTime && f.nightTime !== '0:00' ? f.nightTime : ''}</td>
                  <td className="mono">{f.ifrTime || ''}</td>
                  <td className="mono">{f.totalTime}</td>
                  <td className="mono">{f.copilotTime || ''}</td>
                  <td className="mono">{f.dualTime || ''}</td>
                  <td className="mono">{f.instructorTime || ''}</td>
                  <td className="small-text">{f.remarks}</td>
                </tr>
              ))}
              {Array.from({ length: ROWS_PER_PAGE - page.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="empty-row">
                  {Array.from({ length: 21 }).map((_, j) => (
                    <td key={j}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <SummaryRow label="CELKEM NA TÉTO STRANĚ" data={runningTotals[pageIdx].page} />
              <SummaryRow label="CELKEM Z PŘEDCHOZÍCH STRAN" data={runningTotals[pageIdx].prev} />
              <SummaryRow label="CELKOVÁ DOBA" data={runningTotals[pageIdx].grand} bold />
            </tfoot>
          </table>
          <div className="logbook-signature">
            <div className="logbook-signature-text">
              I hereby certify that the entries in this log are true.
            </div>
            <div className="logbook-signature-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, data, bold }) {
  const cls = bold ? 'summary-row bold' : 'summary-row';
  return (
    <tr className={cls}>
      <td colSpan="7" className="summary-label">{label}</td>
      <td></td>
      <td></td>
      <td className="mono">{data.multi ? fmt(data.multi) : ''}</td>
      <td className="mono">{fmt(data.total)}</td>
      <td></td>
      <td className="mono">{data.ldgD || ''}</td>
      <td className="mono">{data.ldgN || ''}</td>
      <td className="mono">{data.night ? fmt(data.night) : ''}</td>
      <td className="mono">{data.ifr ? fmt(data.ifr) : ''}</td>
      <td className="mono">{data.pic ? fmt(data.pic) : ''}</td>
      <td className="mono">{data.copilot ? fmt(data.copilot) : ''}</td>
      <td className="mono">{data.dual ? fmt(data.dual) : ''}</td>
      <td className="mono">{data.instructor ? fmt(data.instructor) : ''}</td>
      <td></td>
    </tr>
  );
}
