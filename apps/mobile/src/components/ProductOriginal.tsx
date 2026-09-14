import React, { useState } from 'react';
import { ProductOriginalText } from '@moa/domain';
import { Button, Card, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';
export function ProductOriginal({ text }: { text?: ProductOriginalText }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return <Stack gap={8}>
    <Button small kind="ghost" label={open ? '가져온 원문 접기' : '가져온 원문 보기'} onPress={() => setOpen(!open)} />
    {open && <Card><Stack gap={10}>
      <Txt size={12} color={c.secondary}>현지에서 상품을 확인할 때 참고해주세요. 번역·수정한 내용과 다를 수 있어요.</Txt>
      {([['상품명', text.productName], ['판매처', text.storeName], ['구매 위치', text.purchaseLocation], ['옵션', text.option]] as const)
        .filter(([, value]) => value).map(([label, value]) => <Stack key={label} gap={3}>
          <Txt size={12} color={c.secondary}>{label} 원문</Txt><Txt size={13}>{value}</Txt>
        </Stack>)}
    </Stack></Card>}
  </Stack>;
}
