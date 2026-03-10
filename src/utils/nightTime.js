import { getAirport } from './airports';
import { parseTime, parseDateDMY, formatTime } from './timeUtils';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * NOAA solar position algorithm — výpočet elevace slunce.
 * Vrací úhel slunce nad/pod horizontem ve stupních.
 */
function solarElevation(date, lat, lon) {
  const jd = getJulianDay(date);
  const jc = (jd - 2451545) / 36525;

  const geomMeanLongSun = (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360;
  const geomMeanAnomSun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);

  const sunEqOfCenter =
    Math.sin(geomMeanAnomSun * DEG_TO_RAD) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * geomMeanAnomSun * DEG_TO_RAD) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * geomMeanAnomSun * DEG_TO_RAD) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * DEG_TO_RAD);

  const meanObliqEcliptic = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * DEG_TO_RAD);

  const sunDeclin = Math.asin(Math.sin(obliqCorr * DEG_TO_RAD) * Math.sin(sunAppLong * DEG_TO_RAD)) * RAD_TO_DEG;

  const varY = Math.tan((obliqCorr / 2) * DEG_TO_RAD) ** 2;
  const eqOfTime =
    4 *
    RAD_TO_DEG *
    (varY * Math.sin(2 * geomMeanLongSun * DEG_TO_RAD) -
      2 * eccentEarthOrbit * Math.sin(geomMeanAnomSun * DEG_TO_RAD) +
      4 * eccentEarthOrbit * varY * Math.sin(geomMeanAnomSun * DEG_TO_RAD) * Math.cos(2 * geomMeanLongSun * DEG_TO_RAD) -
      0.5 * varY * varY * Math.sin(4 * geomMeanLongSun * DEG_TO_RAD) -
      1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * geomMeanAnomSun * DEG_TO_RAD));

  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const trueSolarTime = ((utcHours / 24) * 1440 + eqOfTime + 4 * lon) % 1440;
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const sinLat = Math.sin(lat * DEG_TO_RAD);
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const sinDecl = Math.sin(sunDeclin * DEG_TO_RAD);
  const cosDecl = Math.cos(sunDeclin * DEG_TO_RAD);
  const cosHA = Math.cos(hourAngle * DEG_TO_RAD);

  const elevation = Math.asin(sinLat * sinDecl + cosLat * cosDecl * cosHA) * RAD_TO_DEG;
  return elevation;
}

function getJulianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let jy = y;
  let jm = m;
  if (m <= 2) {
    jy -= 1;
    jm += 12;
  }
  const A = Math.floor(jy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + h / 24 + B - 1524.5;
}

/**
 * Threshold pro civil twilight: slunce 6° pod horizontem.
 * Noc = sluneční elevace < -6°.
 */
const CIVIL_TWILIGHT_ANGLE = -6;

/**
 * Vypočítá noční dobu letu v minutách.
 *
 * Algoritmus: vzorkuje let po minutách, pro každou minutu
 * interpoluje pozici (lin. interpolace lat/lon) a kontroluje
 * sluneční elevaci. Pokud je pod -6° → noc.
 */
export function calculateNightMinutes(flight) {
  const depAirport = getAirport(flight.depICAO);
  const arrAirport = getAirport(flight.arrICAO);

  if (!depAirport || !arrAirport) return 0;

  const flightDate = parseDateDMY(flight.date);
  if (!flightDate) return 0;

  const depMins = parseTime(flight.depTime);
  const arrMinsRaw = parseTime(flight.arrTime);
  const arrMins = arrMinsRaw < depMins ? arrMinsRaw + 24 * 60 : arrMinsRaw;
  const totalFlightMins = arrMins - depMins;

  if (totalFlightMins <= 0) return 0;

  let nightMins = 0;
  const SAMPLE_INTERVAL = 1;

  for (let t = 0; t < totalFlightMins; t += SAMPLE_INTERVAL) {
    const fraction = totalFlightMins > 0 ? t / totalFlightMins : 0;

    const lat = depAirport.lat + (arrAirport.lat - depAirport.lat) * fraction;
    const lon = depAirport.lon + (arrAirport.lon - depAirport.lon) * fraction;

    const currentMinUTC = depMins + t;
    const utcDate = new Date(flightDate);
    utcDate.setUTCHours(0, 0, 0, 0);
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() + currentMinUTC);

    const elevation = solarElevation(utcDate, lat, lon);

    if (elevation < CIVIL_TWILIGHT_ANGLE) {
      nightMins += SAMPLE_INTERVAL;
    }
  }

  return nightMins;
}

/**
 * Vypočítá a vrátí noční dobu jako HH:MM string.
 */
export function calculateNightTime(flight) {
  const nightMins = calculateNightMinutes(flight);
  return formatTime(nightMins);
}
