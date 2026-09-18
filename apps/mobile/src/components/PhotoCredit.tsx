import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { Info, X } from 'lucide-react-native';
import type { Place } from '@moa/domain';
import { getPlacePhoto } from '../lib/place-photos';
import { colors as c } from '../theme/tokens';
import { Button, IconButton, Row, Stack, Txt } from './ui';

/** Keep attribution one tap away without putting a floating information button over a detail photo. */
export function PhotoCredit({ place, list = false, compact = false }: { place: Place; list?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const photo = getPlacePhoto(place);
  if (!photo) return null;
  const openSource = () => {
    Linking.openURL(photo.url).catch(() => Alert.alert('사진 출처를 열지 못했어요', photo.url));
  };
  return (
    <>
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`사진 출처: ${photo.author}, ${photo.license}. ${photo.label} 사진 정보 보기`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}
        >
          <Txt size={11} color={c.muted}>대표 사진 · {photo.label} · 사진 정보</Txt>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`사진 출처: ${photo.author}, ${photo.license}. ${photo.label} 사진 정보 보기`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => ({
            position: 'absolute',
            left: list ? 12 : 6,
            top: list ? 16 : 6,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Row style={{ gap: 4, backgroundColor: '#FFFFFFF2', borderRadius: 16, padding: 7 }}>
            <Info size={15} color={c.ink} />
          </Row>
        </Pressable>
      )}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#14213D99', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable
            accessibilityLabel="사진 정보 닫기"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
          <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: c.paper, borderRadius: 24, overflow: 'hidden' }}>
            <Row style={{ paddingLeft: 20, paddingRight: 8, paddingVertical: 6, justifyContent: 'space-between' }}>
              <Txt size={16} weight="700">사진 정보</Txt>
              <IconButton icon={X} label="닫기" onPress={() => setOpen(false)} />
            </Row>
            <ScrollView bounces={false}>
              <View style={{ width: '100%', aspectRatio: 8 / 5, backgroundColor: c.canvas }}>
                <Image source={photo.source} accessibilityLabel={`${photo.label} 전체 사진`} resizeMode="contain" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
              </View>
              <Stack gap={12} style={{ padding: 20 }}>
                <Stack gap={4}>
                  <Txt size={21} weight="700">{photo.label}</Txt>
                  <Txt size={13} color={c.secondary}>도시를 소개하는 대표 명소 사진이에요. 등록된 매장의 내부나 실시간 모습은 아니에요.</Txt>
                </Stack>
                <Stack gap={4}>
                  <Txt size={13}>© {photo.author}</Txt>
                  <Txt size={12} color={c.secondary}>{photo.license} · 크기 및 구도 조정</Txt>
                </Stack>
                <Button small kind="secondary" label="원본 및 라이선스 보기" onPress={openSource} />
              </Stack>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
