'use client';

import { useEffect, useRef, useState } from 'react';

export interface LivePosition {
  lat: number;
  lon: number;
  at: string;
}

export type RelayStatus = 'off' | 'connecting' | 'live' | 'error';

/**
 * Where the phone relay publishes.
 *
 * NEXT_PUBLIC_RELAY_URL wins, but it is baked in at build time, so a hardcoded
 * default means a rebuild every time the machine's address changes — and a
 * wrong one fails silently as "no alerts". Falling back to the host serving the
 * page makes the common setup (relay and site on the same laptop) work with no
 * configuration at all.
 */
export function relayUrl(): string {
  const configured = process.env.NEXT_PUBLIC_RELAY_URL;
  if (configured) return configured;
  if (typeof window === 'undefined') return 'ws://localhost:8787';
  return `ws://${window.location.hostname}:8787`;
}

/**
 * Subscribes to the phone's location relay.
 *
 * Off by default and driven by an explicit toggle: the relay only exists on the
 * demo machine, so connecting on page load would mean every other visit retries
 * a socket that is never coming up.
 *
 * Frames are accepted as {lat,lng}, {lat,lon} or {latitude,longitude} — the
 * relay and its sender have disagreed about this more than once, and a demo is
 * the worst place to discover a key name mismatch.
 */
export function useLiveLocation(enabled: boolean) {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [status, setStatus] = useState<RelayStatus>('off');
  const sock = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      sock.current?.close();
      sock.current = null;
      if (retry.current) clearTimeout(retry.current);
      setStatus('off');
      setPosition(null);
      return;
    }

    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setStatus('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(relayUrl());
      } catch {
        setStatus('error');
        return;
      }
      sock.current = ws;

      ws.onopen = () => !stopped && setStatus('live');

      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string);
          const lat = d.lat ?? d.latitude;
          const lon = d.lng ?? d.lon ?? d.longitude;
          if (typeof lat !== 'number' || typeof lon !== 'number') return;
          setPosition({ lat, lon, at: d.timestamp ?? new Date().toISOString() });
        } catch {
          // A malformed frame is not worth tearing the connection down for.
        }
      };

      ws.onerror = () => !stopped && setStatus('error');

      ws.onclose = () => {
        if (stopped) return;
        setStatus('error');
        // The relay is usually a laptop script; assume it will come back.
        retry.current = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry.current) clearTimeout(retry.current);
      sock.current?.close();
      sock.current = null;
    };
  }, [enabled]);

  return { position, status };
}
