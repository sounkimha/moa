# 근처 부탁 알림 — 테스트 앱 구현

## 구현 범위

Phase 1의 실제 기기 Local Notification 흐름을 구현했다. 별도의 가짜 요청 저장소나 수락 API는 만들지 않았다. 기존 인증된 `GET /api/snapshot`의 `requests`, `places`, `trips`, `offers`, `transactions`를 사용한다. 백엔드/DB 변경은 없다.

- MY → 알림 설정 → 근처 부탁 알림. 기본 OFF, 500m, 하루 3회.
- 사용자가 설명 Sheet에서 동의해야 위치/알림 시스템 권한을 요청한다. 거절하면 OFF 유지, 설정 안내.
- 반경 300/500/1000m, 하루 3/5회 또는 제한 없음. 알림 수신 OFF는 근처 알림과 백그라운드 옵션도 끈다.
- 여행자 모드 + 본인의 현재 여행 기간 + 위치/알림 권한이 있어야 탐색한다. 구매자 모드 전환/로그아웃/OFF 시 진행 중 작업을 무효화하고 위치 구독을 제거한다.
- 기존 `REQUESTED`, `OFFER_RECEIVED` 상태만 모집 중으로 간주한다. 내 부탁, 최종 매칭된 부탁, 이미 지원한 부탁, 품절/예약 판매는 제외한다.
- 여행에 등록한 매장·국가·귀국지·수령 기한·남은 처리 수량을 기존 지원 규칙과 대조한다. 다도시 여행은 명시적인 `placeIds`를 기준으로 한다.
- 정확도가 150m보다 나쁘거나 2분 넘게 지난 위치는 사용하지 않는다. Haversine 직선거리 계산은 기존 홈의 근처 여행자 계산에서도 재사용한다.
- 동일 장소 및 대표 장소 기준 50m 안의 인접 매장을 묶는다. 각 매장의 이름/ID는 유지한다.
- 같은 부탁 24시간, 같은 매장 1시간, 전체 최소 1분 간격, 기기 현지 날짜의 일일 한도를 적용한다. 한 번의 확인에서 가장 가까운 묶음 하나만 알린다.
- 계정별 AsyncStorage에 설정/알림 ID·시각만 저장한다. 저장 실패 시 발송하지 않는다. 발송 예약을 먼저 기록하므로 중간 종료/OS 오류 시 중복 재발송 대신 해당 회차가 생략될 수 있다.
- 알림 클릭: 단일 → 기존 부탁 상세, 묶음 → 근처 부탁 목록. 앱 실행/백그라운드/로그인 전 클릭을 처리하고 계정·식별자·최신 모집 상태를 검증한다.
- 알림 클릭으로 지원/수락/결제가 발생하지 않는다. 상세 → `가져오겠다고 지원하기` → 기존 구매자 선택/거래 흐름을 유지한다.
- 목록에 상품 사진, 상품가/통화, 수량, 보상, 거리, 예상 도보 시간, 희망 수령일을 표시한다. 기존 `desiredDate`는 수령 기한이므로 구매 기한으로 바꾸어 표시하지 않았다.
- 예상 도보 시간은 직선거리 ÷ 70m/분이며 실제 경로가 아니다. 보상은 수수료 차감 전. 보상이 미정이면 가격을 만들어내지 않고 ‘보상 제안 가능’으로 표시한다.
- 여행자 홈에만 작은 진입점을 추가했다. 기존 거래/채팅 앱 내 알림함은 보존했다. 거래/채팅 원격 Push는 아직 없으므로 동작하지 않는 ON 스위치를 만들지 않았다.

## 백그라운드와 개인정보

배터리를 위해 지속 GPS polling 대신 **활성 여행의 방문 예정 매장 Geofencing**을 사용한다. iOS 제한에 맞춰 최대 20곳을 등록하고, 기존 요청이 있는 곳을 우선한다. 매장 진입 시 기존 Snapshot을 새로 조회하고 기기의 최근 정확한 위치가 있을 때만 반경을 재확인한다. 정확한 위치가 없거나 오프라인이면 알림을 생략한다.

`앱을 닫은 동안에도 확인`은 별도의 동의를 받는다. 항상 위치 권한, 알림 권한, 일반 자동 로그인이 필요하다. 생체 인증 토큰을 복사하거나 Face ID를 우회하지 않는다. 생체 인증 또는 로그인 유지 안 함을 선택한 계정은 **앱을 열어둔 동안** 사용할 수 있다.

여행자의 좌표는 메모리에만 있으며 API 요청, AsyncStorage, notification payload, navigation URL에 넣지 않는다. 다른 이용자에게 노출하지 않는다. OS에 등록되는 region 좌표는 공개 매장의 좌표다.

일반 자동 로그인 토큰은 iOS `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`로 같은 SecureStore 키에 저장한다. 기기를 한 번 잠금 해제한 뒤 화면이 잠겨도 동의한 task에서 읽을 수 있고 다른 기기로 이관하지 않는다. 생체 인증 토큰은 기존 `requireAuthentication` 보호를 그대로 유지한다. 이전 버전의 일반 자동 로그인 세션은 계속 로그인에 쓸 수 있지만, 백그라운드 사용은 새로 로그인해야 한다. 별도 토큰 복사나 비보안 저장소 저장은 없다.

주의:

- 여행 시작 후 앱을 한 번 열어야 그 여행의 region을 등록할 수 있다. 미래 일정만 등록한 채 계속 닫아둔 앱을 정확한 시작일에 깨우는 기능은 없다.
- 여행 종료 시 foreground에서는 구독/region을 제거한다. 앱이 잠들어 있으면 다음 OS 이벤트에서 만료를 검사하고 위치 읽기 전에 종료한다. OS가 깨우지 않는 동안 JS가 정시 실행된다고 보장하지 않는다.
- 사용자 강제 종료, 절전, OS 제한, GPS 정확도 때문에 알림이 늦거나 오지 않을 수 있다.
- 웹은 화면/설정만 제공하며 위치 구독·OS 알림을 실행하지 않는다.
- Expo Go는 foreground Local Notification 테스트용이다. 백그라운드는 **새 Development Build**가 필요하다. 기존 Expo Go 앱을 새로고침하는 것만으로 네이티브 권한 설정은 반영되지 않는다.

공식 문서: [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/), [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

## 현재 테스트/Mock 범위

- 요청·매장·여행 데이터는 현재 MOA 테스트 서버의 실제 Snapshot(그 안의 체험 데이터 포함)을 사용한다. 원격 Push 서버 대신 OS Local Notification으로 전달한다.
- 개발 메뉴 → 근처 부탁 알림 테스트: 본인의 여행에 포함된 장소를 선택한다. 약 110m 위치와 해당 여행 첫날을 메모리 안에서만 시뮬레이션한다. 서버 데이터/실제 GPS/여행 날짜는 변경하지 않는다.
- 테스트도 ON·위치/알림 권한이 필요하고 동일한 제한을 적용한다. 실사용과 테스트의 알림 기록을 분리했다. `__DEV__`가 아니면 테스트 기능은 실행되지 않는다.
- 테스트 종료/백그라운드 전환/로그아웃 시 가상 위치는 지운다.
- ‘가는 길 순’은 준비 중으로 표시한다. 실제 우회 시간/길찾기 API는 연결하지 않았다.

## 변경한 기존 파일

- `apps/mobile/App.tsx`: NearbyProvider 및 세 화면 연결.
- `apps/mobile/index.ts`: headless TaskManager 정의를 React 시작 전에 로드.
- `apps/mobile/app.json`: 위치 사용 설명, 백그라운드 위치 및 알림 플러그인 설정. 지속 foreground GPS service는 사용하지 않음.
- `apps/mobile/package.json`, `package-lock.json`: SDK 버전에 맞는 notifications/task-manager/dev-client 의존성.
- `apps/mobile/src/state/navigation.ts`: 기존 route 이름은 유지하고 `nearby`, `notification-settings`, `nearby-test` 추가.
- `apps/mobile/src/state/AppContext.tsx`: 로그아웃/역할 변경 시 작업 즉시 무효화.
- `apps/mobile/src/lib/auth-storage.ts`: 생체 인증을 우회하지 않는 백그라운드 세션 조회.
- `apps/mobile/src/screens/Home.tsx`: 여행자 진입점/개발 메뉴와 공통 거리 함수 사용.
- `apps/mobile/src/screens/Account.tsx`: 알림 설정 페이지 진입.
- `apps/mobile/src/screens/Matching.tsx`: 거리·구매금액·보상 안내. 기존 지원 CTA 유지.
- `apps/api/test/app-context.test.cjs`, `mobile-profile-setup.test.cjs`: 새 모듈 테스트 경계 연결.
- `apps/api/test/mobile-auth-storage.test.cjs`: 생체 인증 토큰을 background에서 읽지 않는 회귀 검사.

## 새 파일

- `apps/mobile/src/nearby/model.ts`: 후보 필터, 거리, 묶음, 제한, payload 검증.
- `apps/mobile/src/nearby/storage.ts`: 계정별 설정·알림 기록, 직렬 예약.
- `apps/mobile/src/nearby/lifecycle.ts`: 진행 중 작업 무효화.
- `apps/mobile/src/nearby/platform.ts`, `platform.web.ts`: 네이티브 권한·위치·알림 어댑터 및 웹 비활성 어댑터.
- `apps/mobile/src/nearby/runtime.ts`: 발송 전 검사, region 등록·중지, headless Snapshot 조회.
- `apps/mobile/src/nearby/tasks.ts`, `tasks.web.ts`: 전역 background task 및 웹 경계.
- `apps/mobile/src/nearby/NearbyProvider.tsx`: 계정/권한/앱 상태, foreground 위치, 클릭 navigation.
- `apps/mobile/src/screens/Nearby.tsx`: 설정·동의 Sheet·목록·개발 테스트 화면, 홈/상세의 작은 UI.
- `apps/api/test/nearby-alerts.test.cjs`, `nearby-provider.test.cjs`: 필터·중복·제한·권한·동시성·계정·cold start 테스트.
- `scripts/nearby-audit.py`: 격리 API를 쓰는 모바일 웹 UI/경로/설정 보존/overflow 검사.
- `docs/nearby-request-alerts.md`: 이 문서.

## 기기 테스트 순서

1. 프로젝트가 요구하는 Node 22.13 이상에서 의존성을 설치한다. 기존 iOS/Android 권한이 포함된 새 development build를 준비한다 (`apps/mobile`에서 `npx expo run:ios` 또는 `npx expo run:android`; 해당 네이티브 개발 도구 필요).
2. `npx expo start --dev-client`로 연결한다. 기존 `eas.json`의 development profile을 사용할 수도 있다. 이번 작업에서 EAS 원격 빌드나 Railway 배포는 실행하지 않았다.
3. 여행 일정이 있는 체험 계정으로 로그인하고 **가져올게요** 모드로 전환한다.
4. MY → 알림 설정 → 근처 부탁 알림 ON → 설명 확인 → 동의 → 위치/알림 허용.
5. 실제 여행 기간이 아니면 개발 메뉴의 시부야 PARCO/도쿄역 등 방문 예정 장소로 테스트한다. `근처 부탁 알림 테스트` → OS 알림 확인 → 알림 클릭 → 목록/상세 → 기존 지원 화면 확인.
6. 같은 곳을 다시 눌러 중복/쿨다운 안내를 확인한다. 다른 장소·반경·하루 제한도 확인한다.
7. OFF, 구매자 모드, 로그아웃 후에는 위치 구독과 새 알림이 없어야 한다. 권한 거절·철회, 로그인 후 알림 클릭, 마감된 요청 클릭도 확인한다.
8. 백그라운드는 일반 자동 로그인 + 활성 여행 + ‘앱을 닫은 동안에도 확인’ 동의 + 항상 위치 허용 후 실제 이동으로 별도 검사한다. 사용자 강제 종료와 절전 조건도 별도로 기록한다.

## 자동 검증과 남은 운영 작업

검증 명령:

```sh
npm run typecheck
npm run lint
npm run build -w @moa/domain
npm run build -w @moa/api
npm run export -w @moa/mobile
cd apps/api
node --test test/nearby-alerts.test.cjs test/nearby-provider.test.cjs test/app-context.test.cjs test/mobile-auth-storage.test.cjs test/mobile-profile-setup.test.cjs test/trading-screen-guards.test.cjs test/credential-auth.test.cjs test/trade-flow.test.cjs
```

프로젝트 루트에서 `python3 scripts/nearby-audit.py`, `python3 scripts/home-audit.py`. iOS/Android export는 네이티브 JS 번들 검증이지 실기기 알림 도착 검증은 아니다.

이번 검증: 관련 테스트 93건 통과, 전체 TypeScript/lint 통과, domain/API build 및 web/iOS/Android export 통과. 근처 알림 UI는 320×568, 375×667, 390×844, 430×932, 412×915 브라우저 viewport에서 설정 보존·목록/상세 이동·가로 overflow·웹 위치 호출 없음 검사에 통과했다. 기존 홈 회귀 검사는 위 5개와 1440×960에서 통과했다. 실기기 OS 권한·잠금 화면·백그라운드 전달은 아직 검증하지 않았다.

전체 `npm test`에는 이번 변경과 무관한 기존 실패 7건이 있다: Google 지도 시절 계약을 기대하는 지도 테스트 6건(`map-gestures`, `meetup-map-recovery`), 기존 출발국가 임시저장 검증 1건(`mobile-state`). 해당 구현/테스트는 이번 작업에서 수정하지 않았다.

운영 전 필요:

- 위치를 서버로 보내지 않는 지역/매장별 OPEN 요청 조회 API, 페이징 및 증분 조회. 현재는 기존 Snapshot을 재사용한다.
- Expo Push token/APNs/FCM 등록·폐기, 세션/기기 소유권 검증, Push receipt/retry, 서버 알림 선호도와 다기기 공통 빈도 제한.
- 현재 로컬 기록은 기기별이다. 재설치/기기 변경 간 중복 방지는 서버 정책이 필요하다.
- 실제 여행 인증/거래 가능 정책은 기존 서버 규칙을 유지한다. 임의로 테스트 인증을 운영 인증으로 바꾸지 않았다.
- 여행 시작/종료 동기화와 20개를 넘는 방문지의 region 교체 정책, 오프라인/강제 종료의 운영 기대치 정의.
- 경로 API 기반 실제 우회/도보 시간, 묶음 전체를 처리할 수 있는 수량을 고려한 최대 보상 계산.
- iOS Always/정확한 위치/알림 설정 및 Android 13+ 알림 권한·Android 10+ background location·배터리 제한을 실기기에서 검사. Android 알림 권한 선언은 expo-notifications 라이브러리 manifest에서 병합된다.
- App Store/Play의 background location 목적·동의·개인정보 고지 및 심사 준비. 이 작업에서는 위치 이력 수집이나 제3자 전송을 추가하지 않았다.
