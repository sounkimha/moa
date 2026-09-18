// Domestic direct-deal map. Kakao Maps is used here instead of Google because
// Kakao's Korean place data and coordinate-to-address lookup are more reliable
// for the locations where MOA users actually meet.
import { mapCspNonce } from '../lib/maps-config';

export function meetupMapHtml(latitude: number, longitude: number, zoom: number, channel: string, apiKey: string) {
  const initial = JSON.stringify({ latitude, longitude, level: Math.max(1, Math.min(14, Math.round(20 - zoom))), channel }).replace(/</g, '\\u003c');
  const nonce = mapCspNonce();
  const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
  const scriptUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&libraries=services&autoload=false`;
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style${nonceAttribute}>html,body,#map{height:100%;margin:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eaf2ff}#pin{position:absolute;left:50%;top:50%;width:26px;height:26px;background:#3478f6;border:3px solid white;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);z-index:2;pointer-events:none;box-shadow:0 2px 8px #17203344}#error{display:none;position:absolute;inset:0;place-items:center;padding:24px;text-align:center;background:#fff;color:#667085;font-size:14px;z-index:3}</style></head>
<body><div id="map" role="application" aria-label="카카오 직거래 위치 지도"></div><div id="pin"></div><div id="error">카카오 지도를 불러오지 못했어요.<br>잠시 후 다시 시도해주세요.</div>
<script${nonceAttribute}>
var initial=${initial},timer,map,geocoder,chooseToken=0,ready=false,didFail=false;
function send(value){if(didFail&&!value.error)return;var message=JSON.stringify(Object.assign({channel:initial.channel},value));if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
function failed(){if(didFail)return;didFail=true;ready=false;clearTimeout(timer);document.getElementById('pin').style.display='none';document.getElementById('error').style.display='grid';send({error:true})}
function mapRuntimeFailure(event){failed();if(event&&event.preventDefault)event.preventDefault()}
// Do not treat individual tile/resource failures as a fatal map failure. Kakao
// can retry a tile while the map itself is already usable; the timeout below
// still handles a missing/blocked SDK.
window.addEventListener('unhandledrejection',mapRuntimeFailure);
function point(value){return {latitude:value.getLat(),longitude:((value.getLng()+180)%360+360)%360-180}}
function choose(value){
  if(didFail||!ready)return;
  var picked=point(value||map.getCenter()),token=++chooseToken;
  send(picked);
  if(!geocoder)return;
  geocoder.coord2Address(picked.longitude,picked.latitude,function(result,status){
    if(didFail||token!==chooseToken||status!==kakao.maps.services.Status.OK||!result||!result.length)return;
    var item=result[0],road=item.road_address,address=item.address;
    var name=(road&&road.building_name)||(road&&road.address_name)||(address&&address.address_name)||'';
    var formatted=(road&&road.address_name)||(address&&address.address_name)||'';
    send({latitude:picked.latitude,longitude:picked.longitude,name:name,address:formatted});
  });
}
timer=setTimeout(failed,12000);
function initKakaoMap(){
  if(didFail)return;
  try{
    var center=new kakao.maps.LatLng(initial.latitude,initial.longitude);
    map=new kakao.maps.Map(document.getElementById('map'),{center:center,level:initial.level,draggable:true,scrollwheel:true});
    geocoder=new kakao.maps.services.Geocoder();
    kakao.maps.event.addListener(map,'idle',function(){if(!ready){ready=true;clearTimeout(timer);send({ready:true})}});
    kakao.maps.event.addListener(map,'dragend',function(){choose()});
    kakao.maps.event.addListener(map,'click',function(event){map.panTo(event.latLng);choose(event.latLng)});
  }catch(e){failed()}
}
</script><script${nonceAttribute} async defer src="${scriptUrl}"></script><script${nonceAttribute}>function bootKakao(){if(window.kakao&&window.kakao.maps)window.kakao.maps.load(initKakaoMap);else if(!didFail)setTimeout(bootKakao,50)}bootKakao()</script></body></html>`;
}
