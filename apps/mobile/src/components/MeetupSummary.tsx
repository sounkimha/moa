import React from 'react';
import { Linking } from 'react-native';
import { MeetupPoint } from '@moa/domain';
import { Button, Card, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';
export function MeetupSummary({ point }: { point?: MeetupPoint }) {
  if (!point) return null;
  return <Card><Stack gap={8}>
    <Txt weight="700">여기서 만나요 · {point.name}</Txt>
    {!!point.detail && <Txt>{point.detail}</Txt>}
    {!!point.address && <Txt size={12} color={c.secondary}>검색한 장소 주소 · {point.address}</Txt>}
    <Txt size={12} color={c.secondary}>약속 지점 · {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</Txt>
    <Button kind="secondary" label="정확한 만남 위치 지도 보기" onPress={() => {
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=19/${point.latitude}/${point.longitude}`);
    }} />
  </Stack></Card>;
}
