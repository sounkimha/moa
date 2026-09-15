import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, IconButton, Row, Sheet, Txt } from './ui';
import { colors as c } from '../theme/tokens';
import { validDate } from '../state/form-validation';

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDate = (value: string) => { const date = new Date(`${value}T12:00:00`); return `${date.getMonth() + 1}.${date.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`; };

export function DateRangePicker({ start, end, min, onChange }: {
  start: string; end: string; min: string; onChange: (start: string, end: string) => void;
}) {
  const minimum = validDate(min) ? min : localDate(new Date());
  const safeStart = validDate(start) && start >= minimum ? start : minimum;
  const safeEnd = validDate(end) && end >= safeStart ? end : safeStart;
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(safeStart);
  const [draftEnd, setDraftEnd] = useState(safeEnd);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [month, setMonth] = useState(new Date(`${safeStart}T12:00:00`));
  const year = month.getFullYear(), index = month.getMonth();
  const cells: (number | null)[] = [...Array(new Date(year, index, 1).getDay()).fill(null), ...Array.from({ length: new Date(year, index + 1, 0).getDate() }, (_, i) => i + 1)];
  const choose = (date: string) => {
    if (!selectingEnd || date < draftStart) { setDraftStart(date); setDraftEnd(''); setSelectingEnd(true); }
    else { setDraftEnd(date); setSelectingEnd(false); }
  };
  const openPicker = () => { setDraftStart(safeStart); setDraftEnd(safeEnd); setSelectingEnd(false); setMonth(new Date(`${safeStart}T12:00:00`)); setOpen(true); };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="여행 날짜 선택" aria-expanded={open} onPress={openPicker} style={({ pressed }) => ({ minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.65 : 1 })}>
      <CalendarDays size={22} color={c.green} /><View style={{ flex: 1, gap: 6 }}><Row style={{ justifyContent: 'space-between' }}><Txt size={12} color={c.secondary}>가는 날</Txt><Txt size={12} color={c.secondary}>오는 날</Txt></Row><Row style={{ justifyContent: 'space-between' }}><Txt size={17} weight="700">{shortDate(safeStart)}</Txt><ArrowRight size={17} color={c.muted} /><Txt size={17} weight="700">{shortDate(safeEnd)}</Txt></Row></View>
    </Pressable>
    <Sheet visible={open} title="언제 다녀오세요?" subtitle={selectingEnd ? '오는 날을 선택해주세요.' : '가는 날부터 차례로 선택해주세요.'} onClose={() => setOpen(false)}
      footer={<Button label={draftEnd ? `${shortDate(draftStart)} — ${shortDate(draftEnd)} 확인` : '오는 날을 선택해주세요'} disabled={!draftEnd || draftStart < minimum || draftEnd < draftStart} onPress={() => { onChange(draftStart, draftEnd); setOpen(false); }} />}>
      <Row style={{ justifyContent: 'space-between', paddingBottom: 8 }}><View style={{ gap: 3 }}><Txt size={12} color={c.secondary}>가는 날</Txt><Txt size={20} weight="700" color={!selectingEnd ? c.green : c.ink}>{shortDate(draftStart)}</Txt></View><ArrowRight size={20} color={c.muted} /><View style={{ gap: 3 }}><Txt size={12} color={c.secondary}>오는 날</Txt><Txt size={20} weight="700" color={selectingEnd ? c.green : c.ink}>{draftEnd ? shortDate(draftEnd) : '선택해주세요'}</Txt></View></Row>
      <Row style={{ justifyContent: 'space-between' }}><IconButton icon={ChevronLeft} label="이전 달" onPress={() => setMonth(new Date(year, index - 1, 1))} /><Txt size={17} weight="700">{year}년 {index + 1}월</Txt><IconButton icon={ChevronRight} label="다음 달" onPress={() => setMonth(new Date(year, index + 1, 1))} /></Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => <View key={day} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 8 }}><Txt size={12} color={c.muted}>{day}</Txt></View>)}
        {cells.map((day, cell) => {
          if (!day) return <View key={`empty-${cell}`} style={{ width: '14.2857%', height: 48 }} />;
          const value = localDate(new Date(year, index, day)), disabled = value < minimum;
          const selected = value === draftStart || value === draftEnd;
          const within = !!draftEnd && value >= draftStart && value <= draftEnd;
          return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} 선택`} accessibilityState={{ disabled, selected }} aria-disabled={disabled} aria-selected={selected} aria-pressed={selected} disabled={disabled} onPress={() => choose(value)} style={{ width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: within ? c.mint : 'transparent' }}>
            <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.green : 'transparent' }}><Txt size={15} weight={selected ? '700' : '500'} color={disabled ? c.border : selected ? '#FFF' : c.ink}>{day}</Txt></View>
          </Pressable>;
        })}
      </View>
    </Sheet>
  </>;
}
