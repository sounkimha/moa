import type { Place } from '@moa/domain';
import { mapCspNonce } from '../lib/maps-config';

type MapPlace = Pick<Place, 'id' | 'name' | 'region' | 'latitude' | 'longitude' | 'visitors' | 'requestCount'>;

// Only public place data enters the embedded map document.
export function googleRouteMapHtml(places: MapPlace[], selected: string | undefined, apiKey: string, channel: string) {
  const data = places.slice(0, 50).map(({ id, name, region, latitude, longitude, visitors, requestCount }) => ({
    id, name, region, latitude, longitude, visitors, requestCount,
  }));
  const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const nonce = mapCspNonce();
  const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style${nonceAttribute}>
html,body,#map{height:100%;margin:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eaf2ff}
#loading,#error{position:absolute;inset:0;display:grid;place-items:center;background:#eaf2ff;color:#5e6c84;font-size:14px;z-index:5;text-align:center;padding:24px}
#error{display:none;background:#fff}.gm-style .gm-style-iw-c{border-radius:14px;padding:0}.gm-style .gm-style-iw-d{overflow:auto!important}
.info{padding:12px 14px 10px;min-width:150px}.name{font-weight:750;color:#14213d;font-size:14px}.meta{margin-top:5px;color:#5e6c84;font-size:12px}
</style></head><body><div id="map" role="application" aria-label="Google 장소 지도"></div><div id="loading">Google 지도를 불러오고 있어요…</div><div id="error">지도를 불러오지 못했어요.<br>잠시 후 다시 시도해주세요.</div>
<script${nonceAttribute}>
var items=${safeJson(data)};var chosen=${safeJson(selected || '')};
function send(value){if(failed&&!value.error)return;var message=JSON.stringify(Object.assign({channel:${safeJson(channel)}},value));if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
var failed=false,ready=false;
var waitTimer=setTimeout(fail,12000);
function fail(){if(failed)return;failed=true;ready=false;clearTimeout(waitTimer);document.getElementById('loading').style.display='none';document.getElementById('error').style.display='grid';send({error:true})}
// These listeners exist only inside this SDK document, never on the app window.
function mapRuntimeFailure(event){fail();if(event&&event.preventDefault)event.preventDefault()}
window.addEventListener('error',mapRuntimeFailure);
window.addEventListener('unhandledrejection',mapRuntimeFailure);
window.gm_authFailure=fail;
function initMap(){try{
 if(failed)return;
 if(!items.length){fail();return}
 var active=items.find(function(item){return item.id===chosen})||items[0];
 var map=new google.maps.Map(document.getElementById('map'),{center:{lat:active.latitude,lng:active.longitude},zoom:13,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false,gestureHandling:'greedy'});
 var info=new google.maps.InfoWindow();
 items.forEach(function(item){var marker=new google.maps.Marker({map:map,position:{lat:item.latitude,lng:item.longitude},title:item.name,label:{text:String(item.requestCount),color:'#fff',fontSize:'11px',fontWeight:'700'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:item.id===chosen?18:16,fillColor:item.id===chosen?'#17366f':'#3478f6',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
 marker.addListener('click',function(){if(failed||!ready)return;info.setContent('<div class="info"><div class="name">'+escapeHtml(item.name)+'</div><div class="meta">'+escapeHtml(item.region)+' · 부탁 '+item.requestCount+'건 (예시)</div></div>');info.open({map:map,anchor:marker});send({placeId:item.id})})});
 google.maps.event.addListenerOnce(map,'idle',function(){if(failed)return;ready=true;clearTimeout(waitTimer);document.getElementById('loading').style.display='none';send({ready:true})});
 }catch(e){fail()}}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
</script><script${nonceAttribute} async defer crossorigin="anonymous" src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&language=ko&region=KR&callback=initMap"></script></body></html>`;
}

// Google consumer URLs are not embeddable and the official Embed API needs a
// key. In Korean zero-key local mode, Kakao Map's public map page is the visual
// fallback. It is not used to read coordinates; official Google SDK remains the
// only in-app drag/click coordinate picker.
export function kakaoMapEmbedUrl(place: Pick<Place, 'latitude' | 'longitude'>) {
  return `https://map.kakao.com/link/map/${encodeURIComponent('만남 위치')},${place.latitude},${place.longitude}`;
}

export function googlePlaceUrl(place: Pick<Place, 'latitude' | 'longitude'>) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
}
