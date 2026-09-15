# 이미지와 참고 자료

## 포함 이미지

| 파일                              | 사용                | 구분                                                     |
| --------------------------------- | ------------------- | -------------------------------------------------------- |
| apps/mobile/assets/tokyo.jpg      | 기존 보관 이미지    | 현재 장소 카드에서는 사용하지 않음                      |
| apps/mobile/assets/japan.jpg      | 첫 실행 여행 이미지 | 일본 여행 분위기 사진, 방문 장소 증빙 아님               |
| components/visuals.tsx ProductArt | 상품 썸네일         | 직접 작성한 SVG 예시 일러스트, 실제 상품사진 아님        |
| lib/demo-images.json              | 구매 인증 체험      | DEMO ONLY/NOT A REAL PURCHASE PROOF가 명시된 샘플 이미지 |

사진 URL:

- https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1000&q=80&fit=crop
- https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&q=80&fit=crop

사진 원본의 상업 서비스 재사용 권리와 출처 조건은 출시 전에 별도로 확인한다. 프로토타입에 포함됐다는 사실이 브랜드·상품 판매자의 승인이나 후원을 뜻하지 않는다. 상품명과 장소는 서비스 흐름을 이해하기 위한 현실적 예시이며 재고나 판매를 확인한 데이터가 아니다.

## 도시·장소 대표 사진

Wikimedia Commons의 아래 사진을 로컬 자산으로 제공한다. 각 카드의 사진 정보 버튼에서 촬영 장소·저작자·라이선스와 전체 사진을 확인하고 원본 상세 페이지를 열 수 있다. 매장 내부나 실시간 현황 사진이 아닌 지역 대표 풍경이다. 원본의 960px 썸네일을 사용하며 화면 비율에 따라 `cover`로 잘라 표시한다. 수정·재배포 시 각 사진의 라이선스 조건을 유지한다.

| 파일 (`apps/mobile/assets/`) | 풍경 | 저작자 | 라이선스 및 원본 |
| --- | --- | --- | --- |
| tokyo-shibuya.jpg | 시부야 교차로 | David Kernan | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Shibuya_Crossing,_Aerial.jpg) |
| tokyo-station.jpg | 도쿄역 | MaedaAkihiko | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Tokyo-STA_Marunouchi-Entrance_2023.jpg) |
| tokyo-disneysea.jpg | 디즈니씨 프로메테우스산 | Louiemantia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Mt_Prometheus_at_Tokyo_DisneySea.jpg) |
| osaka-dotonbori.jpg | 도톤보리 | Type specimen | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_Ebisu_Bridge.jpg) |
| fukuoka-hakata.jpg | 하카타역 야경 | Hakataman | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Hakata_Station_illuminations.JPG) |
| sapporo-odori.jpg | 오도리공원 | Nkns | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Hokkaido_Sapporo_Odori_Park.jpg) |

## 아시아 도시별 관광 명소 사진

일본 외 16개 도시에도 Wikimedia Commons의 **실제 촬영 사진**을 사용한다. 동일한 쇼핑 거리 분위기의 AI 생성 이미지는 카드에서 교체했다. 서울·제주는 궁궐과 해안 지형, 대만은 전망과 쌍탑, 홍콩·상하이는 스카이라인, 동남아는 사원·호수·교량 등 도시를 구분할 수 있는 관광 명소를 선정했다.

사진은 해당 도시를 소개하기 위한 풍경이며 카드에 등록된 구매 매장의 사진은 아니다. 사진 정보 버튼에서 실제 촬영 명소명, 저작자와 라이선스를 표시하고 원본 페이지를 연결한다. 홈 카드는 사진 위에 명소명을 한 줄로 표시하고, 검색·관심 장소는 8:5 썸네일과 정보를 나란히 배치한다. 사진의 촬영 시점과 현재 모습은 다를 수 있다.

### 출처와 변경 내역

2026-09-15에 원본 페이지의 사진 설명, 저작자, 라이선스를 확인했다. 제공 썸네일을 내려받아 **960×600 JPEG로 축소·크롭**했다. 생성·합성·색상 변경은 하지 않았다. 첨탑·지붕·분화구가 보이는 구도를 선택하고 싱가포르·호찌민·자카르타는 주요 피사체 기준으로 개별 크롭했다. 편집본에도 아래 각 원본의 라이선스가 적용된다. 정밀 출처·다운로드 URL·기존 저작자 표기는 [landmark-photos.json](../apps/mobile/src/lib/landmark-photos.json)에 보관한다.

| 파일 (`apps/mobile/assets/`) | 촬영 명소 | 저작자 | 라이선스 및 원본 |
| --- | --- | --- | --- |
| seoul-gyeongbokgung.jpg | 서울 · 경복궁 경회루 | Frank Schulenburg | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Gyeonghoeru_%28Royal_Banquet_Hall%29_at_Gyeongbokgung_Palace,_Seoul.jpg) |
| jeju-seongsan.jpg | 제주 · 성산일출봉 | Korea.net / Korean Culture and Information Service | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) · [원본](https://commons.wikimedia.org/wiki/File:Seongsan_Ilchulbong_from_the_air.jpg) |
| taipei-101.jpg | 타이베이 · 타이베이 101 | CEphoto, Uwe Aranas | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) · [원본](https://commons.wikimedia.org/wiki/File:Taipei_Taiwan_Taipei-101-Tower-01.jpg) |
| kaohsiung-dragon-tiger-pagodas.jpg | 가오슝 · 용호탑 | CEphoto, Uwe Aranas | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) · [원본](https://commons.wikimedia.org/wiki/File:Kaohsiung_Taiwan_Dragon-and-Tiger-Pagodas-01.jpg) |
| hongkong-victoria-harbour.jpg | 홍콩 · 빅토리아 하버 | Benh LIEU SONG | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Hong_Kong_Harbour_Night_2019-06-11.jpg) |
| shanghai-pudong.jpg | 상하이 · 와이탄에서 본 푸둥 | King of Hearts | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Pudong_Shanghai_November_2017_panorama.jpg) |
| beijing-temple-of-heaven.jpg | 베이징 · 천단 기년전 | xiquinhosilva | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) · [원본](https://commons.wikimedia.org/wiki/File:Temple_of_Heaven_-_Hall_of_Prayer_for_Good_Harvests_01.jpg) |
| bangkok-wat-arun.jpg | 방콕 · 왓 아룬 | Tee-12838 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Wat_Arun_Ratchawararam_and_the_Royal_Barge_Procession.jpg) |
| chiangmai-doi-suthep.jpg | 치앙마이 · 도이수텝 | Philip Nalangan | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Doi_Suthep_Temple_Chiang_Mai_Thailand.jpg) |
| danang-dragon-bridge.jpg | 다낭 · 용다리 | Kuroczynski | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:2020_Da_Nang_Dragon_Bridge_IMG_3897.jpg) |
| hanoi-hoan-kiem.jpg | 하노이 · 호안끼엠 호수 | P. Hughes | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Hanoi_-_Turtle_Tower_%28Th%C3%A1p_R%C3%B9a%29,_Ho%C3%A0n_Ki%E1%BA%BFm_Lake.jpg) |
| hochiminh-central-post-office.jpg | 호찌민 · 중앙우체국 | Steffen Schmitz (Carschten) / Wikimedia Commons | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City,_Central_Post_Office,_2020-01_CN-01.jpg) |
| singapore-marina-bay.jpg | 싱가포르 · 마리나 베이 샌즈 | Rocks n' Scapes | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) · [원본](https://commons.wikimedia.org/wiki/File:Panorama_of_Singapore%27s_Marina_Bay.jpg) |
| kualalumpur-petronas.jpg | 쿠알라룸푸르 · 페트로나스 트윈타워 | Vyacheslav Argenberg | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Kuala_Lumpur,_Malaysia,_Petronas_Towers_at_night_2.jpg) |
| bali-ulun-danu.jpg | 발리 · 울룬 다누 브라탄 사원 | chensiyuan | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:1_pura_ulun_danu_bratan_2011.jpg) |
| jakarta-monas.jpg | 자카르타 · 모나스 | Ramayoni | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [원본](https://commons.wikimedia.org/wiki/File:Monumen_Nasional,_Jakarta,_Indonesia.jpg) |

## 설계 참고

- Grabr 공식: https://grabr.io/en/how-grabr-works
- Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/
- Expo 업그레이드: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- NestJS: https://docs.nestjs.com/first-steps

2026-09-14 확인. Grabr의 제안·구매자 선택·수령 후 지급 원리를 참고하고, 장소별 묶음과 한국어 UX를 별도로 설계했다. 경쟁 서비스의 코드·화면을 복사하지 않았다.
