import React, { useEffect, useMemo, useRef } from 'react';
import type { MeetupMapProps } from './MeetupMap';
import { meetupMapHtml } from './meetup-map-html';
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const channel = useRef(`meetup-${Math.random().toString(36).slice(2)}`).current;
  const html = useMemo(() => meetupMapHtml(latitude, longitude, zoom, channel), [latitude, longitude, zoom, channel]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const p = JSON.parse(event.data);
        if (p.channel === channel && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
      } catch {}
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [channel, onMove]);
  return <iframe ref={frame} title="직거래 위치 지도" srcDoc={html} sandbox="allow-scripts allow-popups"
    referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 300, border: 0, display: 'block' }} />;
}
