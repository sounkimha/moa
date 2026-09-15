import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Line, G, Text as SvgText } from 'react-native-svg';
import {
  ArrowUpRight,
  Heart,
  Users,
  Check,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import {
  Art,
  Place,
  ProductRequest,
  User,
  Price,
  Transaction,
  Status,
  STATUS_LABEL,
  TIMELINE,
  money,
  localMoney,
  DOMESTIC_PARCEL_FEE,
  quote,
  countryName,
} from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Badge, Card, Divider, Row, Stack, Txt } from './ui';
import { getPlacePhoto } from '../lib/place-photos';
import { PhotoCredit } from './PhotoCredit';
export function Logo({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="13" fill={c.green} />
      <Path
        d="M9 27V18a5 5 0 0 1 10 0v9m2 0V14a5 5 0 0 1 10 0v13"
        stroke={c.lime}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx="30" cy="9" r="3" fill="white" />
    </Svg>
  );
}
export function ProductArt({
  art = 'keyring',
  size = 96,
  image,
  featured = false,
}: {
  art?: Art;
  size?: number;
  image?: string;
  featured?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  const bg =
    art === 'plush' ? c.butter : art === 'pouch' ? c.lilac : art === 'tshirt' ? c.blue : c.mint;
  if (image && failedImage === image) return (
    <View accessibilityLabel="상품 사진을 불러오지 못했어요" style={{ width: size, height: size, borderRadius: 16, backgroundColor: bg, padding: 8, justifyContent: 'center' }}>
      <Txt size={11} color={c.secondary} style={{ textAlign: 'center' }}>사진을 불러오지 못했어요</Txt>
    </View>
  );
  if (image)
    return (
      <Image
        source={{ uri: image }}
        onError={() => setFailedImage(image)}
        accessibilityLabel="등록된 상품 이미지"
        style={{ width: size, height: size, borderRadius: 18, backgroundColor: bg }}
        resizeMode="cover"
      />
    );
  if (featured)
    return (
      <Image
        source={require('../../assets/chiikawa-featured.jpg')}
        accessibilityLabel="치이카와 캐릭터 키링 상품 사진"
        style={{ width: size, height: size, borderRadius: 18, backgroundColor: c.mint }}
        resizeMode="cover"
      />
    );
  return (
    <View
      accessibilityLabel="상품 예시 일러스트"
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        backgroundColor: bg,
        overflow: 'hidden',
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 160 160">
        <Ellipse cx="83" cy="130" rx="39" ry="7" fill="#233A2A" opacity="0.08" />
        {art === 'keyring' ? (
          <G>
            <Circle cx="80" cy="34" r="19" fill="none" stroke="#A0AC9E" strokeWidth="6" />
            <Path d="M80 48v18" stroke="#A0AC9E" strokeWidth="5" />
            <Path
              d="M48 72Q41 39 60 48l11 18q8-4 17 0l12-19q19-10 12 26q13 15 8 37q-7 24-37 24q-30 0-42-19q-12-24 7-43"
              fill="#FCFDF5"
              stroke="#D9E2CC"
              strokeWidth="2"
            />
            <Circle cx="66" cy="94" r="4" fill={c.ink} />
            <Circle cx="96" cy="94" r="4" fill={c.ink} />
            <Path
              d="M77 104q5 6 10 0"
              fill="none"
              stroke={c.ink}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <Ellipse cx="56" cy="106" rx="7" ry="4" fill="#F4C1AB" />
            <Ellipse cx="106" cy="106" rx="7" ry="4" fill="#F4C1AB" />
            <Path d="M76 120q7-14 16 0" fill={c.green} />
          </G>
        ) : art === 'plush' ? (
          <G>
            <Ellipse cx="56" cy="46" rx="13" ry="28" fill="#F3C64F" transform="rotate(-16 56 46)" />
            <Ellipse
              cx="102"
              cy="44"
              rx="13"
              ry="28"
              fill="#F3C64F"
              transform="rotate(16 102 44)"
            />
            <Ellipse cx="80" cy="91" rx="44" ry="41" fill="#F4CD62" />
            <Ellipse cx="55" cy="126" rx="16" ry="11" fill="#EAB94D" />
            <Ellipse cx="104" cy="126" rx="16" ry="11" fill="#EAB94D" />
            <Circle cx="64" cy="86" r="4.5" fill={c.ink} />
            <Circle cx="95" cy="86" r="4.5" fill={c.ink} />
            <Ellipse cx="51" cy="99" rx="8" ry="5" fill="#E39765" />
            <Ellipse cx="109" cy="99" rx="8" ry="5" fill="#E39765" />
            <Path d="M75 100q5 7 10 0" stroke={c.ink} strokeWidth="2.5" fill="none" />
          </G>
        ) : art === 'pouch' ? (
          <G>
            <Rect x="30" y="50" width="102" height="76" rx="18" fill="#AAB7DC" />
            <Rect x="32" y="48" width="98" height="13" rx="6" fill="#7C8CB4" />
            <Line x1="38" y1="55" x2="122" y2="55" stroke="#E0E5EE" strokeWidth="2" />
            <Rect x="116" y="53" width="6" height="17" rx="3" fill="#E8D49E" />
            <Path d="M66 97q-3-23 12-15q9-11 15 0q13 14-8 26q-15 1-19-11" fill="#EDF3D9" />
            <Circle cx="76" cy="93" r="2" fill={c.ink} />
            <Circle cx="87" cy="93" r="2" fill={c.ink} />
          </G>
        ) : art === 'tshirt' ? (
          <G>
            <Path
              d="M55 38L28 57l15 25l12-7v55h51V75l12 7l15-25l-28-19q-24 20-50 0"
              fill="#FDFCF2"
              stroke="#D7DBD8"
              strokeWidth="2"
            />
            <Path d="M68 38q12 19 24 0" fill="none" stroke="#D7DBD8" strokeWidth="5" />
            <Circle cx="82" cy="83" r="16" fill={c.green} />
            <Path d="M73 84l7 6 14-16" stroke={c.lime} strokeWidth="4" fill="none" />
          </G>
        ) : art === 'bag' ? (
          <G>
            <Path d="M62 62V43q0-25 20-25t20 25v19" fill="none" stroke="#9EB890" strokeWidth="9" />
            <Path d="M42 54h79l9 76H34z" fill="#C5D7AF" />
            <Rect x="55" y="75" width="54" height="35" rx="6" fill="#EBF0DD" />
            <Path d="M69 100V84h10v16m6 0V81h11v19" stroke={c.green} strokeWidth="5" fill="none" />
          </G>
        ) : (
          <G>
            <Circle cx="63" cy="75" r="32" fill="#F0CE77" stroke="#E2B453" strokeWidth="5" />
            <Circle cx="101" cy="103" r="29" fill="#B4CAE1" stroke="#8BACCC" strokeWidth="5" />
            <Path d="M49 76l9 9 21-23" stroke="#FCF9EE" strokeWidth="7" fill="none" />
            <Path d="M99 87l5 11 12 1-9 8 2 12-10-6-11 6 2-12-9-8 12-1z" fill="#F9FAF5" />
          </G>
        )}
      </Svg>
    </View>
  );
}
export function Avatar({ user, size = 44 }: { user: User; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: user.avatarColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={size * 0.36} weight="700" color={c.darkGreen}>
        {user.initials}
      </Txt>
    </View>
  );
}
export function AvatarStack({ users }: { users: User[] }) {
  return (
    <Row style={{ gap: 0 }}>
      {users.slice(0, 3).map((u, i) => (
        <View
          key={u.id}
          style={{
            marginLeft: i ? -8 : 0,
            borderWidth: 2,
            borderColor: c.canvas,
            borderRadius: 30,
          }}
        >
          <Avatar user={u} size={28} />
        </View>
      ))}
    </Row>
  );
}
export function PlaceCover({ place, thumbnail = false }: { place: Place; thumbnail?: boolean }) {
  const photo = getPlacePhoto(place);
  return (
    <View
      style={{
        backgroundColor:
          place.theme === 'lilac' ? c.lilac : place.theme === 'butter' ? c.butter : c.mint,
        overflow: 'hidden',
        width: '100%',
        aspectRatio: 8 / 5,
      }}
    >
      {photo ? (
        <>
          <Image
            source={photo.source}
            accessibilityLabel={`${photo.label} 대표 풍경 사진`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {!thumbnail && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#14213DB8', paddingHorizontal: 14, paddingVertical: 6 }}>
              <Txt size={11} color="white" lines={1}>{photo.label}</Txt>
            </View>
          )}
        </>
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 420 170" preserveAspectRatio="xMidYMid slice">
          <Circle cx="332" cy="28" r="35" fill="#F9D67A" />
          <Path d="M0 135L74 72l60 63l103-80 99 80 64-54 40 54v45H0z" fill="#BFD3F5" />
          <Rect x="80" y="41" width="120" height="128" rx="6" fill="#F8FBFF" />
          <Rect x="92" y="57" width="96" height="30" rx="5" fill={c.green} />
          <SvgText x="140" y="78" fontSize="16" fill="white" textAnchor="middle">
            MOA LOCAL
          </SvgText>
          <Rect x="99" y="100" width="35" height="69" fill="#C7D9F7" />
          <Rect x="145" y="100" width="37" height="34" fill="#DCE8FA" />
          <Rect x="245" y="111" width="9" height="60" fill="#877760" />
          <Circle cx="250" cy="96" r="34" fill="#76A4E8" />
          <Path d="M10 159h400" stroke="#EEF4FF" strokeWidth="13" />
        </Svg>
      )}
    </View>
  );
}
export function PlaceCard({
  place,
  onPress,
  favorite = false,
  onFavorite,
  variant = 'card',
}: {
  place: Place;
  onPress: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
  variant?: 'card' | 'list';
}) {
  const list = variant === 'list';
  return (
    <View
      testID={list ? 'place-list-item' : 'place-card'}
      style={{
        width: '100%',
        maxWidth: list ? undefined : 420,
        minWidth: 0,
        borderRadius: list ? 18 : 20,
        backgroundColor: c.paper,
        borderWidth: list ? 0 : 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${place.name} 장소 보기`}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: list ? 'row' : 'column',
          padding: list ? 12 : 0,
          gap: list ? 12 : 0,
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <View style={list ? { width: 94, alignSelf: 'center' } : undefined}>
          <View style={{ overflow: 'hidden', borderRadius: list ? 10 : 0 }}>
            <PlaceCover place={place} thumbnail={list} />
          </View>
        </View>
        <View style={{ padding: list ? 0 : 14, gap: list ? 4 : 6, flex: list ? 1 : undefined, minWidth: 0 }}>
          <Row style={{ justifyContent: 'space-between', gap: 4, paddingRight: list && onFavorite ? 32 : 0 }}>
            <Txt size={12} color={c.secondary} lines={1} style={{ flex: 1 }}>
              {countryName(place.country)} · {place.city}
            </Txt>
            {!list && <ArrowUpRight size={16} color={c.muted} />}
          </Row>
          <Txt size={list ? 16 : 18} weight="700" lines={2}>
            {place.name}
          </Txt>
          <Txt size={12} color={c.secondary}>
            {place.visitors}명 방문 예정 · 부탁 {place.requestCount}건
          </Txt>
          <Txt size={list ? 13 : 14} color={c.green} weight="700">
            {place.requestCount ? `평균 보상 ${money(place.averageReward)}` : '첫 부탁 남기기'}
          </Txt>
        </View>
      </Pressable>
      <PhotoCredit place={place} list={list} />
      {onFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${place.name} 관심 장소 ${favorite ? '해제' : '저장'}`}
          accessibilityState={{ selected: favorite }} aria-pressed={favorite}
          onPress={onFavorite}
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ padding: 7, borderRadius: 18, backgroundColor: '#FFFFFFF2' }}>
            <Heart size={18} color={favorite ? c.green : c.ink} fill={favorite ? c.green : 'none'} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
export function ProductRow({
  request,
  onPress,
  aside,
  krw = true,
}: {
  request: ProductRequest;
  onPress: () => void;
  aside?: React.ReactNode;
  krw?: boolean;
}) {
  const converted = quote({ ...request, quantity: 1 }, 0, request.transport).productPrice;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={request.productName}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Row style={{ gap: 14, alignItems: 'center' }}>
        <ProductArt
          art={request.art}
          image={request.productImage}
          featured={request.productName.includes('치이카와')}
          size={80}
        />
        <Stack gap={5} style={{ flex: 1 }}>
          <Txt size={12} color={c.secondary} lines={1}>
            {request.city} · {request.storeName}
          </Txt>
          <Txt size={15} weight="600" lines={2}>
            {request.productName}
          </Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={14} color={c.green} weight="700">
              {krw ? money(converted) : localMoney(request.localPrice, request.currency)}
            </Txt>
            <Txt size={12} color={c.secondary}>
              수량 {request.quantity}개
            </Txt>
          </Row>
        </Stack>
        {aside || <ChevronRight size={18} color={c.muted} />}
      </Row>
    </Pressable>
  );
}
export function MoneyBreakdown({ price, compact = false, rewardPending = false }: {
  price: Price; compact?: boolean; rewardPending?: boolean;
}) {
  const legacyFee = price.shippingFee !== 0 && price.shippingFee !== DOMESTIC_PARCEL_FEE;
  const rows = [
    ['상품가격', price.productPrice],
    ['여행자 보상', rewardPending ? '보상 미정' : price.travelerReward],
    [legacyFee ? '이전 체험 운송비 (기록)' : '국내 전달비', price.shippingFee],
    ['세금 예치액 (데모)', price.taxReserve],
  ] as const;
  return (
    <Stack gap={compact ? 8 : 12}>
      {rows.filter(([label, value]) => label !== '세금 예치액 (데모)' || value !== 0).map(([label, value]) => (
        <Row key={label} style={{ justifyContent: 'space-between' }}>
          <Txt size={14} color={c.secondary}>
            {label}
          </Txt>
          <Txt size={14} weight="500">
            {typeof value === 'number' ? money(value) : value}
          </Txt>
        </Row>
      ))}
      <Divider />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt weight="700">{rewardPending ? '상품·전달비' : '총 결제금액'}</Txt>
        <Txt size={26} weight="800" color={c.green}>
          {money(price.totalPrice)}
        </Txt>
      </Row>
      {rewardPending && <Txt size={12} color={c.secondary}>보상이 정해지면 예상 결제금액에 합산해요.</Txt>}
      <Txt size={12} color={c.secondary}>
        {legacyFee
          ? '이전 체험 거래의 결제 기록이에요. 현재 국내 택배 예상비는 3,500원, 직거래는 0원이에요.'
          : `데모 환율 · 현지 통화 1단위 = ${price.fxRate}원 (실시간 아님) · 국내 택배 예상 3,500원 / 직거래 0원`}
      </Txt>
    </Stack>
  );
}
export function Timeline({ transaction }: { transaction: Transaction }) {
  const index = TIMELINE.indexOf(transaction.status);
  return (
    <View>
      {TIMELINE.map((s, i) => {
        const past = i < index,
          current = i === index;
        return (
          <Row key={s} style={{ alignItems: 'stretch', gap: 15 }}>
            <View style={{ width: 24, alignItems: 'center' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: past ? c.green : current ? c.lime : c.canvas,
                  borderWidth: past || current ? 0 : 1,
                  borderColor: c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {past ? (
                  <Check size={14} color="white" />
                ) : current ? (
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.green }}
                  />
                ) : null}
              </View>
              {i < TIMELINE.length - 1 && (
                <View
                  style={{ width: 2, height: 28, backgroundColor: past ? c.green : c.border }}
                />
              )}
            </View>
            <View style={{ paddingTop: 1, flex: 1 }}>
              <Txt
                size={14}
                weight={current ? '700' : '400'}
                color={current ? c.green : past ? c.ink : c.muted}
              >
                {STATUS_LABEL[s]}
              </Txt>
            </View>
            {current && <Badge>지금</Badge>}
          </Row>
        );
      })}
    </View>
  );
}
