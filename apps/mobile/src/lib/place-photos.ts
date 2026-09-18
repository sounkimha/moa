import type { ImageSourcePropType } from 'react-native';
import type { Place } from '@moa/domain';
import landmarks from './landmark-photos.json';

type PlacePhoto = {
  source: ImageSourcePropType;
  label: string;
  author: string;
  license: string;
  url: string;
};

const commonsPhoto = (label: string, imageUrl: string, sourceUrl: string): PlacePhoto => ({
  source: { uri: imageUrl },
  label,
  author: 'Wikimedia Commons contributors',
  license: 'Wikimedia Commons · 원본 페이지 기준',
  url: sourceUrl,
});

const photos: Record<string, PlacePhoto> = {
  'p-shibuya': {
    source: require('../../assets/tokyo-shibuya.jpg'),
    label: '도쿄 · 시부야 교차로',
    author: 'David Kernan',
    license: 'CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Shibuya_Crossing,_Aerial.jpg',
  },
  'p-station': {
    source: require('../../assets/tokyo-station.jpg'),
    label: '도쿄 · 도쿄역',
    author: 'MaedaAkihiko',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Tokyo-STA_Marunouchi-Entrance_2023.jpg',
  },
  'p-disney': {
    source: require('../../assets/tokyo-disneysea.jpg'),
    label: '도쿄 근교 · 디즈니씨',
    author: 'Louiemantia',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Mt_Prometheus_at_Tokyo_DisneySea.jpg',
  },
  'p-osaka': {
    source: require('../../assets/osaka-dotonbori.jpg'),
    label: '오사카 · 도톤보리',
    author: 'Type specimen',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_Ebisu_Bridge.jpg',
  },
  'p-fukuoka': {
    source: require('../../assets/fukuoka-hakata.jpg'),
    label: '후쿠오카 · 하카타역',
    author: 'Hakataman',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hakata_Station_illuminations.JPG',
  },
  'p-sapporo': {
    source: require('../../assets/sapporo-odori.jpg'),
    label: '삿포로 · 오도리공원',
    author: 'Nkns',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hokkaido_Sapporo_Odori_Park.jpg',
  },
  'p-seongsu': {
    source: require('../../assets/seoul-seongsu-popup-street.jpg'),
    label: '서울 · 성수 팝업 거리',
    author: 'MOA',
    license: 'AI 생성 이미지 · 체험용',
    url: 'https://openai.com/policies/terms-of-use/',
  },
  seoul: { ...landmarks.seoul, source: require('../../assets/seoul-gyeongbokgung.jpg') },
  jeju: { ...landmarks.jeju, source: require('../../assets/jeju-seongsan.jpg') },
  taipei: { ...landmarks.taipei, source: require('../../assets/taipei-101.jpg') },
  kaohsiung: { ...landmarks.kaohsiung, source: require('../../assets/kaohsiung-dragon-tiger-pagodas.jpg') },
  hongkong: { ...landmarks.hongkong, source: require('../../assets/hongkong-victoria-harbour.jpg') },
  shanghai: { ...landmarks.shanghai, source: require('../../assets/shanghai-pudong.jpg') },
  beijing: { ...landmarks.beijing, source: require('../../assets/beijing-temple-of-heaven.jpg') },
  bangkok: { ...landmarks.bangkok, source: require('../../assets/bangkok-wat-arun.jpg') },
  chiangmai: { ...landmarks.chiangmai, source: require('../../assets/chiangmai-doi-suthep.jpg') },
  danang: { ...landmarks.danang, source: require('../../assets/danang-dragon-bridge.jpg') },
  hanoi: { ...landmarks.hanoi, source: require('../../assets/hanoi-hoan-kiem.jpg') },
  hochiminh: { ...landmarks.hochiminh, source: require('../../assets/hochiminh-central-post-office.jpg') },
  singapore: { ...landmarks.singapore, source: require('../../assets/singapore-marina-bay.jpg') },
  kualalumpur: { ...landmarks.kualalumpur, source: require('../../assets/kualalumpur-petronas.jpg') },
  bali: { ...landmarks.bali, source: require('../../assets/bali-ulun-danu.jpg') },
  jakarta: { ...landmarks.jakarta, source: require('../../assets/jakarta-monas.jpg') },
  'world-new-york': commonsPhoto(
    '미국 · 뉴욕 스카이라인',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Long_Island_City_New_York_May_2015_panorama_3.jpg/960px-Long_Island_City_New_York_May_2015_panorama_3.jpg',
    'https://commons.wikimedia.org/wiki/File:Long_Island_City_New_York_May_2015_panorama_3.jpg',
  ),
  'world-los-angeles': commonsPhoto(
    '미국 · 로스앤젤레스',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Los_Angeles_Pollution.jpg/960px-Los_Angeles_Pollution.jpg',
    'https://commons.wikimedia.org/wiki/File:Los_Angeles_Pollution.jpg',
  ),
  'world-san-francisco': commonsPhoto(
    '미국 · 샌프란시스코',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg/960px-San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg',
    'https://commons.wikimedia.org/wiki/File:San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg',
  ),
  'world-vancouver': commonsPhoto(
    '캐나다 · 밴쿠버',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Vancouver_dusk_pano.jpg/960px-Vancouver_dusk_pano.jpg',
    'https://commons.wikimedia.org/wiki/File:Vancouver_dusk_pano.jpg',
  ),
  'world-toronto': commonsPhoto(
    '캐나다 · 토론토',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg/960px-Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg',
    'https://commons.wikimedia.org/wiki/File:Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg',
  ),
  'world-mexico': commonsPhoto(
    '멕시코 · 멕시코시티',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Mexico_City_Skyline_%285604867225%29.jpg/960px-Mexico_City_Skyline_%285604867225%29.jpg',
    'https://commons.wikimedia.org/wiki/File:Mexico_City_Skyline_(5604867225).jpg',
  ),
  'world-rio': commonsPhoto(
    '브라질 · 리우데자네이루',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset%2C_Brazil_3.jpg/960px-Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset%2C_Brazil_3.jpg',
    'https://commons.wikimedia.org/wiki/File:Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset,_Brazil_3.jpg',
  ),
  'world-buenos-aires': commonsPhoto(
    '아르헨티나 · 부에노스아이레스',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg/960px-193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg',
    'https://commons.wikimedia.org/wiki/File:193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg',
  ),
  'world-lima': commonsPhoto(
    '페루 · 리마',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Lima%2C_Urban_Skyline--Ciudad_de_Lima%2C_Skyline_urbano.jpg/960px-Lima%2C_Urban_Skyline--Ciudad_de_Lima%2C_Skyline_urbano.jpg',
    'https://commons.wikimedia.org/wiki/File:Lima,_Urban_Skyline--Ciudad_de_Lima,_Skyline_urbano.jpg',
  ),
  'world-london': commonsPhoto(
    '세계 · 대표 도시 풍경',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/London_Skyline_from_Waterloo_Bridge%2C_London%2C_UK_-_Diliff.jpg/960px-London_Skyline_from_Waterloo_Bridge%2C_London%2C_UK_-_Diliff.jpg',
    'https://commons.wikimedia.org/wiki/File:London_Skyline_from_Waterloo_Bridge,_London,_UK_-_Diliff.jpg',
  ),
};

// 도시가 같은 나라에 있다는 이유로 대표 사진을 재사용하지 않도록,
// 해외 도시/지역은 각 장소에 맞는 Wikimedia Commons 사진을 우선 사용한다.
const citySpecificPhotos: Record<string, PlacePhoto> = {
  뉴욕: commonsPhoto('미국 · 뉴욕 대표 풍경', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/New_Croton_Dam_NY1.jpg/960px-New_Croton_Dam_NY1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:New_Croton_Dam_NY1.jpg'),
  로스앤젤레스: commonsPhoto('미국 · 로스앤젤레스 산타모니카', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Los_Angeles_%28California%2C_USA%29%2C_Santa_Monica_Beach_--_2012_--_5308.jpg/960px-Los_Angeles_%28California%2C_USA%29%2C_Santa_Monica_Beach_--_2012_--_5308.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Los_Angeles_(California,_USA),_Santa_Monica_Beach_--_2012_--_5308.jpg'),
  샌프란시스코: commonsPhoto('미국 · 샌프란시스코 금문교', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/San_Francisco_%28CA%2C_USA%29%2C_Golden_Gate_Bridge_--_2022_--_3023_%28bw%29.jpg/960px-San_Francisco_%28CA%2C_USA%29%2C_Golden_Gate_Bridge_--_2022_--_3023_%28bw%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:San_Francisco_(CA,_USA),_Golden_Gate_Bridge_--_2022_--_3023_(bw).jpg'),
  하와이: commonsPhoto('미국 · 하와이 와이키키', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Waikiki_Landmark_in_Honolulu%2C_Hawaii.jpg/960px-Waikiki_Landmark_in_Honolulu%2C_Hawaii.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Waikiki_Landmark_in_Honolulu,_Hawaii.jpg'),
  밴쿠버: commonsPhoto('캐나다 · 밴쿠버', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Empire_Landmark_Hotel_Vancouver_BC.JPG/960px-Empire_Landmark_Hotel_Vancouver_BC.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Empire_Landmark_Hotel_Vancouver_BC.JPG'),
  토론토: commonsPhoto('캐나다 · 토론토', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Windows_of_the_Frost_Building_%28Toronto%2C_Canada%29.jpg/960px-Windows_of_the_Frost_Building_%28Toronto%2C_Canada%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Windows_of_the_Frost_Building_(Toronto,_Canada).jpg'),
  몬트리올: commonsPhoto('캐나다 · 몬트리올 노트르담', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Bas%C3%ADlica_de_Notre-Dame%2C_Montreal%2C_Canad%C3%A1%2C_2017-08-11%2C_DD_20-22_HDR.jpg/960px-Bas%C3%ADlica_de_Notre-Dame%2C_Montreal%2C_Canad%C3%A1%2C_2017-08-11%2C_DD_20-22_HDR.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Bas%C3%ADlica_de_Notre-Dame,_Montreal,_Canad%C3%A1,_2017-08-11,_DD_20-22_HDR.jpg'),
  멕시코시티: commonsPhoto('멕시코 · 멕시코시티', 'https://upload.wikimedia.org/wikipedia/commons/5/52/Mexico_City_6_cropped.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Mexico_City_6_cropped.jpg'),
  칸쿤: commonsPhoto('멕시코 · 칸쿤 해변', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/A_beautiful_beach_in_Cancun%2C_Mexico.jpg/960px-A_beautiful_beach_in_Cancun%2C_Mexico.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:A_beautiful_beach_in_Cancun,_Mexico.jpg'),
  상파울루: commonsPhoto('브라질 · 상파울루 시립극장', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Teatro_Municipal_de_S%C3%A3o_Paulo_8.jpg/960px-Teatro_Municipal_de_S%C3%A3o_Paulo_8.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Teatro_Municipal_de_S%C3%A3o_Paulo_8.jpg'),
  리우데자네이루: commonsPhoto('브라질 · 리우데자네이루', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Centro_do_Rio_de_Janeiro_%284098873693%29.jpg/960px-Centro_do_Rio_de_Janeiro_%284098873693%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Centro_do_Rio_de_Janeiro_(4098873693).jpg'),
  부에노스아이레스: commonsPhoto('아르헨티나 · 부에노스아이레스', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Buenos_Aires_Casa_Amarilla_lou.JPG/960px-Buenos_Aires_Casa_Amarilla_lou.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Buenos_Aires_Casa_Amarilla_lou.JPG'),
  산티아고: commonsPhoto('칠레 · 산티아고 중앙시장', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Chile-02627_-_-_Mercado_Central_%2849038819653%29.jpg/960px-Chile-02627_-_-_Mercado_Central_%2849038819653%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Chile-02627_-_-_Mercado_Central_(49038819653).jpg'),
  리마: commonsPhoto('페루 · 리마', 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Casa_Matusita_-_Vista_1_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Casa_Matusita_-_Vista_1_(cropped).jpg'),
  쿠스코: commonsPhoto('페루 · 쿠스코 거리', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Peru_-_Cusco_163_-_Calle_Hatunrumiyoc_%288111165707%29.jpg/960px-Peru_-_Cusco_163_-_Calle_Hatunrumiyoc_%288111165707%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Peru_-_Cusco_163_-_Calle_Hatunrumiyoc_(8111165707).jpg'),
  보고타: commonsPhoto('콜롬비아 · 보고타', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Bogota_Church_%2897725021%29.jpeg/960px-Bogota_Church_%2897725021%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Bogota_Church_(97725021).jpeg'),
  메데인: commonsPhoto('콜롬비아 · 메데인', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/City_of_Medellin%2C_Antioquia%2C_Colombia.jpg/960px-City_of_Medellin%2C_Antioquia%2C_Colombia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:City_of_Medellin,_Antioquia,_Colombia.jpg'),
  에든버러: commonsPhoto('영국 · 에든버러', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/The_Landmark_Edinburgh_Tower_Lobby_201501.jpg/960px-The_Landmark_Edinburgh_Tower_Lobby_201501.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:The_Landmark_Edinburgh_Tower_Lobby_201501.jpg'),
  파리: commonsPhoto('프랑스 · 파리 센강', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Paris_75005_Quai_de_Montebello_Bouquinistes_20071014.jpg/960px-Paris_75005_Quai_de_Montebello_Bouquinistes_20071014.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Paris_75005_Quai_de_Montebello_Bouquinistes_20071014.jpg'),
  니스: commonsPhoto('프랑스 · 니스 구시가지', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Nice_door_lintel_CBM_1623.jpg/960px-Nice_door_lintel_CBM_1623.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Nice_door_lintel_CBM_1623.jpg'),
  로마: commonsPhoto('이탈리아 · 로마 콜로세움', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Rome_%28IT%29%2C_Kolosseum_--_2013_--_3379-86.jpg/960px-Rome_%28IT%29%2C_Kolosseum_--_2013_--_3379-86.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Rome_(IT),_Kolosseum_--_2013_--_3379-86.jpg'),
  밀라노: commonsPhoto('이탈리아 · 밀라노', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Milan.Proper.Wikipedia.Image.png/960px-Milan.Proper.Wikipedia.Image.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Milan.Proper.Wikipedia.Image.png'),
  피렌체: commonsPhoto('이탈리아 · 피렌체 두오모', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Florence_-_Duomo_sunset.jpg/960px-Florence_-_Duomo_sunset.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Florence_-_Duomo_sunset.jpg'),
  바르셀로나: commonsPhoto('스페인 · 바르셀로나', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Casa_Amatller_%26_Batll%C3%B3_2955.jpg/960px-Casa_Amatller_%26_Batll%C3%B3_2955.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Casa_Amatller_%26_Batll%C3%B3_2955.jpg'),
  마드리드: commonsPhoto('스페인 · 마드리드 시벨레스 광장', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Palacio_de_Comunicaciones%2C_Plaza_de_Cibeles%2C_Madrid%2C_Espa%C3%B1a%2C_2017-05-18%2C_DD_32-34_HDR.jpg/960px-Palacio_de_Comunicaciones%2C_Plaza_de_Cibeles%2C_Madrid%2C_Espa%C3%B1a%2C_2017-05-18%2C_DD_32-34_HDR.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Palacio_de_Comunicaciones,_Plaza_de_Cibeles,_Madrid,_Espa%C3%B1a,_2017-05-18,_DD_32-34_HDR.jpg'),
  베를린: commonsPhoto('독일 · 베를린', 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Berlin-Victoriastadt_-_Schrotkugelturm.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Berlin-Victoriastadt_-_Schrotkugelturm.jpg'),
  프랑크푸르트: commonsPhoto('독일 · 프랑크푸르트', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Eschenheimer_Turm_und_Nextower_II.jpg/960px-Eschenheimer_Turm_und_Nextower_II.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Eschenheimer_Turm_und_Nextower_II.jpg'),
  취리히: commonsPhoto('스위스 · 취리히', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Z%C3%BCrich_view_Quaibr%C3%BCcke_20200702.jpg/960px-Z%C3%BCrich_view_Quaibr%C3%BCcke_20200702.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Z%C3%BCrich_view_Quaibr%C3%BCcke_20200702.jpg'),
  제네바: commonsPhoto('스위스 · 제네바', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Turning_on_red_signal_for_cyclists_road_sign%2C_Geneva%2C_place_des_Charmilles-Presse.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Turning_on_red_signal_for_cyclists_road_sign,_Geneva,_place_des_Charmilles-Presse.jpg'),
  시드니: commonsPhoto('호주 · 시드니', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/UTS_Tower-Left_side_view.jpg/960px-UTS_Tower-Left_side_view.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:UTS_Tower-Left_side_view.jpg'),
  멜버른: commonsPhoto('호주 · 멜버른', 'https://upload.wikimedia.org/wikipedia/commons/8/80/Melbourne_skyline_showing_landmarks.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Melbourne_skyline_showing_landmarks.jpg'),
  브리즈번: commonsPhoto('호주 · 브리즈번', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Skyneedle%2C_Brisbane_%282006%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Skyneedle,_Brisbane_(2006).jpg'),
  오클랜드: commonsPhoto('뉴질랜드 · 오클랜드', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Landmark_House%2C_Auckland_222.JPG/960px-Landmark_House%2C_Auckland_222.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Landmark_House,_Auckland_222.JPG'),
  퀸스타운: commonsPhoto('뉴질랜드 · 퀸스타운', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Arrow_Junction%2C_Crown_Ranges%2C_Queenstown_District%2C_New_Zealand.jpg/960px-Arrow_Junction%2C_Crown_Ranges%2C_Queenstown_District%2C_New_Zealand.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Arrow_Junction,_Crown_Ranges,_Queenstown_District,_New_Zealand.jpg'),
  델리: commonsPhoto('인도 · 델리', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Delhi_Town_Hall.jpg/960px-Delhi_Town_Hall.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Delhi_Town_Hall.jpg'),
  뭄바이: commonsPhoto('인도 · 뭄바이', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Shaare_Rason_Synagogue%2C_Mumbai%2C_Info_2.jpg/960px-Shaare_Rason_Synagogue%2C_Mumbai%2C_Info_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Shaare_Rason_Synagogue,_Mumbai,_Info_2.jpg'),
  벵갈루루: commonsPhoto('인도 · 벵갈루루', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Mysore_Lancers_Memorial%2C_Bangalore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Mysore_Lancers_Memorial,_Bangalore.jpg'),
  마닐라: commonsPhoto('필리핀 · 마닐라', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Paco_Landmarks_Manila_01.jpg/960px-Paco_Landmarks_Manila_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Paco_Landmarks_Manila_01.jpg'),
  세부: commonsPhoto('필리핀 · 세부', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Taoist_temple%2C_Cebu_City.jpg/960px-Taoist_temple%2C_Cebu_City.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Taoist_temple,_Cebu_City.jpg'),
  시엠립: commonsPhoto('캄보디아 · 시엠립 앙코르와트', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/AnkgorWatTemple.jpg/960px-AnkgorWatTemple.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:AnkgorWatTemple.jpg'),
  프놈펜: commonsPhoto('캄보디아 · 프놈펜', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Wat_Phnom_and_Cathedral_of_Phnom_Penh.jpg/960px-Wat_Phnom_and_Cathedral_of_Phnom_Penh.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Wat_Phnom_and_Cathedral_of_Phnom_Penh.jpg'),
  두바이: commonsPhoto('아랍에미리트 · 두바이', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/DONIS_Dubai_Frame_Nighttime.jpg/960px-DONIS_Dubai_Frame_Nighttime.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:DONIS_Dubai_Frame_Nighttime.jpg'),
  아부다비: commonsPhoto('아랍에미리트 · 아부다비', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/The_Landmark_Under_Construction_on_30_January_2008.jpg/960px-The_Landmark_Under_Construction_on_30_January_2008.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:The_Landmark_Under_Construction_on_30_January_2008.jpg'),
  이스탄불: commonsPhoto('튀르키예 · 이스탄불', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Istanbul_-_cat_of_Sultanahmet.jpg/960px-Istanbul_-_cat_of_Sultanahmet.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Istanbul_-_cat_of_Sultanahmet.jpg'),
  카파도키아: commonsPhoto('튀르키예 · 카파도키아', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Erciyes_Volcano%2C_Cappadocia.jpg/960px-Erciyes_Volcano%2C_Cappadocia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Erciyes_Volcano,_Cappadocia.jpg'),
  케이프타운: commonsPhoto('남아프리카공화국 · 케이프타운', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Satellite_image_of_Cape_peninsula.jpg/960px-Satellite_image_of_Cape_peninsula.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Satellite_image_of_Cape_peninsula.jpg'),
  요하네스버그: commonsPhoto('남아프리카공화국 · 요하네스버그', 'https://upload.wikimedia.org/wikipedia/commons/d/df/Daventry_Court%2C_Killarney%2C_Johannesburg.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Daventry_Court,_Killarney,_Johannesburg.jpg'),
  카이로: commonsPhoto('이집트 · 카이로', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Landmark_new_Cairo.jpg/960px-Landmark_new_Cairo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Landmark_new_Cairo.jpg'),
  룩소르: commonsPhoto('이집트 · 룩소르', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Egypt_Landmark_Sign_-_Temple.svg/960px-Egypt_Landmark_Sign_-_Temple.svg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Egypt_Landmark_Sign_-_Temple.svg'),
  마라케시: commonsPhoto('모로코 · 마라케시 쿠투비아', 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Koutbia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', 'https://commons.wikimedia.org/wiki/File:Koutbia.jpg'),
  카사블랑카: commonsPhoto('모로코 · 카사블랑카', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/The_water_tower_of_Sidi_Bernoussi_%28Boulevard_Souhaib_Arroumi%29%2C_Casablanca%2C_Morocco.jpg/960px-The_water_tower_of_Sidi_Bernoussi_%28Boulevard_Souhaib_Arroumi%29%2C_Casablanca%2C_Morocco.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:The_water_tower_of_Sidi_Bernoussi_(Boulevard_Souhaib_Arroumi),_Casablanca,_Morocco.jpg'),
  나이로비: commonsPhoto('케냐 · 나이로비', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Nairobi%27s_Central_Business_District_Landmark_Skyscrapers..jpg/960px-Nairobi%27s_Central_Business_District_Landmark_Skyscrapers..jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Nairobi%27s_Central_Business_District_Landmark_Skyscrapers..jpg'),
  몸바사: commonsPhoto('케냐 · 몸바사', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Mombasa_usks_1991.jpg/960px-Mombasa_usks_1991.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:Mombasa_usks_1991.jpg'),
  잔지바르: commonsPhoto('탄자니아 · 잔지바르 스톤타운', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/House_of_wonders.jpg/960px-House_of_wonders.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:House_of_wonders.jpg'),
  아루샤: commonsPhoto('탄자니아 · 아루샤 마켓', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/26-12-%2771_Tanzania_-_Arusha_Park_-_Markt.jpg/960px-26-12-%2771_Tanzania_-_Arusha_Park_-_Markt.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', 'https://commons.wikimedia.org/wiki/File:26-12-%2771_Tanzania_-_Arusha_Park_-_Markt.jpg'),
};

const cityPhoto: Record<string, string> = {
  도쿄: 'p-shibuya',
  오사카: 'p-osaka',
  후쿠오카: 'p-fukuoka',
  삿포로: 'p-sapporo',
  서울: 'seoul',
  제주: 'jeju',
  타이베이: 'taipei',
  가오슝: 'kaohsiung',
  홍콩: 'hongkong',
  상하이: 'shanghai',
  베이징: 'beijing',
  방콕: 'bangkok',
  치앙마이: 'chiangmai',
  다낭: 'danang',
  하노이: 'hanoi',
  호찌민: 'hochiminh',
  싱가포르: 'singapore',
  쿠알라룸푸르: 'kualalumpur',
  발리: 'bali',
  자카르타: 'jakarta',
  뉴욕: 'world-new-york', 로스앤젤레스: 'world-los-angeles', 샌프란시스코: 'world-san-francisco', 하와이: 'world-new-york',
  밴쿠버: 'world-vancouver', 토론토: 'world-toronto', 몬트리올: 'world-vancouver', 멕시코시티: 'world-mexico', 칸쿤: 'world-mexico',
  상파울루: 'world-rio', 리우데자네이루: 'world-rio', 부에노스아이레스: 'world-buenos-aires', 산티아고: 'world-lima', 리마: 'world-lima', 쿠스코: 'world-lima', 보고타: 'world-lima', 메데인: 'world-lima',
  런던: 'world-london', 에든버러: 'world-london', 파리: 'world-london', 니스: 'world-london', 로마: 'world-london', 밀라노: 'world-london', 피렌체: 'world-london', 바르셀로나: 'world-london', 마드리드: 'world-london', 베를린: 'world-london', 프랑크푸르트: 'world-london', 취리히: 'world-london', 제네바: 'world-london',
  시드니: 'world-london', 멜버른: 'world-london', 브리즈번: 'world-london', 오클랜드: 'world-london', 퀸스타운: 'world-london', 델리: 'world-london', 뭄바이: 'world-london', 벵갈루루: 'world-london', 마닐라: 'world-london', 세부: 'world-london', 프놈펜: 'world-london', 시엠립: 'world-london', 두바이: 'world-london', 아부다비: 'world-london', 이스탄불: 'world-london', 카파도키아: 'world-london', 케이프타운: 'world-london', 요하네스버그: 'world-london', 카이로: 'world-london', 룩소르: 'world-london', 마라케시: 'world-london', 카사블랑카: 'world-london', 나이로비: 'world-london', 몸바사: 'world-london', 잔지바르: 'world-london', 아루샤: 'world-london',
};

export function getPlacePhoto(place: Place): PlacePhoto | undefined {
  return photos[place.id] || citySpecificPhotos[place.city] || photos[cityPhoto[place.city]];
}
