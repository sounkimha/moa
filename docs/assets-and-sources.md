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

Wikimedia Commons의 아래 사진을 로컬 자산으로 제공한다. 이미지에 촬영 장소·저작자·라이선스를 표시하며 출처를 누르면 원본 상세 페이지가 열린다. 매장 내부나 실시간 현황 사진이 아닌 지역 대표 풍경이다. 원본의 960px 썸네일을 사용하며 화면 비율에 따라 `cover`로 잘라 표시한다. 수정·재배포 시 각 사진의 라이선스 조건을 유지한다.

| 파일 (`apps/mobile/assets/`) | 풍경 | 저작자 | 라이선스 및 원본 |
| --- | --- | --- | --- |
| tokyo-shibuya.jpg | 시부야 교차로 | David Kernan | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Shibuya_Crossing,_Aerial.jpg) |
| tokyo-station.jpg | 도쿄역 | MaedaAkihiko | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Tokyo-STA_Marunouchi-Entrance_2023.jpg) |
| tokyo-disneysea.jpg | 디즈니씨 프로메테우스산 | Louiemantia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · [원본](https://commons.wikimedia.org/wiki/File:Mt_Prometheus_at_Tokyo_DisneySea.jpg) |
| osaka-dotonbori.jpg | 도톤보리 | Type specimen | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_Ebisu_Bridge.jpg) |
| fukuoka-hakata.jpg | 하카타역 야경 | Hakataman | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Hakata_Station_illuminations.JPG) |
| sapporo-odori.jpg | 오도리공원 | Nkns | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [원본](https://commons.wikimedia.org/wiki/File:Hokkaido_Sapporo_Odori_Park.jpg) |

## 설계 참고

- Grabr 공식: https://grabr.io/en/how-grabr-works
- Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/
- Expo 업그레이드: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- NestJS: https://docs.nestjs.com/first-steps

2026-09-14 확인. Grabr의 제안·구매자 선택·수령 후 지급 원리를 참고하고, 장소별 묶음과 한국어 UX를 별도로 설계했다. 경쟁 서비스의 코드·화면을 복사하지 않았다.
