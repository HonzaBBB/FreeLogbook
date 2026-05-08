import { useState, useEffect, useMemo, useRef } from 'react';
import {
  calculateFlightDuration,
  dateDmyToIso,
  formatDateDMY,
  normalizeDateInput,
  normalizeTimeInput,
  parseDateDMY,
  parseTime,
} from '../utils/timeUtils';
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

const MAX_REASONABLE_FLIGHT_MINUTES = 16 * 60;

function pickLatestFlight(flights, excludeId) {
  let latest = null;
  let latestTs = -Infinity;
  for (const flight of flights) {
    if (excludeId && flight.id === excludeId) continue;
    const date = parseDateDMY(flight.date);
    if (!date) continue;
    const ts = date.getTime() + parseTime(flight.depTime || '00:00') * 60000;
    if (ts > latestTs) {
      latestTs = ts;
      latest = flight;
    }
  }
  return latest;
}

function Field({
  label,
  field,
  type = 'text',
  width = 'w-24',
  mono = false,
  placeholder = '',
  value,
  set,
  list,
  onBlur,
  error,
}) {
  const responsiveWidth = width.startsWith('sm:') ? width : `sm:${width}`;
  return (
    <label className={`flex flex-col gap-1 w-full ${responsiveWidth}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight min-h-[28px] flex items-end">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => set(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        list={list}
        className={`bg-navy-800 border border-navy-600 text-white px-2 py-2 text-base sm:text-sm w-full ${
          mono ? 'font-mono' : ''
        } placeholder-gray-600 focus:border-amber-500 focus:outline-none ${error ? 'border-red-500' : ''}`}
      />
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </label>
  );
}

export default function FlightForm({ onSave, editFlight, onCancel, pilotName, primaryRole = 'pic', existingFlights = [], t = (key) => key }) {
  const [flight, setFlight] = useState({ ...EMPTY_FLIGHT, picName: pilotName || '' });
  const [formError, setFormError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolverRef = useRef(null);
  const confirmPrimaryButtonRef = useRef(null);

  const regSuggestions = useMemo(
    () => [...new Set(existingFlights.map((f) => (f.reg || '').toUpperCase().trim()).filter(Boolean))].slice(0, 50),
    [existingFlights],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    const latestFlight = pickLatestFlight(existingFlights, editFlight?.id);
    const today = formatDateDMY(new Date());
    if (editFlight) {
      setFlight({ ...EMPTY_FLIGHT, ...editFlight });
    } else {
      setFlight({
        ...EMPTY_FLIGHT,
        picName: pilotName || '',
        date: today,
        depICAO: latestFlight?.arrICAO || '',
        reg: latestFlight?.reg || '',
        acType: latestFlight?.acType || '',
        singlePilotSE: !!latestFlight?.singlePilotSE,
        singlePilotME: !!latestFlight?.singlePilotME,
      });
    }
    setFormError('');
  }, [editFlight, pilotName, existingFlights]);

  useEffect(() => {
    if (!confirmDialog) return;
    confirmPrimaryButtonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        handleConfirmDialog(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDialog]);

  function applyAircraftFromReg(next, regValue) {
    const reg = (regValue || '').toUpperCase().trim();
    if (!reg) return;
    const known = [...existingFlights]
      .reverse()
      .find((f) => (f.reg || '').toUpperCase().trim() === reg && f.id !== editFlight?.id);
    if (!known) return;
    next.reg = reg;
    if (known.acType) next.acType = known.acType;
    next.singlePilotSE = !!known.singlePilotSE;
    next.singlePilotME = !!known.singlePilotME;
  }

  function set(key, value) {
    setFormError('');
    setFlight((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'date' && typeof value === 'string') {
        if (value.includes('-')) {
          const normalized = normalizeDateInput(value);
          if (normalized) next.date = normalized;
        }
      }

      if (key === 'depTime' || key === 'arrTime') {
        const normalized = normalizeTimeInput(value);
        if (normalized) next[key] = normalized;
      }

      if (key === 'reg') {
        applyAircraftFromReg(next, value);
      }

      if (key === 'depTime' || key === 'arrTime') {
        if (next.depTime && next.arrTime) {
          const depMins = parseTime(next.depTime);
          const arrMins = parseTime(next.arrTime);
          const canCalculateSameDay = arrMins >= depMins;
          const total = canCalculateSameDay ? calculateFlightDuration(next.depTime, next.arrTime, false) : '';
          if (total) {
            next.totalTime = total;
            applyTypeDefaults(next, primaryRole);
            recalcNight(next);
          } else {
            next.totalTime = '';
          }
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

  function getInlineErrors(currentFlight) {
    const errors = {};
    const dateNormalized = normalizeDateInput(currentFlight.date || '');
    const depNormalized = normalizeTimeInput(currentFlight.depTime || '');
    const arrNormalized = normalizeTimeInput(currentFlight.arrTime || '');

    if ((currentFlight.date || '').trim() && !dateNormalized) {
      errors.date = t('flightForm.errors.invalidDate', 'Zadej platné datum.');
    }
    if ((currentFlight.depTime || '').trim() && !depNormalized) {
      errors.depTime = t('flightForm.errors.invalidTime', 'Zadej platný čas ve formátu HH:MM.');
    }
    if ((currentFlight.arrTime || '').trim() && !arrNormalized) {
      errors.arrTime = t('flightForm.errors.invalidTime', 'Zadej platný čas ve formátu HH:MM.');
    }
    if ((currentFlight.depICAO || '').trim() && !ICAO_PATTERN.test(currentFlight.depICAO.trim().toUpperCase())) {
      errors.depICAO = t('flightForm.errors.invalidIcao', 'ICAO musí mít 4 písmena.');
    }
    if ((currentFlight.arrICAO || '').trim() && !ICAO_PATTERN.test(currentFlight.arrICAO.trim().toUpperCase())) {
      errors.arrICAO = t('flightForm.errors.invalidIcao', 'ICAO musí mít 4 písmena.');
    }

    if (depNormalized && arrNormalized) {
      const depMins = parseTime(depNormalized);
      const arrMins = parseTime(arrNormalized);
      if (arrMins >= depMins) {
        const total = calculateFlightDuration(depNormalized, arrNormalized, false);
        const totalMins = parseTime(total || '');
        if (!total || totalMins <= 0 || totalMins > MAX_REASONABLE_FLIGHT_MINUTES) {
          errors.arrTime = t('flightForm.errors.durationTooLong', 'Doba letu vypadá neplatně. Zkontroluj OFF/ON BLOCK.');
        }
      }
    }

    return errors;
  }

  const inlineErrors = useMemo(() => getInlineErrors(flight), [flight, t]);

  function askForConfirmation(message) {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({ message });
    });
  }

  function handleConfirmDialog(result) {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
    setConfirmDialog(null);
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
    const normalizedDate = normalizeDateInput(flight.date);
    const depTime = normalizeTimeInput(flight.depTime);
    const arrTime = normalizeTimeInput(flight.arrTime);
    const depMins = parseTime(depTime);
    const arrMinsRaw = parseTime(arrTime);

    if (!normalizedDate) {
      setFormError(t('flightForm.errors.invalidDate', 'Zadej platné datum.'));
      return;
    }
    if (!depTime || !arrTime) {
      setFormError(t('flightForm.errors.invalidTime', 'Zadej platný čas ve formátu HH:MM.'));
      return;
    }

    let isOvernight = false;
    if (arrMinsRaw < depMins) {
      const confirmOvernight = await askForConfirmation(
        t(
          'flightForm.confirms.overnight',
          'ON BLOCK je dříve než OFF BLOCK. Má se let počítat jako přelet přes půlnoc?',
        ),
      );
      if (!confirmOvernight) {
        setFormError(
          t('flightForm.errors.overnightRejected', 'Uprav ON/OFF BLOCK čas a zkus uložení znovu.'),
        );
        return;
      }
      isOvernight = true;
    }

    const calculatedTotal = calculateFlightDuration(depTime, arrTime, isOvernight);
    if (!calculatedTotal) {
      setFormError(t('flightForm.errors.durationInvalid', 'Nepodařilo se spočítat dobu letu.'));
      return;
    }
    const totalMinutes = parseTime(calculatedTotal);
    if (totalMinutes <= 0) {
      setFormError(t('flightForm.errors.durationInvalid', 'Nepodařilo se spočítat dobu letu.'));
      return;
    }
    if (totalMinutes > MAX_REASONABLE_FLIGHT_MINUTES) {
      const confirmLongFlight = await askForConfirmation(
        t(
          'flightForm.confirms.longDuration',
          `Vypočtená doba letu je ${calculatedTotal}. Opravdu uložit?`,
        ).replace('{duration}', calculatedTotal),
      );
      if (!confirmLongFlight) {
        setFormError(t('flightForm.errors.durationTooLong', 'Doba letu vypadá neplatně. Zkontroluj OFF/ON BLOCK.'));
        return;
      }
    }
    if (!flight.depICAO || !flight.arrICAO) {
      setFormError(t('flightForm.errors.requiredRoute', 'Vyplň odletové i příletové letiště.'));
      return;
    }

    const saved = {
      ...flight,
      id: flight.id || generateId(),
      date: normalizedDate,
      depICAO: flight.depICAO.toUpperCase().trim(),
      depTime,
      arrICAO: flight.arrICAO.toUpperCase().trim(),
      arrTime,
      acType: flight.acType.toUpperCase().trim(),
      reg: flight.reg.toUpperCase().trim(),
      totalTime: calculatedTotal,
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
      const latestFlight = pickLatestFlight(existingFlights, null);
      setFlight({
        ...EMPTY_FLIGHT,
        picName: pilotName || '',
        date: formatDateDMY(new Date()),
        depICAO: latestFlight?.arrICAO || '',
        reg: latestFlight?.reg || '',
        acType: latestFlight?.acType || '',
        singlePilotSE: !!latestFlight?.singlePilotSE,
        singlePilotME: !!latestFlight?.singlePilotME,
      });
    }
    setFormError('');
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
        {isMobile ? (
          <label className="flex flex-col gap-1 w-full sm:w-28">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('flightForm.fields.date')}</span>
            <input
              type="date"
              value={dateDmyToIso(flight.date)}
              onChange={(e) => set('date', e.target.value)}
              className={`bg-navy-800 border border-navy-600 text-white px-2 py-2 text-base sm:text-sm w-full font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none ${
                inlineErrors.date ? 'border-red-500' : ''
              }`}
            />
            {inlineErrors.date && <span className="text-[11px] text-red-300">{inlineErrors.date}</span>}
          </label>
        ) : (
          <Field
            label={t('flightForm.fields.date')}
            field="date"
            placeholder="DD.MM.YYYY"
            width="w-28"
            mono
            value={flight.date}
            set={set}
            error={inlineErrors.date}
            onBlur={(e) => {
              const normalized = normalizeDateInput(e.target.value);
              if (normalized) set('date', normalized);
            }}
          />
        )}
        <Field label={t('flightForm.fields.depIcao')} field="depICAO" placeholder="LKPR" width="w-20" mono value={flight.depICAO} set={set} error={inlineErrors.depICAO} />
        {isMobile ? (
          <label className="flex flex-col gap-1 w-full sm:w-20">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('flightForm.fields.offUtc')}</span>
            <input
              type="time"
              value={flight.depTime}
              onChange={(e) => set('depTime', e.target.value)}
              className={`bg-navy-800 border border-navy-600 text-white px-2 py-2 text-base sm:text-sm w-full font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none ${
                inlineErrors.depTime ? 'border-red-500' : ''
              }`}
            />
            {inlineErrors.depTime && <span className="text-[11px] text-red-300">{inlineErrors.depTime}</span>}
          </label>
        ) : (
          <Field
            label={t('flightForm.fields.offUtc')}
            field="depTime"
            placeholder="HH:MM"
            width="w-20"
            mono
            value={flight.depTime}
            set={set}
            error={inlineErrors.depTime}
            onBlur={(e) => {
              const normalized = normalizeTimeInput(e.target.value);
              if (normalized) set('depTime', normalized);
            }}
          />
        )}
        <Field label={t('flightForm.fields.arrIcao')} field="arrICAO" placeholder="LOWL" width="w-20" mono value={flight.arrICAO} set={set} error={inlineErrors.arrICAO} />
        {isMobile ? (
          <label className="flex flex-col gap-1 w-full sm:w-20">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('flightForm.fields.onUtc')}</span>
            <input
              type="time"
              value={flight.arrTime}
              onChange={(e) => set('arrTime', e.target.value)}
              className={`bg-navy-800 border border-navy-600 text-white px-2 py-2 text-base sm:text-sm w-full font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none ${
                inlineErrors.arrTime ? 'border-red-500' : ''
              }`}
            />
            {inlineErrors.arrTime && <span className="text-[11px] text-red-300">{inlineErrors.arrTime}</span>}
          </label>
        ) : (
          <Field
            label={t('flightForm.fields.onUtc')}
            field="arrTime"
            placeholder="HH:MM"
            width="w-20"
            mono
            value={flight.arrTime}
            set={set}
            error={inlineErrors.arrTime}
            onBlur={(e) => {
              const normalized = normalizeTimeInput(e.target.value);
              if (normalized) set('arrTime', normalized);
            }}
          />
        )}
        <Field label={t('flightForm.fields.type')} field="acType" placeholder="BE40" width="w-20" mono value={flight.acType} set={set} />
        <Field
          label={t('flightForm.fields.reg')}
          field="reg"
          placeholder="OK-BEE"
          width="w-24"
          mono
          value={flight.reg}
          set={set}
          list="reg-suggestions"
          onBlur={(e) => set('reg', e.target.value.toUpperCase())}
        />
        <datalist id="reg-suggestions">
          {regSuggestions.map((reg) => (
            <option key={reg} value={reg} />
          ))}
        </datalist>
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

      {formError && (
        <p className="mt-3 text-sm text-red-300">{formError}</p>
      )}

      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => handleConfirmDialog(false)}
        >
          <div
            className="w-full max-w-md bg-navy-800 border border-navy-600 p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-200 mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleConfirmDialog(false)}
                className="bg-navy-700 border border-navy-600 hover:border-amber-500 text-white px-4 py-2 text-sm transition-colors"
              >
                {t('flightForm.confirms.cancel', 'Zrušit')}
              </button>
              <button
                ref={confirmPrimaryButtonRef}
                type="button"
                onClick={() => handleConfirmDialog(true)}
                className="bg-amber-500 hover:bg-amber-400 text-navy-900 font-semibold px-4 py-2 text-sm transition-colors"
              >
                {t('flightForm.confirms.confirm', 'Potvrdit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
