// No personal labels enter the embedded document; only coordinates cross the bridge.
// The public OSM tile endpoint blocks this app's requests. Use the configured Google
// Maps JavaScript API instead of showing users the provider's 403 tile image.
export function meetupMapHtml(latitude: number, longitude: number, zoom: number, channel: string, apiKey: string) {
  const initial = JSON.stringify({ latitude, longitude, zoom, channel }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#map{height:100%;margin:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eaf2ff}#pin{position:absolute;left:50%;top:50%;width:26px;height:26px;background:#3478f6;border:3px solid white;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);z-index:2;pointer-events:none;box-shadow:0 2px 8px #17203344}#error{display:none;position:absolute;inset:0;place-items:center;padding:24px;text-align:center;background:#fff;color:#667085;font-size:14px;z-index:3}</style></head>
<body><div id="map" role="application" aria-label="직거래 위치 지도"></div><div id="pin"></div><div id="error">지도를 불러오지 못했어요.<br>다시 시도하거나 Google 지도에서 확인해주세요.</div>
<script>
var initial=${initial},timer,map,ready=false,didFail=false;
function send(value){if(didFail&&!value.error)return;var message=JSON.stringify(Object.assign({channel:initial.channel},value));if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
function failed(){if(didFail)return;didFail=true;ready=false;clearTimeout(timer);document.getElementById('pin').style.display='none';document.getElementById('error').style.display='grid';send({error:true})}
// SDK failures are handled inside this isolated map document only.
function mapRuntimeFailure(event){failed();if(event&&event.preventDefault)event.preventDefault()}
window.addEventListener('error',mapRuntimeFailure);
window.addEventListener('unhandledrejection',mapRuntimeFailure);
function point(value){return {latitude:value.lat(),longitude:((value.lng()+180)%360+360)%360-180}}
function choose(value){if(didFail||!ready)return;send(point(value||map.getCenter()))}
timer=setTimeout(failed,12000);
window.gm_authFailure=failed;
function initMeetupMap(){
  if(didFail)return;
  if(!window.google||!google.maps){failed();return}
  try{
    map=new google.maps.Map(document.getElementById('map'),{center:{lat:initial.latitude,lng:initial.longitude},zoom:initial.zoom,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false,gestureHandling:'greedy'});
    google.maps.event.addListenerOnce(map,'tilesloaded',function(){if(didFail)return;ready=true;clearTimeout(timer);send({ready:true})});
    map.addListener('dragend',function(){choose()});
    map.addListener('click',function(event){if(didFail||!ready)return;map.panTo(event.latLng);choose(event.latLng)});
  }catch(e){failed()}
}
</script><script async defer crossorigin="anonymous" src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=ko&region=KR&callback=initMeetupMap" onerror="failed()"></script></body></html>`;
}
