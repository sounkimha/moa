import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { api } from '../lib/api';
import { Button, Chip, Row, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';

type Replies = { source: 'AI' | 'BASIC'; suggestions: string[]; aiAvailable: boolean; notice: string };
export function ChatReplies({ roomId, contextKey, draft, onSelect }: {
  roomId: string; contextKey: string; draft: string; onSelect: (text: string) => void;
}) {
  const [result, setResult] = useState<Replies | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(false), [consent, setConsent] = useState(false), [retry, setRetry] = useState(0);
  const version = useRef(0);
  useEffect(() => {
    const current = ++version.current;
    setResult(null); setError(''); setLoading(true); setConsent(false);
    api<Replies>(`/rooms/${roomId}/replies`).then((value) => { if (version.current === current) setResult(value); })
      .catch(() => { if (version.current === current) setError('추천을 못 불러왔어요. 직접 적어도 좋아요.'); })
      .finally(() => { if (version.current === current) setLoading(false); });
    return () => { version.current++; };
  }, [roomId, contextKey, retry]);
  const generate = async () => {
    const current = ++version.current;
    setLoading(true); setConsent(false); setError('');
    try {
      const value = await api<Replies>(`/rooms/${roomId}/replies`, { useAI: true });
      if (version.current === current) setResult(value);
    } catch { if (version.current === current) setError('AI 연결이 잠시 어려워요. 다시 해볼까요?'); }
    finally { if (version.current === current) setLoading(false); }
  };
  if (draft.trim()) return <Txt size={12} color={c.secondary}>내 말투로 바꿔 보내도 좋아요.</Txt>;
  return <Stack gap={8}>
    <Row style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 6 }}><Sparkles size={15} color={c.primary} /><Txt size={12} weight="600">{result?.source === 'AI' ? 'AI 답장 추천' : '이렇게 말해볼까요?'}</Txt>{loading && <ActivityIndicator size="small" color={c.primary} />}</Row>
      {result?.aiAvailable && <Pressable accessibilityRole="button" accessibilityLabel="AI로 답장 추천받기" disabled={loading} onPress={() => setConsent(!consent)} style={{ padding: 8 }}><Txt size={12} color={c.primary}>AI로 추천받기</Txt></Pressable>}
    </Row>
    {consent ? <Stack gap={8}><Txt size={12} color={c.secondary}>상품·거래 단계와 최근 대화 최대 12개를 OpenAI에 보내 초안을 만들어요. 등록된 연락처·주소는 가리고 보내지만, 대화에 적힌 개인정보는 포함될 수 있어요. 자동 전송되지는 않아요.</Txt><Row><Button small label="동의하고 추천받기" onPress={generate} /><Button small kind="ghost" label="취소" onPress={() => setConsent(false)} /></Row></Stack> : <>
      {!!result?.suggestions.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">{result.suggestions.map((text) => <Chip key={text} label={text} onPress={() => onSelect(text)} />)}</ScrollView>}
      <Txt size={11} color={c.secondary}>{error || result?.notice || '답장을 고르고 있어요.'}</Txt>
      {!!error && <Button small kind="ghost" label="다시 불러오기" onPress={() => setRetry((value) => value + 1)} />}
    </>}
  </Stack>;
}
