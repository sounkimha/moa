import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { ArrowUpRight, MapPin } from 'lucide-react-native';
import { Place } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { GOOGLE_WEB_MAPS_KEY } from '../lib/maps-config';
import { Row, Stack, Txt } from './ui';

function htmlFor(places: Place[], highlightedPlaceId: string | undefined, apiKey: string) {
  const points = places.map((place, index) => ({ id: place.id, lat: place.latitude, lng: place.longitude, name: place.name, label: String(index + 1), highlighted: place.id === highlightedPlaceId }));
  const data = JSON.stringify(points).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#map{height:100%;margin:0}body{background:#eaf3ff}</style></head><body><div id="map" role="application" aria-label="Google 여행 일정 지도"></div><script>
var points=${data},didFail=false,ready=false;function send(type,id){if(didFail&&type!=='failed')return;parent.postMessage({source:'moa-itinerary',type:type,id:id},'*')}function fail(){if(didFail)return;didFail=true;ready=false;send('failed')}function mapRuntimeFailure(event){fail();if(event&&event.preventDefault)event.preventDefault()}window.addEventListener('error',mapRuntimeFailure);window.addEventListener('unhandledrejection',mapRuntimeFailure);window.gm_authFailure=fail;window.initMoaTripMap=function(){try{if(didFail)return;if(!window.google||!google.maps||!points.length){fail();return}var bounds=new google.maps.LatLngBounds();var map=new google.maps.Map(document.getElementById('map'),{center:points[0],zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});var path=[];points.forEach(function(p){var position={lat:p.lat,lng:p.lng};bounds.extend(position);path.push(position);var marker=new google.maps.Marker({map:map,position:position,title:p.name,label:{text:p.label,color:'#fff',fontWeight:'700'},zIndex:p.highlighted?10:1,icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:p.highlighted?'#2563eb':'#4c86f7',fillOpacity:1,strokeColor:'#fff',strokeWeight:3,scale:p.highlighted?14:11}});marker.addListener('click',function(){if(!ready||didFail)return;send('select',p.id)})});if(path.length>1)new google.maps.Polyline({map:map,path:path,geodesic:true,strokeColor:'#4c86f7',strokeOpacity:.86,strokeWeight:4});if(path.length>1)map.fitBounds(bounds,48);google.maps.event.addListenerOnce(map,'tilesloaded',function(){if(didFail)return;ready=true;send('ready')})}catch(e){fail()}};
</script><script async crossorigin="anonymous" src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=initMoaTripMap&language=ko&region=KR" onerror="fail()"></script></body></html>`;
}

function RoutePreview({ places }: { places: Place[] }) {
  const external = places.length > 1
    ? `https://www.google.com/maps/dir/?api=1&origin=${places[0].latitude},${places[0].longitude}&destination=${places[places.length - 1].latitude},${places[places.length - 1].longitude}${places.length > 2 ? `&waypoints=${encodeURIComponent(places.slice(1, -1).map((place) => `${place.latitude},${place.longitude}`).join('|'))}` : ''}`
    : `https://www.google.com/maps/search/?api=1&query=${places[0].latitude},${places[0].longitude}`;
  return <Pressable accessibilityRole="link" accessibilityLabel="Google 지도에서 경로 보기" onPress={() => { void Linking.openURL(external); }} style={({ pressed }) => ({ minHeight: 64, padding: 12, backgroundColor: c.primarySoft, opacity: pressed ? 0.72 : 1 })}>
    <Row style={{ gap: 10 }}><MapPin size={19} color={c.primaryStrong} /><Stack gap={3} style={{ flex: 1 }}><Txt size={13} weight="600" color={c.primaryStrong}>Google 지도에서 경로 보기</Txt><Txt size={11} color={c.secondary}>지도 미리보기를 사용할 수 없어요.</Txt></Stack><ArrowUpRight size={18} color={c.primaryStrong} /></Row>
  </Pressable>;
}

export function ItineraryMap({ places, highlightedPlaceId, onSelectPlace }: { places: Place[]; highlightedPlaceId?: string; onSelectPlace?: (place: Place) => void }) {
  const apiKey = GOOGLE_WEB_MAPS_KEY;
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const html = useMemo(() => htmlFor(places, highlightedPlaceId, apiKey), [places, highlightedPlaceId, apiKey]);
  const onSelect = useRef(onSelectPlace);
  onSelect.current = onSelectPlace;
  useEffect(() => {
    if (!apiKey || !places.length) return;
    setStatus('loading');
    let failed = false;
    let ready = false;
    const timeout = setTimeout(() => { failed = true; setStatus('failed'); }, 10000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.source !== 'moa-itinerary') return;
      if (event.data.type === 'failed') { failed = true; ready = false; clearTimeout(timeout); setStatus('failed'); }
      if (failed) return;
      if (event.data.type === 'ready') { ready = true; clearTimeout(timeout); setStatus('ready'); }
      if (event.data.type === 'select' && ready) { const place = places.find((item) => item.id === event.data.id); if (place) onSelect.current?.(place); }
    };
    window.addEventListener('message', receive);
    return () => { clearTimeout(timeout); window.removeEventListener('message', receive); };
  }, [html, apiKey]);
  if (!places.length) return null;
  if (!apiKey || status === 'failed') return <RoutePreview places={places} />;
  return <View style={{ height: 260 }}>
    <iframe ref={frame} title="Google 여행 일정 지도" srcDoc={html} sandbox="allow-scripts allow-same-origin" referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 260, border: 0, display: 'block' }} />
    {status === 'loading' && <View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 12, right: 12, padding: 12, borderRadius: 12, backgroundColor: c.surface }}><Txt size={13} color={c.secondary}>여행 경로를 불러오고 있어요.</Txt></View>}
  </View>;
}
