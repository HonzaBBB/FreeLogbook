import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getAirport } from '../utils/airports';
import { lookupOurAirport } from '../utils/ourairports';

import 'leaflet/dist/leaflet.css';

/** Malá tečka místo výchozího „špendlíku“ (ten je při mnoha letištích příliš velký). */
const AIRPORT_DOT_ICON = L.divIcon({
  className: 'flight-map-airport-dot',
  html: '<span class="flight-map-airport-dot__inner"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  popupAnchor: [0, -4],
});

/** Souřadnice letiště: nejdřív lokální DB + custom, pak OurAirports index (po načtení v App). */
function getCoordsForIcao(icao) {
  const fromDb = getAirport(icao);
  if (fromDb) {
    return { lat: fromDb.lat, lon: fromDb.lon, name: fromDb.name || icao };
  }
  const fromOur = lookupOurAirport(icao);
  if (fromOur) {
    return { lat: fromOur.lat, lon: fromOur.lon, name: fromOur.name || icao };
  }
  return null;
}

/** Přizoomuje mapu tak, aby byly vidět všechny body; při jednom bodu použije rozumný zoom. */
function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const latLngs = points.map((p) => [p.lat, p.lon]);
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 6);
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 10 });
  }, [map, points]);

  return null;
}

export default function FlightMap({ flights = [], airportsReady = true }) {
  const { routes, airportMarkers, center } = useMemo(() => {
    const routesOut = [];
    /** @type {Map<string, { code: string, lat: number, lon: number, name: string, lines: string[] }>} */
    const airportMap = new Map();

    for (const f of flights) {
      const dep = getCoordsForIcao(f.depICAO);
      const arr = getCoordsForIcao(f.arrICAO);
      if (!dep || !arr) continue;

      const depCode = (f.depICAO || '').toUpperCase().trim();
      const arrCode = (f.arrICAO || '').toUpperCase().trim();
      const label = `${depCode} → ${arrCode}${f.date ? ` (${f.date})` : ''}`;

      routesOut.push({
        id: f.id,
        positions: [
          [dep.lat, dep.lon],
          [arr.lat, arr.lon],
        ],
        label,
      });

      function touchAirport(code, coords) {
        if (!airportMap.has(code)) {
          airportMap.set(code, {
            code,
            lat: coords.lat,
            lon: coords.lon,
            name: coords.name,
            lines: [],
          });
        }
        airportMap.get(code).lines.push(label);
      }
      touchAirport(depCode, dep);
      touchAirport(arrCode, arr);
    }

    const markers = Array.from(airportMap.values()).map((a) => ({
      ...a,
      lines: [...new Set(a.lines)],
    }));

    const allPoints = markers.map((m) => ({ lat: m.lat, lon: m.lon }));
    const defaultCenter = { lat: 50.08, lon: 14.43 };

    return {
      routes: routesOut,
      airportMarkers: markers,
      center: allPoints.length ? allPoints[0] : defaultCenter,
    };
    // airportsReady: po stažení OurAirports se znovu spočítají trasy (lookupOurAirport)
  }, [flights, airportsReady]);

  const fitPoints = useMemo(() => {
    const pts = [];
    for (const m of airportMarkers) {
      pts.push({ lat: m.lat, lon: m.lon });
    }
    return pts;
  }, [airportMarkers]);

  const skipped = flights.length - routes.length;

  return (
    <div className="bg-navy-800 border border-navy-600 p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Mapa letů</h2>
      <p className="text-xs text-gray-500 mb-3">
        Trasy podle ICAO (dep → arr). Letiště bez souřadnic v databázi se přeskočí.
        {skipped > 0 && (
          <span className="text-amber-500/90"> Přeskočeno: {skipped} let(ů).</span>
        )}
      </p>

      {routes.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-navy-600 rounded">
          Žádná trasa k zobrazení — přidej lety nebo počkej na načtení databáze letišť.
        </p>
      ) : (
        <div className="rounded border border-navy-600 overflow-hidden h-[min(70vh,560px)] w-full">
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={5}
            className="h-full w-full z-0"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={fitPoints} />

            {routes.map((r) => (
              <Polyline
                key={r.id}
                positions={r.positions}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 2,
                  opacity: 0.75,
                }}
              />
            ))}

            {airportMarkers.map((a) => (
              <Marker key={a.code} icon={AIRPORT_DOT_ICON} position={[a.lat, a.lon]}>
                <Popup>
                  <div className="text-navy-900 text-sm">
                    <strong>{a.code}</strong>
                    {a.name && <div className="text-gray-700">{a.name}</div>}
                    <ul className="mt-1 list-disc pl-4 text-xs max-h-40 overflow-y-auto">
                      {a.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
