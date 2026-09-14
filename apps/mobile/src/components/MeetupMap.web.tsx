import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MeetupMapProps } from './MeetupMap';
import { meetupMapHtml } from './meetup-map-html';
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const channel = useRef(`meetup-${Math.random().toString(36).slice(2)}`).current;
  const html = useMemo(() => meetupMapHtml(latitude, longitude, zoom, channel), [latitude, longitude, zoom, channel]);
  useEffect(() => { setLoading(true); }, [html]);
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
  return <div style={{ position: 'relative', height: 300 }}>
    <iframe ref={frame} title="직거래 위치 지도" srcDoc={html} onLoad={() => setLoading(false)} sandbox="allow-scripts allow-popups"
      referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 300, border: 0, display: 'block' }} />
    {loading && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#eaf2ff', color: '#667085', fontSize: 14 }}>지도를 불러오고 있어요…</div>}
  </div>;
}
