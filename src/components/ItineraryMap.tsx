'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RouteStop {
  day: number;
  name: string;
  place_type: string;
  description?: string;
  lat: number;
  lon: number;
  osm_name?: string | null;
  approximate?: boolean;
  duration_minutes?: number | null;
  entry_fee?: string | null;
  tips?: string | null;
  source_url?: string | null;
}

// One colour per day, so the route reads at a glance.
const DAY_COLOURS = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa'];

function colourFor(day: number) {
  return DAY_COLOURS[(day - 1) % DAY_COLOURS.length];
}

/**
 * Numbered pin as a divIcon.
 *
 * Leaflet's default marker images resolve relative to the CSS and break under
 * bundlers; a divIcon avoids that entirely and lets the number and day colour
 * do the work an itinerary actually needs.
 */
function pin(index: number, day: number, approximate: boolean) {
  const colour = colourFor(day);
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${colour};color:#0a0a0a;
      display:flex;align-items:center;justify-content:center;
      font:600 12px/1 system-ui,sans-serif;
      border:2px solid ${approximate ? '#a1a1aa' : '#0a0a0a'};
      ${approximate ? 'opacity:.6;border-style:dashed;' : ''}
      box-shadow:0 1px 4px rgba(0,0,0,.5);
    ">${index}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** Keep every stop in view as the plan changes. */
function FitBounds({ stops }: { stops: RouteStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (!stops.length) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
  }, [map, stops]);
  return null;
}

export default function ItineraryMap({ stops }: { stops: RouteStop[] }) {
  const located = useMemo(
    () => stops.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number'),
    [stops],
  );

  const byDay = useMemo(() => {
    const m = new Map<number, RouteStop[]>();
    for (const s of located) {
      if (!m.has(s.day)) m.set(s.day, []);
      m.get(s.day)!.push(s);
    }
    return m;
  }, [located]);

  if (!located.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-500">
        Nothing to map yet.
      </div>
    );
  }

  const centre: [number, number] = [located[0].lat, located[0].lon];
  let counter = 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <MapContainer
        center={centre}
        zoom={11}
        scrollWheelZoom
        style={{ height: 460, width: '100%', background: '#18181b' }}
      >
        <TileLayer
          // Standard OSM tiles — free, no key. Attribution is required by the
          // tile usage policy, not optional.
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {[...byDay.entries()].map(([day, dayStops]) => (
          <Polyline
            key={`line-${day}`}
            // Approximate pins are excluded from the drawn route: joining a line
            // to a district centroid implies a road that does not exist.
            positions={dayStops
              .filter((s) => !s.approximate)
              .map((s) => [s.lat, s.lon] as [number, number])}
            pathOptions={{ color: colourFor(day), weight: 3, opacity: 0.75 }}
          />
        ))}

        {located.map((s) => {
          counter += 1;
          return (
            <Marker
              key={`${s.name}-${counter}`}
              position={[s.lat, s.lon]}
              icon={pin(counter, s.day, !!s.approximate)}
            >
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <strong>{s.name}</strong>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                    Day {s.day} · {s.place_type}
                    {s.duration_minutes ? ` · ~${s.duration_minutes} min` : ''}
                  </div>
                  {s.approximate && (
                    <div style={{ color: '#b45309', fontSize: 12, marginTop: 6 }}>
                      Approximate — we could not find this exact place on
                      OpenStreetMap, so this pin shows the surrounding area.
                    </div>
                  )}
                  {s.description && (
                    <p style={{ fontSize: 12, marginTop: 6 }}>{s.description}</p>
                  )}
                  {s.entry_fee && (
                    <div style={{ fontSize: 12 }}>Entry: {s.entry_fee}</div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=16/${s.lat}/${s.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in OSM ↗
                    </a>
                    {s.source_url && (
                      <>
                        {' · '}
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer">
                          Reel ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitBounds stops={located} />
      </MapContainer>
    </div>
  );
}
