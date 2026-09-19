import React from 'react';
import { View } from 'react-native';
import { Check, Plane } from 'lucide-react-native';
import { colors as c } from '../theme/tokens';
import { Row, Stack, Txt } from './ui';

/** A compact, data-only itinerary: the same route language in forms and offers. */
export function JourneyTicket({ departure, destination, departureDate, returnDate, caption, compact = false }: {
  departure: string; destination: string; departureDate?: string; returnDate?: string; caption?: string; compact?: boolean;
}) {
  return <View style={{ borderRadius: 18, backgroundColor: c.ultraSoft, borderWidth: 1, borderColor: c.routeSoft, overflow: 'hidden' }}>
    <Row style={{ padding: compact ? 12 : 16, gap: 12, alignItems: 'center' }}>
      <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
        {!compact && <Txt size={10} weight="600" color={c.secondary}>FROM · 출발</Txt>}
        <Txt size={18} weight="700" lines={2}>{departure}</Txt>
        {!!departureDate && <Txt size={12} color={c.secondary}>{departureDate}</Txt>}
      </Stack>
      <Row style={{ flex: 0.85, minWidth: 54, gap: 5 }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary }} />
        <View style={{ height: 1, flex: 1, backgroundColor: c.primaryTint }} />
        <Plane size={18} color={c.primaryStrong} />
        <View style={{ height: 1, flex: 1, backgroundColor: c.primaryTint }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: c.primaryStrong }} />
      </Row>
      <Stack gap={5} style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
        {!compact && <Txt size={10} weight="600" color={c.secondary}>TO · 여행지</Txt>}
        <Txt size={18} weight="700" color={c.primaryStrong} style={{ textAlign: 'right' }} lines={2}>{destination}</Txt>
        {!!returnDate && <Txt size={12} color={c.secondary}>{returnDate} 귀국</Txt>}
      </Stack>
    </Row>
    {!!caption && <View style={{ paddingHorizontal: compact ? 12 : 16, paddingVertical: compact ? 6 : 10, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.primaryTint }}><Txt size={compact ? 11 : 12} color={c.secondary}>{caption}</Txt></View>}
  </View>;
}

/** Progress represents real form steps only; it does not introduce a new flow. */
export function JourneyProgress({ steps, current }: { steps: string[]; current: number }) {
  return <Row accessibilityLabel={`${steps.length}단계 중 ${current}단계, ${steps[current - 1]}`} style={{ gap: 0, alignItems: 'flex-start' }}>
    {steps.map((label, index) => <View key={label} style={{ flex: 1, minWidth: 0 }}>
      {index < steps.length - 1 && <View style={{ position: 'absolute', left: '50%', top: 11, width: '100%', height: 1, backgroundColor: index + 1 < current ? c.primary : c.border }} />}
      <Stack gap={6} style={{ alignItems: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: index + 1 <= current ? c.primaryStrong : c.surface, borderWidth: 1, borderColor: index + 1 <= current ? c.primaryStrong : c.border }}>
          {index + 1 < current ? <Check size={12} color={c.onPrimary} /> : <Txt size={11} weight="700" color={index + 1 === current ? c.onPrimary : c.muted}>{index + 1}</Txt>}
        </View>
        <Txt size={12} weight={index + 1 === current ? '700' : '500'} color={index + 1 === current ? c.primaryStrong : c.secondary} style={{ textAlign: 'center' }}>{label}</Txt>
      </Stack>
    </View>)}
  </Row>;
}
