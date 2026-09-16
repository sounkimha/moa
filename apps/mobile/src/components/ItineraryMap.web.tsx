import React, { useMemo } from 'react';
import { Place } from '@moa/domain';

function htmlFor(places: Place[], highlightedPlaceId: string | undefined, apiKey: string) {
  const points = places.map((place, index) => ({
    lat: place.latitude,
    lng: place.longitude,
    name: place.name,
    label: String(index + 1),
    highlighted: place.id === highlightedPlaceId,
  }));
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body,#map{height:100%;margin:0}body{font-family:system-ui;background:#eaf4ff}#error{position:absolute;z-index:5;left:12px;right:12px;top:12px;padding:12px;border:1px solid #dde8f6;border-radius:14px;background:#fff;color:#10213a;font-size:13px;display:none}.provider{position:absolute;z-index:4;left:10px;bottom:24px;padding:5px 8px;border-radius:999px;background:#fffE;color:#5e718c;font-size:11px}</style></head><body><div id="map" role="application" aria-label="Google 여행 일정 지도"></div><div id="error">Google 지도를 불러오지 못했어요. Maps JavaScript API와 허용 도메인을 확인해주세요.</div><div class="provider">Google Maps · 등록된 일정</div><script>
var points=${JSON.stringify(points)};function fail(){document.getElementById('error').style.display='block'}window.gm_authFailure=fail;window.initMoaTripMap=function(){try{if(!window.google||!google.maps||!points.length){fail();return}var bounds=new google.maps.LatLngBounds();var map=new google.maps.Map(document.getElementById('map'),{center:points[0],zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});var path=[];points.forEach(function(p){var position={lat:p.lat,lng:p.lng};bounds.extend(position);path.push(position);new google.maps.Marker({map:map,position:position,title:p.name,label:{text:p.label,color:'#fff',fontWeight:'700'},zIndex:p.highlighted?10:1,icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:p.highlighted?'#0064e8':'#0877f9',fillOpacity:1,strokeColor:'#fff',strokeWeight:3,scale:p.highlighted?12:9}})});if(path.length>1)new google.maps.Polyline({map:map,path:path,geodesic:true,strokeColor:'#0877f9',strokeOpacity:.86,strokeWeight:4});map.fitBounds(bounds,48);document.getElementById('error').style.display='none'}catch(e){fail()}};
</script><script async src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=initMoaTripMap&language=ko&region=KR" onerror="fail()"></script></body></html>`;
}

export function ItineraryMap({ places, highlightedPlaceId }: { places: Place[]; highlightedPlaceId?: string }) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY?.trim() || '';
  const html = useMemo(() => htmlFor(places, highlightedPlaceId, apiKey), [places, highlightedPlaceId, apiKey]);
  return (
    <iframe
      title="Google 여행 일정 지도"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ width: '100%', height: 240, border: 0, display: 'block' }}
    />
  );
}
