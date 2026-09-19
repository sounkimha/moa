import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import { colors as c, motion, radius } from '../theme/tokens';
import { Row, Stack, Txt } from './ui';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    const media = Platform.OS === 'web' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (media) setReduced(media.matches);
    else void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); });
    const onChange = () => setReduced(Boolean(media?.matches));
    media?.addEventListener?.('change', onChange);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; media?.removeEventListener?.('change', onChange); subscription.remove(); };
  }, []);
  return reduced;
}

/** Short, interruptible screen transition. Content is always readable with reduced motion. */
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    opacity.stopAnimation();
    opacity.setValue(reduced ? 1 : 0.35);
    if (reduced) return;
    const animation = Animated.timing(opacity, { toValue: 1, duration: motion.standard, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced, routeKey]);
  return <Animated.View style={{ flex: 1, minHeight: 0, opacity }}>{children}</Animated.View>;
}

type SkeletonVariant = 'place' | 'traveler' | 'request' | 'transaction';
const Bar = ({ width = '100%', height = 12 }: { width?: number | `${number}%`; height?: number }) => <View style={{ width, height, backgroundColor: c.skeleton, borderRadius: 6 }} />;

export function LoadingSkeleton({ variant = 'place' }: { variant?: SkeletonVariant }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { opacity.setValue(1); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.62, duration: 850, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduced]);
  return <Animated.View accessibilityRole="progressbar" accessibilityLabel="화면을 불러오는 중" style={{ padding: 20, gap: 24, opacity, backgroundColor: c.paper }}>
    <Row style={{ justifyContent: 'space-between' }}><Bar width={110} height={28} /><View style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: c.skeleton }} /></Row>
    {variant === 'place' && <><View style={{ height: 205, borderRadius: radius.image, backgroundColor: c.skeleton, padding: 20, justifyContent: 'flex-end', gap: 10 }}><View style={{ width: '65%', height: 22, backgroundColor: c.paper, borderRadius: 5 }} /><View style={{ width: '42%', height: 12, backgroundColor: c.paper, borderRadius: 4 }} /></View><Bar height={52} /><Row>{[0, 1].map((item) => <View key={item} style={{ flex: 1, height: 108, padding: 16, backgroundColor: c.primarySoft, borderRadius: radius.lg, gap: 14 }}><Bar width={28} height={28} /><Bar width="68%" height={15} /></View>)}</Row><Bar width="65%" height={22} /></>}
    {variant === 'transaction' && <><Bar width="75%" height={28} /><View style={{ height: 150, borderRadius: radius.lg, backgroundColor: c.skeleton }} /></>}
    {[0, 1, 2].map((id) => <Row key={id} style={{ padding: 16, backgroundColor: c.paper, borderRadius: radius.lg }}>
      <View style={{ width: variant === 'traveler' ? 48 : 76, height: variant === 'traveler' ? 48 : 76, borderRadius: variant === 'traveler' ? 24 : 14, backgroundColor: c.skeleton }} />
      <Stack gap={12} style={{ flex: 1 }}><Bar width="80%" height={16} /><Bar width="58%" /><Bar width="42%" /></Stack>
    </Row>)}
    <Txt size={13} color={c.secondary} style={{ textAlign: 'center' }}>잠시만요, 여행과 부탁을 연결하고 있어요.</Txt>
  </Animated.View>;
}
