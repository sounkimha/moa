import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BadgeCheck, Clock, Info, Plane } from 'lucide-react-native';
import { canAcceptTrip, shortDate, Trip } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Button, Sheet, Stack, Txt } from './ui';

function badgeContent(trip?: Trip) {
  // Reuse the application eligibility rule. OCR/itinerary matching is NOT
  // final verification, and the public snapshot intentionally omits flightProof.
  if (canAcceptTrip(trip)) return {
    verified: true, pending: false,
    label: '항공권 인증',
    title: '왕복 항공권 확인 완료',
    description: '이 여행 일정의 왕복 항공권 인증을 보여주는 체험용 마크예요. 실제 항공사 발권이나 탑승 여부를 확인한 인증은 아니에요.',
  };
  if (trip?.verificationStatus === 'PENDING_REVIEW') return {
    verified: false, pending: true,
    label: '항공권 확인 중',
    title: '왕복 항공권을 확인 중이에요',
    description: '왕복 항공권과 등록한 일정의 대조가 끝났어요. 실제 발권 여부와 본인 확인은 아직 완료되지 않아 인증 마크가 표시되지 않아요.',
  };
  if (trip?.verificationStatus === 'NEEDS_REVIEW') return {
    verified: false, pending: false,
    label: '항공권 재확인 필요',
    title: '왕복 항공권 재확인이 필요해요',
    description: '항공권과 여행 일정이 일치하는지 다시 확인해야 해요. 확인이 끝나기 전에는 인증 마크가 표시되지 않아요.',
  };
  if (trip?.verificationStatus === 'DEMO_VERIFIED' && trip.endDate < new Date().toISOString().slice(0, 10)) return {
    verified: false, pending: false,
    label: '지난 여행 일정',
    title: '이 여행 일정은 종료됐어요',
    description: '이전 여행의 인증을 새로운 지원에 사용할 수는 없어요. 현재 지원에 맞는 왕복 항공권 인증이 필요해요.',
  };
  return {
    verified: false, pending: false,
    label: '왕복 항공권 확인 필요',
    title: '왕복 항공권 인증을 확인해주세요',
    description: '이 여행 일정의 왕복 항공권 인증을 확인하지 못했어요. 다른 여행의 인증이나 본인 인증만으로는 이 마크가 표시되지 않아요.',
  };
}

/**
 * A non-interactive trust mark for cards that are already pressable. It only
 * appears for the exact, still-active trip that is eligible to accept a
 * request; it is never inferred from a user's other trips or identity.
 */
export function FlightVerificationMark({ trip }: { trip?: Trip }) {
  if (!trip || !canAcceptTrip(trip)) return null;
  return <View
    accessible
    accessibilityLabel={`왕복 항공권 확인 완료 · ${shortDate(trip.startDate)}부터 ${shortDate(trip.endDate)}까지`}
    style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24, paddingHorizontal: 7, borderRadius: 8, backgroundColor: c.primarySoft, flexShrink: 1 }}
  >
    <View style={{ width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryStrong }}><Plane size={10} color={c.onPrimary} /></View>
    <Txt size={11} weight="700" color={c.primaryStrong} lines={1}>항공권 인증</Txt>
  </View>;
}

/** Always pass the trip attached to this offer, never the traveler's latest trip. */
export function TripVerificationBadge({ trip, travelerName }: { trip?: Trip; travelerName?: string }) {
  const [open, setOpen] = useState(false);
  const content = badgeContent(trip);
  const Icon = content.verified ? BadgeCheck : content.pending ? Clock : Info;
  const color = content.verified ? c.primaryStrong : c.secondary;
  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${travelerName ? `${travelerName} · ` : ''}${content.label} 안내`}
      accessibilityHint="이 여행의 항공권 인증 상태와 마크의 의미를 확인해요."
      onPress={() => setOpen(true)}
      hitSlop={4}
      style={({ pressed }) => ({
        alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
        gap: 4, minHeight: 36, maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 6,
        borderRadius: 8, backgroundColor: content.verified ? c.primarySoft : c.background,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={15} color={color} />
      <Txt size={11} weight="600" color={color} style={{ flexShrink: 1 }}>{content.label}</Txt>
    </Pressable>
    <Sheet visible={open} title={content.title} onClose={() => setOpen(false)}
      footer={<Button label="확인했어요" onPress={() => setOpen(false)} />}>
      <Txt size={15} color={c.secondary}>{content.description}</Txt>
      {trip && <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.background }}>
        <Stack gap={6}>
          <Txt size={15} weight="600">{trip.departureCity} ↔ {trip.destinationCity}</Txt>
          <Txt size={13} color={c.secondary}>{shortDate(trip.startDate)} — {shortDate(trip.endDate)}</Txt>
        </Stack>
      </View>}
      <Txt size={13} color={c.secondary}>항공권 원본과 예약번호는 다른 사용자에게 공개하지 않아요.</Txt>
    </Sheet>
  </>;
}
