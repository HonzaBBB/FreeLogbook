const DEFAULT_AIRPORTS = {
  LKPR: { lat: 50.1008, lon: 14.2600, name: 'Prague Ruzyně' },
  LKTB: { lat: 49.1513, lon: 16.6944, name: 'Brno Tuřany' },
  LOWL: { lat: 48.2332, lon: 14.1876, name: 'Linz' },
  LOWW: { lat: 48.1102, lon: 16.5697, name: 'Vienna' },
  LOWI: { lat: 47.2602, lon: 11.3439, name: 'Innsbruck' },
  LZIB: { lat: 48.1702, lon: 17.2127, name: 'Bratislava' },
  EDQG: { lat: 49.7294, lon: 11.9611, name: 'Bayreuth' },
  EDTL: { lat: 47.9728, lon: 7.8278, name: 'Lahr' },
  EDDF: { lat: 50.0333, lon: 8.5706, name: 'Frankfurt' },
  EDDM: { lat: 48.3538, lon: 11.7861, name: 'Munich' },
  LEAB: { lat: 38.9483, lon: -1.8635, name: 'Albacete' },
  LEGR: { lat: 37.1887, lon: -3.7774, name: 'Granada' },
  LEMG: { lat: 36.6749, lon: -4.4991, name: 'Málaga' },
  LEBL: { lat: 41.2971, lon: 2.0785, name: 'Barcelona' },
  LEMD: { lat: 40.4719, lon: -3.5626, name: 'Madrid' },
  LFMN: { lat: 43.6584, lon: 7.2159, name: 'Nice' },
  LFPG: { lat: 49.0097, lon: 2.5479, name: 'Paris CDG' },
  LFLB: { lat: 45.6381, lon: 5.8803, name: 'Chambéry' },
  LIMF: { lat: 45.2008, lon: 7.6497, name: 'Turin' },
  LSGG: { lat: 46.2381, lon: 6.1089, name: 'Geneva' },
  LSZH: { lat: 47.4647, lon: 8.5492, name: 'Zurich' },
  ESSP: { lat: 58.5863, lon: 16.1456, name: 'Norrköping' },
  ESSA: { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda' },
  EPWA: { lat: 52.1657, lon: 20.9671, name: 'Warsaw' },
  EHAM: { lat: 52.3086, lon: 4.7639, name: 'Amsterdam Schiphol' },
  EGLL: { lat: 51.4775, lon: -0.4614, name: 'London Heathrow' },
  LPPT: { lat: 38.7756, lon: -9.1354, name: 'Lisbon' },
  LHBP: { lat: 47.4298, lon: 19.2611, name: 'Budapest' },
  LDZA: { lat: 45.7429, lon: 16.0688, name: 'Zagreb' },
  LZTT: { lat: 49.0736, lon: 20.2411, name: 'Poprad-Tatry' },
};

const CUSTOM_AIRPORTS_KEY = 'flightlog_custom_airports';

export function getCustomAirports() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_AIRPORTS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveCustomAirport(icao, lat, lon, name = '') {
  const custom = getCustomAirports();
  custom[icao.toUpperCase()] = { lat: parseFloat(lat), lon: parseFloat(lon), name };
  localStorage.setItem(CUSTOM_AIRPORTS_KEY, JSON.stringify(custom));
}

export function removeCustomAirport(icao) {
  const custom = getCustomAirports();
  delete custom[icao.toUpperCase()];
  localStorage.setItem(CUSTOM_AIRPORTS_KEY, JSON.stringify(custom));
}

export function getAirport(icao) {
  if (!icao) return null;
  const code = icao.toUpperCase().trim();
  const custom = getCustomAirports();
  return custom[code] || DEFAULT_AIRPORTS[code] || null;
}

export function getAllAirports() {
  return { ...DEFAULT_AIRPORTS, ...getCustomAirports() };
}

export function isKnownAirport(icao) {
  return getAirport(icao) !== null;
}
