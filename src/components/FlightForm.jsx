import { useState, useEffect } from 'react';
import { calculateFlightDuration } from '../utils/timeUtils';
import { calculateNightTime } from '../utils/nightTime';
import { generateId, findDuplicateFlight } from '../utils/storage';
import { isKnownAirport } from '../utils/airports';
import { resolveUnknownAirports } from '../utils/ourairports';

const ICAO_PATTERN = /^[A-Z]{4}$/;

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

function Field({ label, field, type = 'text', width = 'w-24', mono = false, placeholder = '', value, set }) {
  const responsiveWidth = width.startsWith('sm:') ? width : `sm:${width}`;
  return (
    <label className={`flex flex-col gap-1 w-full ${responsiveWidth}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => set(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        className={`bg-navy-800 border border-navy-600 text-white px-2 py-2 text-base sm:text-sm w-full ${
          mono ? 'font-mono' : ''
        } placeholder-gray-600 focus:border-amber-500 focus:outline-none`}
      />
    </label>
  );
}

export default function FlightForm({ onSave, editFlight, onCancel, pilotName, primaryRole = 'pic', existingFlights = [], t = (key) => key }) {
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

  async function handleSubmit(e) {
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
        t('flightForm.duplicateConfirm', `A flight with the same date, route (${saved.depICAO} → ${saved.arrICAO}) and times already exists. Add anyway?`),
      );
      if (!ok) return;
    }

    const icaoCandidates = [saved.depICAO, saved.arrICAO].filter(Boolean);
    const unknownIcaos = [...new Set(icaoCandidates)].filter(
      (code) => ICAO_PATTERN.test(code) && !isKnownAirport(code),
    );
    if (unknownIcaos.length > 0) {
      try {
        await resolveUnknownAirports(unknownIcaos);
      } catch {
        // Při chybě sítě jen pokračujeme v uložení letu
      }
    }

    onSave(saved);
    if (!editFlight) {
      setFlight({ ...EMPTY_FLIGHT, picName: pilotName || '' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-600 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {editFlight ? t('flightForm.editFlight') : t('flightForm.addFlight')}
        </h3>
        {editFlight && (
          <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-white">
            {t('flightForm.cancel')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <Field label={t('flightForm.fields.date')} field="date" placeholder="DD.MM.YYYY" width="w-28" mono value={flight.date} set={set} />
        <Field label={t('flightForm.fields.depIcao')} field="depICAO" placeholder="LKPR" width="w-20" mono value={flight.depICAO} set={set} />
        <Field label={t('flightForm.fields.offUtc')} field="depTime" placeholder="HH:MM" width="w-20" mono value={flight.depTime} set={set} />
        <Field label={t('flightForm.fields.arrIcao')} field="arrICAO" placeholder="LOWL" width="w-20" mono value={flight.arrICAO} set={set} />
        <Field label={t('flightForm.fields.onUtc')} field="arrTime" placeholder="HH:MM" width="w-20" mono value={flight.arrTime} set={set} />
        <Field label={t('flightForm.fields.type')} field="acType" placeholder="BE40" width="w-20" mono value={flight.acType} set={set} />
        <Field label={t('flightForm.fields.reg')} field="reg" placeholder="OK-BEE" width="w-24" mono value={flight.reg} set={set} />
      </div>

      <div className="flex flex-wrap gap-4 mb-3 items-center">
        <label className="flex items-center gap-2 py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={!!flight.singlePilotSE}
            onChange={(e) => set('singlePilotSE', e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 accent-amber-500"
          />
          <span className="text-xs sm:text-[11px] text-gray-300 uppercase tracking-wider">{t('flightForm.fields.singlePilotSe')}</span>
        </label>
        <label className="flex items-center gap-2 py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={!!flight.singlePilotME}
            onChange={(e) => set('singlePilotME', e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 accent-amber-500"
          />
          <span className="text-xs sm:text-[11px] text-gray-300 uppercase tracking-wider">{t('flightForm.fields.singlePilotMe')}</span>
        </label>
        <Field
          label={t('flightForm.fields.multiPilotTime')}
          field="multiPilotTime"
          placeholder="H:MM"
          width="w-24"
          mono
          value={flight.multiPilotTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.totalTime')}
          field="totalTime"
          placeholder="H:MM"
          width="w-20"
          mono
          value={flight.totalTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.night')}
          field="nightTime"
          placeholder="H:MM"
          width="w-20"
          mono
          value={flight.nightTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.ifr')}
          field="ifrTime"
          placeholder="H:MM"
          width="w-20"
          mono
          value={flight.ifrTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.ldgDay')}
          field="landingsDay"
          type="number"
          width="w-16"
          value={flight.landingsDay}
          set={set}
        />
        <Field
          label={t('flightForm.fields.ldgNight')}
          field="landingsNight"
          type="number"
          width="w-16"
          value={flight.landingsNight}
          set={set}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <Field label={t('flightForm.fields.picTime')} field="picTime" placeholder="H:MM" width="w-24" mono value={flight.picTime} set={set} />
        <Field
          label={t('flightForm.fields.copilotTime')}
          field="copilotTime"
          placeholder="H:MM"
          width="w-24"
          mono
          value={flight.copilotTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.dualTime')}
          field="dualTime"
          placeholder="H:MM"
          width="w-24"
          mono
          value={flight.dualTime}
          set={set}
        />
        <Field
          label={t('flightForm.fields.instructorTime')}
          field="instructorTime"
          placeholder="H:MM"
          width="w-28"
          mono
          value={flight.instructorTime}
          set={set}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Field
          label={t('flightForm.fields.picName')}
          field="picName"
          width="w-48"
          placeholder={t('flightForm.placeholders.pilotName')}
          value={flight.picName}
          set={set}
        />
        <Field
          label={t('flightForm.fields.remarks')}
          field="remarks"
          width="w-64"
          placeholder={t('flightForm.placeholders.notes')}
          value={flight.remarks}
          set={set}
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-6 py-2 text-sm uppercase tracking-wider transition-colors w-full sm:w-auto"
        >
          {editFlight ? t('flightForm.update') : t('flightForm.addFlight')}
        </button>
      </div>
    </form>
  );
}
