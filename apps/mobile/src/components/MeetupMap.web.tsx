import React, { useEffect, useRef, useState } from 'react';
import type { MeetupMapProps } from './MeetupMap';

type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};
type KakaoPoint = { x: number; y: number };

type KakaoMap = {
  addControl(control: unknown, position: unknown): void;
  getCenter(): KakaoLatLng;
  getLevel(): number;
  getProjection(): {
    containerPointFromCoords(position: KakaoLatLng): KakaoPoint;
    coordsFromContainerPoint(point: KakaoPoint): KakaoLatLng;
  };
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  setDraggable(draggable: boolean): void;
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
  setMapTypeId(mapTypeId: unknown): void;
};

type KakaoMaps = {
  ControlPosition: { RIGHT: unknown };
  MapTypeId: { ROADMAP: unknown };
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Point: new (x: number, y: number) => KakaoPoint;
  Map: new (element: HTMLElement, options: { center: KakaoLatLng; level: number; draggable: boolean; scrollwheel: boolean }) => KakaoMap;
  ZoomControl: new () => unknown;
  event: {
    addListener(target: KakaoMap, event: string, listener: (event?: { latLng: KakaoLatLng }) => void): void;
    removeListener(target: KakaoMap, event: string, listener: (event?: { latLng: KakaoLatLng }) => void): void;
  };
  load(callback: () => void): void;
};

declare global {
  interface Window {
    kakao?: { maps?: KakaoMaps };
  }
}

let kakaoMapsPromise: Promise<KakaoMaps> | undefined;

function loadKakaoMaps(appKey: string) {
  if (!appKey) return Promise.reject(new Error('missing Kakao JavaScript key'));
  if (window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  if (kakaoMapsPromise) return kakaoMapsPromise;
  kakaoMapsPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const finish = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error('Kakao Maps SDK did not initialize'));
        return;
      }
      maps.load(() => resolve(maps));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-moa-kakao-map]');
    if (existing) {
      if (window.kakao?.maps) finish();
      else {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', () => reject(new Error('Kakao Maps SDK failed to load')), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.dataset.moaKakaoMap = 'true';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(appKey)}`;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Kakao Maps SDK failed to load')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapsPromise = undefined;
    throw error;
  });
  return kakaoMapsPromise;
}

function mapLevel(zoom: number) {
  return Math.max(1, Math.min(14, 20 - zoom));
}

export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAPS_JS_KEY?.trim() || '';
  const element = useRef<HTMLDivElement>(null);
  const dragSurface = useRef<HTMLDivElement>(null);
  const map = useRef<KakaoMap | undefined>(undefined);
  const mapsApi = useRef<KakaoMaps | undefined>(undefined);
  const latestView = useRef({ latitude, longitude, zoom });
  const latestOnMove = useRef(onMove);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  latestView.current = { latitude, longitude, zoom };
  latestOnMove.current = onMove;

  useEffect(() => {
    let active = true;
    let idle: (() => void) | undefined;
    let dragEnd: (() => void) | undefined;
    let click: ((event?: { latLng: KakaoLatLng }) => void) | undefined;
    let instance: KakaoMap | undefined;
    let clickPending = false;
    setStatus('loading');
    loadKakaoMaps(appKey)
      .then((maps) => {
        if (!active || !element.current) return;
        const view = latestView.current;
        instance = new maps.Map(element.current, {
          center: new maps.LatLng(view.latitude, view.longitude),
          level: mapLevel(view.zoom),
          draggable: true,
          scrollwheel: true,
        });
        instance.setMapTypeId(maps.MapTypeId.ROADMAP);
        instance.setDraggable(true);
        instance.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        const reportCenter = () => {
          const center = instance?.getCenter();
          if (center) latestOnMove.current(center.getLat(), center.getLng());
        };
        idle = () => {
          if (!clickPending) return;
          clickPending = false;
          reportCenter();
        };
        dragEnd = reportCenter;
        click = (event) => {
          if (event?.latLng) {
            clickPending = true;
            instance?.panTo(event.latLng);
          }
        };
        maps.event.addListener(instance, 'idle', idle);
        maps.event.addListener(instance, 'dragend', dragEnd);
        maps.event.addListener(instance, 'click', click);
        mapsApi.current = maps;
        map.current = instance;
        requestAnimationFrame(() => instance?.relayout());
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      if (instance && idle) mapsApi.current?.event.removeListener(instance, 'idle', idle);
      if (instance && dragEnd) mapsApi.current?.event.removeListener(instance, 'dragend', dragEnd);
      if (instance && click) mapsApi.current?.event.removeListener(instance, 'click', click);
      map.current = undefined;
      mapsApi.current = undefined;
    };
  }, [appKey]);

  useEffect(() => {
    const instance = map.current;
    const maps = mapsApi.current;
    if (!instance || !maps) return;
    const center = instance.getCenter();
    if (Math.abs(center.getLat() - latitude) > 0.0000001 || Math.abs(center.getLng() - longitude) > 0.0000001)
      instance.setCenter(new maps.LatLng(latitude, longitude));
    const level = mapLevel(zoom);
    if (instance.getLevel() !== level) instance.setLevel(level);
  }, [latitude, longitude, zoom]);
  useEffect(() => {
    const surface = dragSurface.current;
    if (!surface) return;
    let gesture: { id: number; x: number; y: number; moved: boolean } | null = null;
    const reportCenter = () => {
      const center = map.current?.getCenter();
      if (center) latestOnMove.current(center.getLat(), center.getLng());
    };
    const down = (event: PointerEvent) => {
      if (!map.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      // A new press also recovers from a pointer-up lost by an enclosing scroll view.
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    };
    const move = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture.x = event.clientX;
      gesture.y = event.clientY;
      if (!dx && !dy) return;
      gesture.moved = true;
      const instance = map.current;
      const maps = mapsApi.current;
      if (!instance || !maps) return;
      const projection = instance.getProjection();
      const centerPoint = projection.containerPointFromCoords(instance.getCenter());
      instance.setCenter(projection.coordsFromContainerPoint(new maps.Point(centerPoint.x - dx, centerPoint.y - dy)));
    };
    const end = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const moved = gesture.moved;
      gesture = null;
      if (moved) reportCenter();
      else if (event.type !== 'pointercancel') {
        const instance = map.current;
        const maps = mapsApi.current;
        if (!instance || !maps || !element.current) return;
        const bounds = element.current.getBoundingClientRect();
        instance.setCenter(instance.getProjection().coordsFromContainerPoint(new maps.Point(event.clientX - bounds.left, event.clientY - bounds.top)));
        reportCenter();
      }
    };
    surface.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    return () => {
      surface.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
    };
  }, []);

  return (
    <div style={{ position: 'relative', height: 300, overflow: 'hidden', background: '#eaf4ff', touchAction: 'none', overscrollBehavior: 'contain' }}>
      <div ref={element} role="application" aria-label="카카오 직거래 위치 지도"
        style={{ width: '100%', height: 300, touchAction: 'none', cursor: 'grab', userSelect: 'none' }} />
      <div ref={dragSurface} data-testid="meetup-map-drag-surface" aria-label="지도를 손으로 이동"
        style={{ position: 'absolute', zIndex: 2, top: 0, bottom: 0, left: 0, right: 44, touchAction: 'none', overscrollBehavior: 'contain', cursor: 'grab', userSelect: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 24, height: 24, background: '#0877f9', border: '3px solid white', borderRadius: '50% 50% 50% 0', transform: 'translate(-50%,-100%) rotate(-45deg)', zIndex: 3, pointerEvents: 'none', boxShadow: '0 3px 10px #0a4a9b44' }} />
      {status === 'loading' && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#eaf4ff', color: '#5e718c', fontSize: 14, zIndex: 4 }}>지도를 불러오고 있어요…</div>}
      {status === 'error' && <div role="alert" style={{ position: 'absolute', left: 10, right: 10, top: 10, zIndex: 4, background: '#fff', padding: 12, border: '1px solid #dde8f6', borderRadius: 14, color: '#10213a', fontSize: 13 }}>카카오맵을 불러오지 못했어요. JavaScript 키와 허용 도메인을 확인해주세요.</div>}
    </div>
  );
}
