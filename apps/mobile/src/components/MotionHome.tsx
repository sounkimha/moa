import React, { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { ArrowRight, Check, MapPin, Plane, ShoppingBag } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors as c } from '../theme/tokens';
import { Row, Stack, Txt } from './ui';

/** A shared, explicit role choice: one account, two sides of the same journey. */
export function HomeRoleCards({ value, onChange }: { value: 'buyer' | 'traveler'; onChange: (role: 'buyer' | 'traveler') => void }) {
  return <View testID="home-role-cards" accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 12 }}>
    {([{ role: 'buyer', title: '사고 싶어요', detail: '그곳에 가는 사람에게 부탁', Icon: ShoppingBag }, { role: 'traveler', title: '가져올게요', detail: '여행 가는 김에 보상 받기', Icon: Plane }] as const).map(({ role, title, detail, Icon }) => {
      const selected = value === role;
      return <Pressable key={role} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(role)} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 138, padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.paper, opacity: pressed ? 0.78 : 1, gap: 10 })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ width: 44, height: 42, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={54} height={44} viewBox="0 0 54 44" style={{ position: 'absolute' }}><Path d="M4 33 C-2 17 17 0 34 5 S58 28 44 37" stroke={c.primaryTint} strokeWidth={1.5} strokeDasharray="3 4" fill="none" /><Circle cx="44" cy="37" r="3" fill={c.primary} /></Svg>
            <Icon size={28} color={c.primaryStrong} strokeWidth={1.7} />
          </View>
          {selected ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.primaryStrong, alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="white" /></View> : <ArrowRight size={18} color={c.muted} />}
        </Row>
        <Stack gap={4}><Txt size={19} weight="700">{title}</Txt><Txt size={12} color={c.secondary}>{detail}</Txt></Stack>
      </Pressable>;
    })}
  </View>;
}

/** Local, licensed city photo. A destination introduction, never a live-location claim. */
export function TokyoMotionHero({ travelers, onPress }: { travelers: number; onPress: () => void }) {
  const [failed, setFailed] = useState(false);
  return <View>
    <Pressable testID="home-hero" accessibilityRole="button" accessibilityLabel="도쿄 여행자 일정 보기" onPress={onPress} style={({ pressed }) => ({ minHeight: 244, borderRadius: 24, overflow: 'hidden', backgroundColor: '#102D4C', opacity: pressed ? 0.88 : 1 })}>
      {!failed && <Image source={require('../../assets/tokyo-tower-night.jpg')} accessibilityLabel="도쿄타워 야경 대표 사진" resizeMode="cover" onError={() => setFailed(true)} style={{ position: 'absolute', top: 0, left: '30%', width: '85%', height: '100%' }} />}
      <Svg width="100%" height="100%" viewBox="0 0 360 244" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="tokyo-night-contrast" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#102D4C" stopOpacity={1} /><Stop offset="0.52" stopColor="#102D4C" stopOpacity={0.85} /><Stop offset="1" stopColor="#102D4C" stopOpacity={0.04} /></LinearGradient></Defs>
        <Rect width="360" height="244" fill="url(#tokyo-night-contrast)" />
        <Path d="M185 174 Q210 131 325 105" stroke="#B8DFFF" strokeWidth="1" strokeDasharray="3 5" fill="none" opacity={0.65} /><Circle cx="185" cy="174" r="3" fill="#B8DFFF" />
      </Svg>
      <Stack gap={10} style={{ flex: 1, padding: 22 }}>
        <Txt size={10} weight="600" color="#C4E3FF" style={{ letterSpacing: 2 }}>SAME PLACE, MORE STORIES</Txt>
        <Txt size={26} weight="700" color="white">여행이 만드는{`\n`}더 가까운 일상</Txt>
        <Txt size={12} color="#D6E6F5">그곳에 가는 사람에게, 가는 김에.</Txt>
        <Row style={{ marginTop: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Stack gap={3}><Row style={{ gap: 5 }}><MapPin size={12} color="#C4E3FF" /><Txt size={11} color="#C4E3FF">일본 · 도쿄</Txt></Row><Txt size={32} weight="700" color="white" style={{ letterSpacing: 2 }}>TOKYO</Txt></Stack>
          <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF66', backgroundColor: '#112D4BBB', justifyContent: 'center', alignItems: 'center' }}><ArrowRight size={20} color="white" /></View>
        </Row>
      </Stack>
      <Row style={{ paddingHorizontal: 22, paddingVertical: 11, backgroundColor: '#0A2139C9', borderTopWidth: 1, borderColor: '#FFFFFF20', gap: 7 }}><Plane size={14} color="#ABD6FF" /><Txt size={12} color="white" style={{ flex: 1 }}>{travelers > 0 ? `공개 일정 ${travelers}명 · 여행자 일정 보기` : '도쿄의 장소와 여행 일정 둘러보기'}</Txt></Row>
    </Pressable>
    <Row style={{ justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
      <Pressable accessibilityRole="link" accessibilityLabel="도쿄타워 사진 원본과 작가 정보" onPress={() => void Linking.openURL('https://commons.wikimedia.org/wiki/File:Tokyo_Tower,_Minato_City.jpg')} style={{ minHeight: 24, justifyContent: 'center' }}><Txt size={10} color={c.muted}>도쿄 대표 사진 © David Kernan</Txt></Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="사진 CC BY 4.0 라이선스, 화면에 맞게 잘라 표시" onPress={() => void Linking.openURL('https://creativecommons.org/licenses/by/4.0/')} style={{ minHeight: 24, justifyContent: 'center' }}><Txt size={10} color={c.muted}>· CC BY 4.0</Txt></Pressable>
    </Row>
  </View>;
}
