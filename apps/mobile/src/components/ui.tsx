import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Package,
  LucideIcon,
} from 'lucide-react-native';
import { colors as c } from '../theme/tokens';
import { useApp } from '../state/AppContext';
export function Txt({
  children,
  size = 15,
  weight = '400',
  color = c.ink,
  style,
  lines,
}: {
  children: ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
}) {
  return (
    <Text
      numberOfLines={lines}
      style={[
        {
          fontFamily:
            Platform.OS === 'web'
              ? 'Inter, Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans KR, sans-serif'
              : undefined,
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: size * 1.48,
          letterSpacing: size >= 22 ? -0.9 : -0.3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>
  );
}
export function Stack({
  children,
  gap = 16,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
export function Button({
  label,
  onPress,
  kind = 'primary',
  icon: Icon,
  loading = false,
  disabled = false,
  small = false,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const fg =
    kind === 'primary'
      ? '#fff'
      : kind === 'danger'
        ? c.danger
        : kind === 'ghost'
          ? c.secondary
          : c.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 54,
          paddingVertical: 12,
          borderRadius: 16,
          paddingHorizontal: small ? 16 : 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor:
            kind === 'primary'
              ? c.green
              : kind === 'secondary'
                ? c.mint
                : kind === 'lime'
                  ? c.lime
                  : kind === 'danger'
                    ? c.dangerBg
                    : 'transparent',
          shadowColor: kind === 'primary' ? c.green : 'transparent',
          shadowOpacity: kind === 'primary' ? 0.2 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: kind === 'primary' ? 2 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : Icon ? (
        <Icon size={19} color={fg} strokeWidth={1.8} />
      ) : null}
      <Txt size={small ? 14 : 16} weight="700" color={fg} style={{ flexShrink: 1, textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
  filled = false,
  color = c.ink,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  filled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? c.paper : pressed ? c.mint : 'transparent',
      })}
    >
      <Icon size={22} color={color} strokeWidth={1.7} />
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        maxWidth: '100%',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? c.green : c.paper,
        borderWidth: 1,
        borderColor: selected ? c.green : c.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {Icon && <Icon size={15} color={selected ? '#fff' : c.ink} />}
      <Txt size={14} color={selected ? '#fff' : c.ink} weight={selected ? '700' : '500'} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function Badge({
  children,
  color = c.green,
  bg = c.mint,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: bg,
      }}
    >
      <Txt size={12} color={color} weight="600">
        {children}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard = 'default',
  multiline = false,
  hint,
  required = false,
  error,
  style,
  secure = false,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'numeric' | 'url';
  multiline?: boolean;
  hint?: string;
  required?: boolean;
  error?: string;
  style?: StyleProp<ViewStyle>;
  secure?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <Txt size={14} weight="600">
        {label}
        {required ? ' *' : ''}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? 'search' : undefined}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboard}
        multiline={multiline}
        autoCapitalize="none"
        secureTextEntry={secure}
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: error ? c.danger : c.border,
          backgroundColor: c.paper,
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 14,
          fontSize: 16,
          color: c.ink,
          textAlignVertical: multiline ? 'top' : 'center',
          ...(multiline ? { minHeight: 90 } : {}),
        }}
      />
      {(error || hint) && (
        <Txt size={12} color={error ? c.danger : c.secondary}>
          {error || hint}
        </Txt>
      )}
    </View>
  );
}
export function DateField({
  label, value, onChange, min,
}: { label: string; value: string; onChange: (value: string) => void; min?: string }) {
  const anchor = min && value < min ? min : value;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? new Date(`${anchor}T00:00:00`) : new Date();
  const selected = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => {
    if (!open || Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(false); return true; });
    return () => handler.remove();
  }, [open]);
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const blanks = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(blanks).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const format = (day: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return (
    <View style={{ gap: 8 }}>
      <Txt size={14} weight="600">{label} *</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} accessibilityState={{ expanded: open }} onPress={() => { if (!open) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setOpen(!open); }} style={{ minHeight: 52, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, borderRadius: 14, paddingHorizontal: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt size={16}>{value}</Txt><CalendarDays size={20} color={c.green} />
      </Pressable>
      {open && <View style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, borderRadius: 18, padding: 14, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon={ChevronLeft} label="이전 달" onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} />
          <Txt weight="700">{year}년 {monthIndex + 1}월</Txt>
          <IconButton icon={ChevronRight} label="다음 달" onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['일','월','화','수','목','금','토'].map((day) => <View key={day} style={{ width: '14.285%', alignItems: 'center', paddingVertical: 5 }}><Txt size={11} color={c.secondary}>{day}</Txt></View>)}
          {cells.map((day, index) => {
            if (!day) return <View key={`blank-${index}`} style={{ width: '14.285%', height: 44 }} />;
            const date = format(day), disabled = Boolean(min && date < min), active = date === value;
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${date} 선택`} accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={() => { onChange(date); setOpen(false); }} style={{ width: '14.285%', height: 44, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.green : 'transparent' }}><Txt size={13} weight={active ? '700' : '400'} color={disabled ? c.muted : active ? 'white' : c.ink}>{day}</Txt></View></Pressable>;
          })}
        </View>
      </View>}
    </View>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) {
  const bg = tone === 'warning' ? c.butter : tone === 'error' ? c.dangerBg : c.mint;
  return (
    <Row style={{ alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: bg }}>
      <Info size={17} color={tone === 'error' ? c.danger : c.green} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Txt size={13} color={tone === 'error' ? c.danger : c.darkGreen}>
          {children}
        </Txt>
      </View>
    </Row>
  );
}
export function Section({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <Txt size={21} weight="700">
          {title}
        </Txt>
        {!!subtitle && (
          <Txt size={13} color={c.secondary} style={{ marginTop: 4 }}>
            {subtitle}
          </Txt>
        )}
      </View>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Row style={{ gap: 2 }}>
            <Txt size={13} color={c.secondary}>
              {action}
            </Txt>
            <ChevronRight size={14} color={c.secondary} />
          </Row>
        </Pressable>
      )}
    </Row>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 20,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Divider() {
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />;
}
export function Empty({
  title = '아직 아무것도 없어요',
  body = '조건을 바꾸거나 다른 장소를 둘러보세요.',
  action,
  onPress,
}: {
  title?: string;
  body?: string;
  action?: string;
  onPress?: () => void;
}) {
  const app = useApp();
  return (
    <Stack style={{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 20 }}>
      <View style={{ padding: 22, borderRadius: 28, backgroundColor: c.mint }}>
        <Package size={30} color={c.green} strokeWidth={1.4} />
      </View>
      <Txt size={20} weight="700">
        {title}
      </Txt>
      <Txt color={c.secondary} style={{ textAlign: 'center' }}>
        {body}
      </Txt>
      <Button small kind="secondary" label={action || '홈으로 돌아가기'} onPress={onPress || (() => app.tab('home'))} />
    </Stack>
  );
}
export function Page({
  title,
  children,
  footer,
  scroll = true,
  back = true,
  onBack,
  backLabel,
  resetScrollKey,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  back?: boolean;
  onBack?: () => void;
  backLabel?: string;
  resetScrollKey?: string | number;
}) {
  const app = useApp();
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (resetScrollKey === undefined) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [resetScrollKey]);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Row
        style={{
          height: 62,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: c.paper,
        }}
      >
        {back ? (
          backLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBack || app.back}
              style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}
            >
              <Row style={{ gap: 4 }}>
                <ArrowLeft size={18} color={c.ink} />
                <Txt size={13} weight="600">{backLabel}</Txt>
              </Row>
            </Pressable>
          ) : (
            <IconButton icon={ArrowLeft} label="뒤로" onPress={onBack || app.back} />
          )
        ) : (
          <View style={{ width: 12 }} />
        )}
        <Txt size={18} weight="700" style={{ flex: 1 }}>
          {title}
        </Txt>
      </Row>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 24 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
      {footer && (
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderColor: c.border,
            backgroundColor: c.paper,
          }}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
export function ListItem({
  title,
  subtitle,
  icon: Icon,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPress: () => void;
  right?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Row>
        {Icon && <Icon color={c.green} size={21} />}
        <View style={{ flex: 1 }}>
          <Txt weight="600">{title}</Txt>
          {!!subtitle && (
            <Txt size={12} color={c.secondary}>
              {subtitle}
            </Txt>
          )}
        </View>
        {!!right && (
          <Txt size={13} color={c.secondary}>
            {right}
          </Txt>
        )}
        <ChevronRight size={18} color={c.muted} />
      </Row>
    </Pressable>
  );
}
