// No personal labels enter the embedded document; only coordinates cross the bridge.
export function meetupMapHtml(latitude: number, longitude: number, zoom: number, channel: string) {
  return `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}body{font-family:system-ui;background:#eaf2ff}#pin{position:absolute;left:50%;top:50%;width:24px;height:24px;background:#3478f6;border:3px solid white;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);z-index:600;pointer-events:none;box-shadow:0 2px 8px #17203344}#error{position:absolute;top:8px;left:52px;right:8px;z-index:700;background:white;padding:10px;border-radius:8px;font-size:13px;display:none}</style></head>
<body><div id="map" role="application" aria-label="직거래 위치 지도"></div><div id="pin"></div><div id="error">지도를 불러오지 못했어요. 연결을 확인한 뒤 다시 열어주세요.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
function send(value){var message=JSON.stringify(Object.assign({channel:${JSON.stringify(channel)}},value));if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
if(!window.L){document.getElementById('error').style.display='block';send({error:true})}else{
var map=L.map('map',{scrollWheelZoom:false}).setView([${latitude},${longitude}],${zoom});
var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}).addTo(map);
tiles.on('tileerror',function(){document.getElementById('error').style.display='block'});
tiles.on('tileload',function(){document.getElementById('error').style.display='none'});
function changed(){var p=map.getCenter();send({latitude:p.lat,longitude:p.lng})}
map.on('moveend',changed);map.on('click',function(e){map.panTo(e.latlng)});send({ready:true});
}
</script></body></html>`;
}
