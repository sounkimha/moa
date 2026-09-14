# API Specification · v1

Base URL: `http://localhost:4000/api`. 기계가 읽을 수 있는 상세 규격은 `openapi.json`이다. JSON over HTTP, UTF-8. 날짜는 `YYYY-MM-DD`, 생성 시각은 UTC ISO 8601, 금액은 정수 원/현지 통화 단위다.

## 공통 규칙

- 인증: `Authorization: Bearer <demo session token>`. 프로토타입 세션 유효기간 24시간, 서버 재시작 시 만료.
- 생성·수락·거래 명령·후기·채팅은 `Idempotency-Key: <8~100자 고유 키>` 필수.
- `expectedRevision`은 화면의 최신 Request 또는 Transaction 버전. 버전 충돌을 피하려고 임의로 +1 하지 말고 snapshot을 다시 읽는다.
- 클라이언트가 totalPrice를 보내도 승인하지 않는다. strict DTO에서 알 수 없는 필드는 400.
- 정상 GET은 200, 정상 POST는 201. 재시도 멱등 응답도 201이며 같은 결과를 반환한다.
- 오류: 400 입력/모의 승인 실패, 401 인증, 403 행위 주체 불일치, 404 없음, 409 업무 규칙/버전 충돌, 429 속도 제한.
- 오류 형태: `{ "statusCode":409, "message":"거래 상태가 변경됐어요...", "error":"Conflict" }`. DTO 오류에는 `code: VALIDATION_ERROR`가 추가될 수 있다.
- 모든 응답 `X-Request-Id`, `Cache-Control: no-store`. 요청/응답 전체 로깅은 이미지·토큰·개인정보를 노출할 수 있으므로 하지 않는다.

## 엔드포인트

| Method | Path                      | 권한          | 동작                                  |
| ------ | ------------------------- | ------------- | ------------------------------------- |
| GET    | /health (api prefix 밖)   | 공개          | 서버 프로세스 상태                    |
| POST   | /auth/demo                | 공개          | 가상 사용자 로그인                    |
| POST   | /auth/logout              | 로그인        | 세션 폐기                             |
| GET    | /snapshot                 | 로그인        | 공개 데이터 + 거래 참여 범위 데이터   |
| GET    | /places                   | 로그인        | 장소 목록                             |
| POST   | /metadata                 | 로그인        | 외부 상품 URL의 JSON-LD/Open Graph 자동 추출·오류 식별 |
| POST   | /recognize                | 로그인        | 사진 OCR·상품 시각 인식·카탈로그 매칭 |
| POST   | /favorites/:placeId       | 로그인        | 관심 장소 토글                        |
| POST   | /searches                 | 로그인        | 최근 검색 8개 유지                    |
| POST   | /notifications/read       | 로그인        | 본인 알림 읽음 처리                   |
| POST   | /requests                 | 로그인        | 구매 요청 생성                        |
| POST   | /trips                    | 로그인        | 여행·방문 장소 생성                   |
| GET    | /trips/:id/bundles        | 일정 소유자   | 날짜·장소·처리 상태로 묶음 후보 조회  |
| POST   | /requests/:id/offers      | 여행자        | 단건 제안                             |
| POST   | /bundles/offers           | 여행자        | 동일 장소 복수 제안 원자적 생성       |
| POST   | /requests/:id/claim       | 여행자        | 단건 부탁 수락·거래/대화방 생성       |
| POST   | /bundles/claim            | 여행자        | 동일 장소 복수 부탁 원자적 수락       |
| POST   | /offers/:id/accept        | 요청자        | 제안 선택·금액 확정·거래/대화방 생성  |
| POST   | /transactions/:id/actions | 거래 참여자   | 허용 명령과 주체에 따른 상태 변경     |
| POST   | /transactions/:id/reviews | 거래 참여자   | 구매 확정 후 후기 1개 작성            |
| POST   | /rooms/:id/messages       | 대화방 참여자 | 텍스트 메시지 저장                    |

## 로그인

```json
{ "userId": "u-me", "provider": "DEMO" }
```

지원 체험 userId: u-me(소운), u-min(민트로드), u-haru(하루), u-joon(준의 여행), u-sora(소라). `provider`는 DEMO/PHONE/APPLE/GOOGLE/KAKAO 중 선택하며 모든 경우 가상 로그인이다. 외부 ID token을 실제 검증하는 API가 아니다.

## 구매 요청

```json
{
  "productName": "치이카와 도쿄역 한정 키링",
  "productUrl": "https://demo.moa.local/products/1",
  "productImage": "",
  "art": "keyring",
  "placeId": "p-station",
  "localPrice": 2420,
  "quantity": 1,
  "deliveryRecipient": "김소운",
  "deliveryPhone": "010-1234-5678",
  "deliveryPostalCode": "04524",
  "deliveryAddress1": "서울 중구 세종대로 110",
  "desiredDate": "2026-10-04",
  "deliveryCountry": "KR",
  "deliveryCity": "서울",
  "category": "CHARACTER",
  "option": "기본 옵션",
  "transport": "INTERNATIONAL_SHIPPING"
}
```

실행 시 날짜는 오늘 이후로 바꾼다. `country/city/currency/requesterId/status/totalPrice`는 서버의 장소·세션에서 결정한다. 판매처는 링크/사진 인식값을 전송하되 서버가 길이를 제한한다. 전달 방식은 귀국 후 국내 택배/직접 전달만 허용하고, 제안자의 출발 국가와 수령 국가가 같은지 검증한다. 수량 1~10개, 데모 환산 상품가 50만원 이하. 제외 카테고리는 DTO에서 허용하지 않는다.

## 단건/묶음 제안

```json
{
  "tripId": "trip-u-min",
  "reward": 7000,
  "estimatedPurchaseDate": "2026-09-19",
  "estimatedDeliveryDate": "2026-09-28",
  "message": "방문 예정이에요. 사진과 영수증을 보내드릴게요.",
  "transport": "INTERNATIONAL_SHIPPING"
}
```

`/bundles/offers`에서는 위 내용에 `requestIds: ["...", "..."]`를 추가한다. 보상은 **요청 한 건당 보상**이다. 하나라도 예산·상태·일정·장소·수량 검증에 실패하면 전체가 rollback된다. 여러 구매자의 결제를 합치지 않는다.

## 제안 선택

```json
{ "expectedRevision": 0 }
```

반환값은 서버에서 가격을 계산한 Transaction이다. 선택된 제안은 ACCEPTED, 나머지 제안은 REJECTED로 변경된다. 동일 요청을 동시에 선택하면 하나만 성공하고 나머지는 409.

## 거래 명령

| action   | 추가 body                                                                     | 주체   | 조건                              |
| -------- | ----------------------------------------------------------------------------- | ------ | --------------------------------- |
| PAY      | simulateFailure?: boolean                                                     | 구매자 | MATCHED                           |
| PURCHASE | productImage, receiptImage, storeName, purchasedAt, localAmount, locationNote | 여행자 | PAYMENT_HELD                      |
| TRAVEL   | 없음                                                                          | 여행자 | PURCHASED                         |
| SHIP     | carrier, trackingNumber                                                       | 여행자 | TRAVELING                         |
| RECEIVE  | 없음                                                                          | 구매자 | SHIPPED                           |
| CONFIRM  | 없음                                                                          | 구매자 | DELIVERED                         |
| SETTLE   | 없음                                                                          | 여행자 | CONFIRMED, 보관금 HELD, 분쟁 없음 |
| CANCEL   | 없음                                                                          | 구매자 | MATCHED 또는 PAYMENT_HELD         |
| DISPUTE  | reason: 5~1000자                                                              | 참여자 | 결제 이후~확정                    |

모든 명령은 `expectedRevision` 필수. PURCHASE 사진/영수증은 JPG·PNG·WebP data URL 각각 최대 약 2MB. 총 body 6MB 제한. `localAmount`는 합의한 현지 가격×수량과 같아야 한다. 가격이 달라졌을 때 자동 추가 청구하지 않고 거절한다.

```json
{ "action": "PAY", "expectedRevision": 0, "simulateFailure": false }
```

MockPaymentGateway만 연결되어 있으므로 카드번호·계좌번호·실제 PG 승인키를 이 API로 전송하지 않는다.

## Snapshot과 프런트 갱신

명령 성공 → 최신 snapshot 조회 → 화면 갱신. 명령은 성공했는데 갱신이 실패하면 '처리는 완료, 새로고침 필요'로 구분한다. 채팅은 참여자만 5초 주기로 새 메시지를 조회한다. prototype은 pagination·WebSocket 미구현이며, 운영 확장 시 목록 API를 분리한다.

## 실제 인터페이스 확장 계약

- PG: approve/cancel, 서명 검증 webhook, 외부승인번호 unique, 재시도 키, timeout 대사, 환불/정산 outbox.
- 인증: 공급자 ID token 서명·issuer·audience·nonce 검증, 휴대폰/계좌 검증 결과 저장, refresh token 회전.
- Metadata: 공급자 allowlist + HTTPS + public IP 검증 + redirect 재검증 + 응답 크기/시간 제한. 현재 임의 URL 서버 fetch는 하지 않는다.
- S3: private key 발급 → 본인 업로드 → 파일 크기·magic bytes·악성 파일 검사 → 완료 확인 후 Receipt에 연결. 미검증 객체는 공개하지 않는다.
- Map: 좌표·이동수단·출발시각을 입력해 추가 동선 시간을 계산하고 `source/calculatedAt`을 함께 저장한다.
