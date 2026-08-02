'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useCallback, useEffect, useRef } from 'react';

import type { Place } from './MapView';
import { Thumb } from './Thumb';
import { categoryOf, placeKey } from '@/lib/ui';

function pin(index: number, colour: string, approximate?: boolean, selected?: boolean) {
  const size = selected ? 34 : 26;
  return L.divIcon({
    className: '',
    // The selected pin inverts (solid fill, white numeral) rather than merely
    // growing — size alone is hard to spot among a cluster of equal circles.
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${selected ? colour : '#fff'};color:${selected ? '#fff' : colour};
      display:flex;align-items:center;justify-content:center;
      font:700 ${selected ? 13 : 11}px/1 system-ui,sans-serif;
      border:2px ${approximate ? 'dashed' : 'solid'} ${colour};
      ${approximate && !selected ? 'opacity:.65;' : ''}
      box-shadow:0 ${selected ? '3px 10px' : '1px 4px'} rgba(0,0,0,${selected ? '.3' : '.22'});
      transition:width .15s,height .15s;
    ">${index}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Frame everything on first paint and whenever the filter changes the set. */
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

/**
 * Drives the map from the selection.
 *
 * Without this the rail was inert: MapView tracked `active` and passed it down,
 * but nothing here consumed it, so clicking a place highlighted a row and left
 * the map where it was.
 */
function FlyToActive({
  places,
  active,
  markers,
}: {
  places: Place[];
  active: string | null;
  markers: React.RefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const n = places.findIndex((p, i) => placeKey(p, i) === active);
    if (n < 0) return;
    const p = places[n];
    // Zoom in to street level if we're further out, but never pull the user
    // back out when they've already zoomed past it.
    map.flyTo([p.lat, p.lon], Math.max(map.getZoom(), 14), { duration: 0.7 });
    markers.current?.[active]?.openPopup();
  }, [active, places, map, markers]);
  return null;
}

/** Clicking empty map clears the selection, so the rail can't lie about state. */
function ClearOnBlankClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: () => onClear() });
  return null;
}

export default function LocationMap({
  places,
  active,
  onSelect,
}: {
  places: Place[];
  active: string | null;
  onSelect: (k: string | null) => void;
}) {
  const markers = useRef<Record<string, L.Marker | null>>({});
  const clear = useCallback(() => onSelect(null), [onSelect]);

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
      {places.map((p, n) => {
        const key = placeKey(p, n);
        const selected = active === key;
        return (
          <Marker
            key={key}
            position={[p.lat, p.lon]}
            icon={pin(n + 1, categoryOf(p.category).ink, p.approximate, selected)}
            // Selected pin draws above its neighbours so the larger circle is
            // never clipped by the ones around it.
            zIndexOffset={selected ? 1000 : 0}
            ref={(m) => {
              markers.current[key] = m;
            }}
            eventHandlers={{
              click: () => onSelect(key),
              popupclose: () => onSelect(null),
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {p.shortcode && (
                    <Thumb shortcode={p.shortcode} category={p.category} size={52} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <strong>{p.name}</strong>
                    {p.sub && (
                      <div style={{ color: '#71717A', fontSize: 12, marginTop: 2 }}>{p.sub}</div>
                    )}
                  </div>
                </div>
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
        );
      })}
      <Fit places={places} />
      <FlyToActive places={places} active={active} markers={markers} />
      <ClearOnBlankClick onClear={clear} />
    </MapContainer>
  );
}
