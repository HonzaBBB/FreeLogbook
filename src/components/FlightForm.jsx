import { useState, useEffect } from 'react';
import { calculateFlightDuration } from '../utils/timeUtils';
import { calculateNightTime } from '../utils/nightTime';
import { generateId, findDuplicateFlight } from '../utils/storage';

const TURBINE_TYPES = ['BE40', 'BE4W'];

function isTurbine(acType) {
  return TURBINE_TYPES.includes(acType?.toUpperCase());
}

const EMPTY_FLIGHT = {
  date: '',
  depICAO: '',
  depTime: '',
  arrICAO: '',
  arrTime: '',
  acType: '',
  reg: '',
  singlePilotSE: false,
  singlePilotME: false,
  multiPilotTime: '',
  totalTime: '',
  picTime: '',
  nightTime: '0:00',
  ifrTime: '',
  landingsDay: 1,
  landingsNight: 0,
  picName: '',
  copilotTime: '',
  dualTime: '',
  instructorTime: '',
  remarks: '',
};

export default function FlightForm({ onSave, editFlight, onCancel, pilotName, primaryRole = 'pic', existingFlights = [] }) {
  const [flight, setFlight] = useState({ ...EMPTY_FLIGHT, picName: pilotName || '' });

  useEffect(() => {
    if (editFlight) {
      setFlight({ ...EMPTY_FLIGHT, ...editFlight });
    } else {
      setFlight({ ...EMPTY_FLIGHT, picName: pilotName || '' });
    }
  }, [editFlight, pilotName]);

  function set(key, value) {
    setFlight((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'depTime' || key === 'arrTime') {
        if (next.depTime && next.arrTime) {
          const total = calculateFlightDuration(next.depTime, next.arrTime);
          next.totalTime = total;
          applyTypeDefaults(next, primaryRole);
          recalcNight(next);
        }
      }

      if (key === 'acType') {
        applyTypeDefaults(next, primaryRole);
      }

      if (key === 'depICAO' || key === 'arrICAO' || key === 'date') {
        recalcNight(next);
      }

      return next;
    });
  }

  function applyTypeDefaults(f, primaryRole) {
    const role = primaryRole || 'pic';
    if (isTurbine(f.acType)) {
      f.multiPilotTime = f.totalTime;
      f.ifrTime = f.totalTime;
      f.singlePilotSE = false;
      f.singlePilotME = false;
      if (role === 'copilot') {
        f.picTime = '0:00';
        f.copilotTime = f.totalTime;
      } else {
        f.picTime = f.totalTime;
        f.copilotTime = '';
      }
    } else if (f.acType?.toUpperCase() === 'SEP' || (!isTurbine(f.acType) && f.acType)) {
      f.multiPilotTime = '';
      f.singlePilotSE = true;
      f.singlePilotME = false;
      if (role === 'copilot') {
        f.picTime = '0:00';
        f.copilotTime = f.totalTime;
      } else {
        f.picTime = f.totalTime;
        f.copilotTime = '';
      }
    }
  }

  function recalcNight(f) {
    if (f.date && f.depICAO && f.arrICAO && f.depTime && f.arrTime) {
      try {
        f.nightTime = calculateNightTime(f);
      } catch {
        f.nightTime = '0:00';
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!flight.date || !flight.depICAO || !flight.arrICAO) return;

    const saved = {
      ...flight,
      id: flight.id || generateId(),
      depICAO: flight.depICAO.toUpperCase().trim(),
      arrICAO: flight.arrICAO.toUpperCase().trim(),
      acType: flight.acType.toUpperCase().trim(),
      reg: flight.reg.toUpperCase().trim(),
    };

    const duplicate = findDuplicateFlight(existingFlights, saved, editFlight?.id);
    if (duplicate) {
      const ok = window.confirm(
        `A flight with the same date, route (${saved.depICAO} → ${saved.arrICAO}) and times already exists. Add anyway?`,
      );
      if (!ok) return;
    }

    onSave(saved);
    if (!editFlight) {
      setFlight({ ...EMPTY_FLIGHT, picName: pilotName || '' });
    }
  }

  function Field({ label, field, type = 'text', width = 'w-24', mono = false, placeholder = '' }) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
        <input
          type={type}
          value={flight[field] ?? ''}
          onChange={(e) => set(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          className={`bg-navy-800 border border-navy-600 text-white px-2 py-1.5 text-sm ${width} ${
            mono ? 'font-mono' : ''
          } placeholder-gray-600 focus:border-amber-500 focus:outline-none`}
        />
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-600 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {editFlight ? 'Edit flight' : 'Add flight'}
        </h3>
        {editFlight && (
          <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <Field label="Date" field="date" placeholder="DD.MM.YYYY" width="w-28" mono />
        <Field label="Dep ICAO" field="depICAO" placeholder="LKPR" width="w-20" mono />
        <Field label="Off (UTC)" field="depTime" placeholder="HH:MM" width="w-20" mono />
        <Field label="Arr ICAO" field="arrICAO" placeholder="LOWL" width="w-20" mono />
        <Field label="On (UTC)" field="arrTime" placeholder="HH:MM" width="w-20" mono />
        <Field label="Type" field="acType" placeholder="BE40" width="w-20" mono />
        <Field label="Reg" field="reg" placeholder="OK-BEE" width="w-24" mono />
      </div>

      <div className="flex flex-wrap gap-4 mb-3 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!flight.singlePilotSE}
            onChange={(e) => set('singlePilotSE', e.target.checked)}
          />
          <span className="text-[11px] text-gray-300 uppercase tracking-wider">Single-pilot SE</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!flight.singlePilotME}
            onChange={(e) => set('singlePilotME', e.target.checked)}
          />
          <span className="text-[11px] text-gray-300 uppercase tracking-wider">Single-pilot ME</span>
        </label>
        <Field label="Multi-pilot time" field="multiPilotTime" placeholder="H:MM" width="w-24" mono />
        <Field label="Total time" field="totalTime" placeholder="H:MM" width="w-20" mono />
        <Field label="Night" field="nightTime" placeholder="H:MM" width="w-20" mono />
        <Field label="IFR" field="ifrTime" placeholder="H:MM" width="w-20" mono />
        <Field label="Ldg Day" field="landingsDay" type="number" width="w-16" />
        <Field label="Ldg Night" field="landingsNight" type="number" width="w-16" />
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <Field label="PIC time" field="picTime" placeholder="H:MM" width="w-24" mono />
        <Field label="Copilot time" field="copilotTime" placeholder="H:MM" width="w-24" mono />
        <Field label="Dual time" field="dualTime" placeholder="H:MM" width="w-24" mono />
        <Field label="Instructor time" field="instructorTime" placeholder="H:MM" width="w-28" mono />
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Field label="PIC name" field="picName" width="w-48" placeholder="Pilot name" />
        <Field label="Remarks" field="remarks" width="w-64" placeholder="Notes" />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-6 py-1.5 text-sm uppercase tracking-wider transition-colors"
        >
          {editFlight ? 'Update' : 'Add flight'}
        </button>
      </div>
    </form>
  );
}
