// No personal labels enter the embedded document; only coordinates cross the bridge.
export function meetupMapHtml(latitude: number, longitude: number, zoom: number, channel: string, appKey: string) {
  const level = Math.max(1, Math.min(14, 20 - zoom));
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body,#map{height:100%;margin:0;overflow:hidden}#map{touch-action:none;overscroll-behavior:contain}body{font-family:system-ui;background:#eaf4ff}#pin{position:absolute;left:50%;top:50%;width:24px;height:24px;background:#0877f9;border:3px solid white;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);z-index:10;pointer-events:none;box-shadow:0 3px 10px #0a4a9b44}#error{position:absolute;top:10px;left:10px;right:10px;z-index:20;background:#fff;padding:12px;border:1px solid #dde8f6;border-radius:14px;font-size:13px;color:#10213a;display:none;box-shadow:0 5px 18px #0a4a9b22}</style></head>
<body><div id="map" role="application" aria-label="카카오 직거래 위치 지도"></div><div id="pin"></div><div id="error">카카오맵을 불러오지 못했어요. JavaScript 키와 허용 도메인을 확인해주세요.</div>
<script>
function send(value){var message=JSON.stringify(Object.assign({channel:${JSON.stringify(channel)}},value));if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
function fail(){document.getElementById('error').style.display='block';send({error:true})}
window.initKakaoMap=function(){if(!window.kakao||!kakao.maps){fail();return}kakao.maps.load(function(){
try{var center=new kakao.maps.LatLng(${latitude},${longitude});var map=new kakao.maps.Map(document.getElementById('map'),{center:center,level:${level},draggable:true,scrollwheel:true});map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);map.setDraggable(true);map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
function changed(){var p=map.getCenter();send({latitude:p.getLat(),longitude:p.getLng()})}
var clickPending=false;kakao.maps.event.addListener(map,'idle',function(){if(clickPending){clickPending=false;changed()}});kakao.maps.event.addListener(map,'dragend',changed);kakao.maps.event.addListener(map,'click',function(e){clickPending=true;map.panTo(e.latLng)});document.getElementById('error').style.display='none';send({ready:true});
}catch(e){fail()}})};
</script><script src="https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(appKey)}" onload="initKakaoMap()" onerror="fail()"></script></body></html>`;
}
