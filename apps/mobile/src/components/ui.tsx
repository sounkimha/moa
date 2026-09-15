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
  Modal,
  useWindowDimensions,
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
  Search,
  X,
} from 'lucide-react-native';
import { colors as c, radius, space, typography } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
              ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif'
              : undefined,
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: size * 1.38,
          letterSpacing: size >= 22 ? -0.65 : -0.18,
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
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, style]}>{children}</View>
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

export function Sheet({ visible, title, subtitle, onClose, children, footer }: {
  visible: boolean; title: string; subtitle?: string; onClose: () => void;
  children: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <Modal visible={visible} transparent animationType="slide" accessibilityLabel={title} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + 12, backgroundColor: '#17203366' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title} 닫기`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 680, alignSelf: 'center', minHeight: 0, flexShrink: 1, maxHeight: Math.max(0, height - insets.top - 12), borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.paper, overflow: 'hidden' }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, marginTop: 10 }} />
        <Row style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Txt size={22} weight="700">{title}</Txt>{subtitle && <Txt size={13} color={c.secondary}>{subtitle}</Txt>}</View>
          <IconButton icon={X} label="닫기" onPress={onClose} />
        </Row>
        <ScrollView style={{ minHeight: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }}>{children}</ScrollView>
        {footer && <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function SectionTabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.lilac, padding: 4, borderRadius: 13, gap: 4 }}>
    {items.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: value === item }} aria-selected={value === item} onPress={() => onChange(item)} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: value === item ? c.paper : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Txt size={14} weight={value === item ? '700' : '500'} color={value === item ? c.ink : c.secondary} style={{ textAlign: 'center' }}>{item}</Txt>
    </Pressable>)}
  </View>;
}

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  return <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: focused ? c.green : c.border, backgroundColor: c.paper }}>
    <Search size={20} color={c.muted} />
    <TextInput ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted} autoCapitalize="none" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[{ flex: 1, minWidth: 0, minHeight: 50, fontSize: 16, color: c.ink }, Platform.OS === 'web' ? { outlineStyle: 'none' } as never : undefined]} />
    {!!value && <IconButton icon={X} label="검색어 지우기" onPress={() => { onChange(''); inputRef.current?.focus(); }} />}
  </View>;
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
      aria-disabled={disabled || loading}
      aria-busy={loading}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 54,
          minWidth: 0,
          maxWidth: '100%',
          flexShrink: 1,
          paddingVertical: 12,
          borderRadius: 14,
          paddingHorizontal: small ? 16 : 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor:
            kind === 'primary'
              ? c.green
              : kind === 'secondary'
                ? c.lilac
                : kind === 'lime'
                  ? c.lime
                  : kind === 'danger'
                    ? c.dangerBg
                    : 'transparent',
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
        flexShrink: 0,
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
      aria-selected={selected}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        maxWidth: '100%',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? c.mint : c.paper,
        borderWidth: 1,
        borderColor: selected ? '#B8D4FC' : c.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {Icon && <Icon size={15} color={selected ? c.darkGreen : c.ink} />}
      <Txt size={14} color={selected ? c.darkGreen : c.ink} weight={selected ? '700' : '500'} style={{ flexShrink: 1 }}>
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 7, minWidth: 0 }, style]}>
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: 52,
          minWidth: 0,
          width: '100%',
          borderWidth: 1,
          borderColor: error ? c.danger : focused ? c.green : c.border,
          backgroundColor: c.paper,
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 14,
          fontSize: 16,
          color: c.ink,
          fontFamily: Platform.OS === 'web' ? 'Pretendard, -apple-system, sans-serif' : undefined,
          ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}),
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
  label, value, onChange, min, max,
}: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const anchor = min && value < min ? min : max && value > max ? max : value;
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
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => { if (!open) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setOpen(!open); }} style={{ minHeight: 52, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, borderRadius: 14, paddingHorizontal: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
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
            const date = format(day), disabled = Boolean((min && date < min) || (max && date > max)), active = date === value;
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${date} 선택`} accessibilityState={{ disabled, selected: active }} aria-disabled={disabled} aria-pressed={active} disabled={disabled} onPress={() => { onChange(date); setOpen(false); }} style={{ width: '14.285%', height: 44, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.green : 'transparent' }}><Txt size={13} weight={active ? '700' : '400'} color={disabled ? c.muted : active ? 'white' : c.ink}>{day}</Txt></View></Pressable>;
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
        <Txt size={typography.section} weight="700">
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
          style={{ minHeight: 44, maxWidth: '48%', flexShrink: 1, justifyContent: 'center' }}
        >
          <Row style={{ gap: 2 }}>
            <Txt size={13} color={c.secondary} style={{ flexShrink: 1 }}>
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
          borderWidth: 0,
          borderRadius: radius.lg,
          padding: space.lg,
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
    <Stack gap={12} style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
      <View style={{ padding: 16, borderRadius: radius.lg, backgroundColor: c.lilac }}>
        <Package size={26} color={c.muted} strokeWidth={1.5} />
      </View>
      <Txt size={18} weight="700" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt size={14} color={c.secondary} style={{ textAlign: 'center' }}>
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
          minHeight: 58,
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
        <Txt size={20} weight="700" style={{ flex: 1 }} lines={1}>
          {title}
        </Txt>
      </Row>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: space.page, paddingBottom: space.xxl, gap: space.xl }}
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
