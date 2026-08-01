'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

import type { Place } from './MapView';
import { categoryOf } from '@/lib/ui';

function pin(index: number, colour: string, approximate?: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:#fff;color:${colour};
      display:flex;align-items:center;justify-content:center;
      font:700 11px/1 system-ui,sans-serif;
      border:2px ${approximate ? 'dashed' : 'solid'} ${colour};
      ${approximate ? 'opacity:.65;' : ''}
      box-shadow:0 1px 4px rgba(0,0,0,.22);
    ">${index}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function Fit({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (!places.length) return;
    map.fitBounds(
      L.latLngBounds(places.map((p) => [p.lat, p.lon] as [number, number])),
      { padding: [60, 60], maxZoom: 12 },
    );
  }, [map, places]);
  return null;
}

export default function LocationMap({
  places,
  onSelect,
}: {
  places: Place[];
  active: string | null;
  onSelect: (k: string) => void;
}) {
  if (!places.length) return <div className="h-full bg-background" />;

  return (
    <MapContainer
      center={[places[0].lat, places[0].lon]}
      zoom={10}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#F4F4F5' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {places.map((p, n) => (
        <Marker
          key={`${p.name}-${n}`}
          position={[p.lat, p.lon]}
          icon={pin(n + 1, categoryOf(p.category).ink, p.approximate)}
          eventHandlers={{ click: () => onSelect(`${p.name}-${n}`) }}
        >
          <Popup>
            <div style={{ minWidth: 190 }}>
              <strong>{p.name}</strong>
              {p.sub && (
                <div style={{ color: '#71717A', fontSize: 12, marginTop: 2 }}>{p.sub}</div>
              )}
              {p.approximate && (
                <div style={{ color: '#B45309', fontSize: 12, marginTop: 6 }}>
                  Approximate — this is the surrounding area, not the venue.
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600 }}
                >
                  Google Maps ↗
                </a>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=16/${p.lat}/${p.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OSM ↗
                </a>
                {p.shortcode && <a href={`/reel/${p.shortcode}`}>Reel →</a>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <Fit places={places} />
    </MapContainer>
  );
}
