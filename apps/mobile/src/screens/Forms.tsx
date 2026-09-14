import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  ArrowRight,
  Check,
  ImagePlus,
  Link,
  MapPin,
  Minus,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import {
  Art,
  Category,
  CATEGORIES,
  Product,
  ProductRequest,
  Trip,
  Transport,
  quote,
  money,
  recommendedReward,
  normalizeTransport,
  Country,
  Currency,
  currencyForCountry,
  countryName,
  localMoney,
} from '@moa/domain';
import { DestinationPicker } from '../components/DestinationPicker';
import { useApp } from '../state/AppContext';
import { api } from '../lib/api';
import { pickImage } from '../lib/images';
import { colors as c } from '../theme/tokens';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  DateField,
  Field,
  IconButton,
  Notice,
  Page,
  Row,
  Section,
  Stack,
  Txt,
} from '../components/ui';
import { ProductArt, MoneyBreakdown } from '../components/visuals';
const future = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const meetupSpots = [
  { name: '서울역 1번 출구', area: '서울 중구 한강대로', distance: '1.2km' },
  { name: '강남역 10번 출구', area: '서울 강남구 강남대로', distance: '1.8km' },
  { name: '홍대입구역 8번 출구', area: '서울 마포구 양화로', distance: '1.5km' },
  { name: '성수역 3번 출구', area: '서울 성동구 아차산로', distance: '0.6km' },
  { name: '잠실역 2번 출구', area: '서울 송파구 올림픽로', distance: '1.9km' },
];
type RecognitionSuggestion = {
  productName: string;
  category: Category;
  art: Art;
  placeId: string | null;
  storeName: string;
  purchaseLocation: string;
  localPrice: number | null;
  currency: Currency | null;
  imageUrl?: string;
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'CHECK_REQUIRED';
};
type RecognitionResult = {
  status: string;
  source?: string;
  product: Product | null;
  suggestion?: RecognitionSuggestion;
  confidence?: number;
  signals?: {
    extractedText: string[];
    character: string;
    productType: string;
  } | null;
  notice: string;
};
export function RequestForm() {
  const a = useApp(),
    d = a.data!;
  const preset = d.requests.find((request) => request.id === a.route.id);
  const draft = preset ? null : a.requestDraft;
  const defaultAddress = (d.addresses || []).find((item) => item.userId === d.me.id && item.isDefault);
  const [step, setStep] = useState(draft?.step || 1),
    [method, setMethod] = useState<'link' | 'photo'>(a.route.method || draft?.method || 'link'),
    [url, setUrl] = useState(preset?.productUrl || draft?.url || ''),
    [name, setName] = useState(preset?.productName || draft?.name || ''),
    [image, setImage] = useState(preset?.productImage || draft?.image || ''),
    [art, setArt] = useState<Art>(preset?.art || draft?.art || 'keyring'),
    [price, setPrice] = useState(preset ? String(preset.localPrice) : draft?.price || ''),
    [quantity, setQuantity] = useState(preset?.quantity || draft?.quantity || 1),
    [desired, setDesired] = useState(
      preset?.desiredDate && preset.desiredDate >= future(0)
        ? preset.desiredDate
        : draft?.desired || future(18),
    ),
    [placeId, setPlaceId] = useState(
      a.route.placeId || preset?.placeId || draft?.placeId || 'p-station',
    ),
    [category, setCategory] = useState<Category>(preset?.category || draft?.category || 'CHARACTER'),
    [storeName, setStoreName] = useState(preset?.storeName || draft?.storeName || ''),
    [option, setOption] = useState(preset?.option || draft?.option || '기본 옵션'),
    [resolving, setResolving] = useState(false),
    [metadataMessage, setMetadataMessage] = useState(draft?.metadataMessage || ''),
    [linkStatus, setLinkStatus] = useState<'idle' | 'checking' | 'done' | 'error'>('idle'),
    [aiFilled, setAiFilled] = useState(Boolean(preset) || Boolean(draft?.aiFilled)),
    [sampleFilled, setSampleFilled] = useState(Boolean(draft?.sampleFilled)),
    [editingDetails, setEditingDetails] = useState(draft?.editingDetails || false),
    [error, setError] = useState(''),
    [transport, setTransport] = useState<Transport>(preset?.transport || draft?.transport || 'DOMESTIC_PARCEL'),
    [deliveryCountry, setDeliveryCountry] = useState<Country>(preset?.deliveryCountry || draft?.deliveryCountry || 'KR'),
    [deliveryCity, setDeliveryCity] = useState(preset?.deliveryCity || draft?.deliveryCity || '서울'),
    [deliveryAddressId, setDeliveryAddressId] = useState(preset?.deliveryAddressId || draft?.deliveryAddressId || defaultAddress?.id || ''),
    [deliveryRecipient, setDeliveryRecipient] = useState(preset?.deliveryRecipient || draft?.deliveryRecipient || defaultAddress?.recipient || ''),
    [deliveryPhone, setDeliveryPhone] = useState(preset?.deliveryPhone || draft?.deliveryPhone || defaultAddress?.phone || ''),
    [deliveryPostalCode, setDeliveryPostalCode] = useState(preset?.deliveryPostalCode || draft?.deliveryPostalCode || defaultAddress?.postalCode || ''),
    [deliveryAddress1, setDeliveryAddress1] = useState(preset?.deliveryAddress1 || draft?.deliveryAddress1 || defaultAddress?.address1 || ''),
    [deliveryAddress2, setDeliveryAddress2] = useState(preset?.deliveryAddress2 || draft?.deliveryAddress2 || defaultAddress?.address2 || ''),
    [meetupLocation, setMeetupLocation] = useState(preset?.meetupLocation || draft?.meetupLocation || '서울역 1번 출구'),
    [inventoryStatus, setInventoryStatus] = useState(preset?.inventoryStatus || draft?.inventoryStatus || 'CHECK_REQUIRED'),
    [meetupSearch, setMeetupSearch] = useState('');
  // A retry already has confirmed product details; only recognize a newly edited URL.
  const lastResolvedUrl = useRef(preset?.productUrl?.trim() || '');
  const currentUrl = useRef(url);
  currentUrl.current = url;
  const recognitionRun = useRef(0);
  useEffect(() => () => { recognitionRun.current++; }, []);
  const clearProduct = () => {
    setName(''); setPrice(''); setImage(''); setStoreName('');
    setOption('기본 옵션'); setInventoryStatus('CHECK_REQUIRED');
    setAiFilled(false); setSampleFilled(false); setEditingDetails(false);
  };
  const clearFeedback = () => {
    setError(''); setMetadataMessage(''); setLinkStatus('idle');
  };
  const changeUrl = (value: string) => {
    recognitionRun.current++;
    lastResolvedUrl.current = '';
    currentUrl.current = value;
    setUrl(value);
    setResolving(false);
    clearFeedback(); clearProduct();
  };
  const beginRecognition = () => {
    const run = ++recognitionRun.current;
    clearFeedback(); clearProduct(); setResolving(true);
    return run;
  };
  const place = d.places.find((p) => p.id === placeId)!;
  const mode = normalizeTransport(transport);
  const pricingInput = { localPrice: Number(price) || 0, quantity, currency: currencyForCountry(place.country) };
  const q = quote(pricingInput, recommendedReward(pricingInput), mode);
  const parcelQuote = quote(pricingInput, recommendedReward(pricingInput), 'DOMESTIC_PARCEL');
  const meetupQuote = quote(pricingInput, recommendedReward(pricingInput), 'MEETUP');
  const meetupResults = meetupSpots.filter((spot) => `${spot.name} ${spot.area}`.includes(meetupSearch.trim()));
  useEffect(() => {
    a.setRequestDraft({
      step,
      method,
      url,
      name,
      image,
      art,
      price,
      quantity,
      desired,
      placeId,
      category,
      storeName,
      option,
      metadataMessage,
      aiFilled,
      sampleFilled,
      editingDetails,
      transport: mode,
      deliveryCountry,
      deliveryCity,
      deliveryAddressId,
      deliveryRecipient,
      deliveryPhone,
      deliveryPostalCode,
      deliveryAddress1,
      deliveryAddress2,
      meetupLocation,
      inventoryStatus,
    });
  }, [
    step,
    method,
    url,
    name,
    image,
    art,
    price,
    quantity,
    desired,
    placeId,
    category,
    storeName,
    option,
    metadataMessage,
    aiFilled,
    sampleFilled,
    editingDetails,
    mode,
    deliveryCountry,
    deliveryCity,
    deliveryAddressId,
    deliveryRecipient,
    deliveryPhone,
    deliveryPostalCode,
    deliveryAddress1,
    deliveryAddress2,
    meetupLocation,
    inventoryStatus,
  ]);
  const setProduct = (p: Product) => {
    setName(p.name);
    setPrice(String(p.localPrice));
    setArt(p.art);
    setCategory(p.category);
    setStoreName(d.places.find((place) => place.id === p.placeId)?.name || '');
    if (!a.route.placeId) setPlaceId(p.placeId);
    setOption('기본 옵션');
  };
  const applyRecognition = (result: RecognitionResult, uploadedImage?: string) => {
    setSampleFilled(result.source === 'DEMO_SAMPLE' || result.status === 'DEMO_FOUND');
    setImage(uploadedImage ?? result.suggestion?.imageUrl ?? result.product?.image ?? '');
    const detectedPlaceId = result.product?.placeId || result.suggestion?.placeId || placeId;
    const detectedPlace = d.places.find((p) => p.id === detectedPlaceId);
    const detectedCurrency = result.product?.currency || result.suggestion?.currency;
    const currencyMismatch = Boolean(detectedCurrency && detectedCurrency !== currencyForCountry(detectedPlace?.country || place.country));
    if (result.product) setProduct(result.product);
    else if (result.suggestion) {
      const suggestion = result.suggestion;
      if (suggestion.productName) setName(suggestion.productName);
      setCategory(suggestion.category);
      setArt(suggestion.art);
      if (suggestion.placeId) setPlaceId(suggestion.placeId);
      if (suggestion.localPrice) setPrice(String(suggestion.localPrice));
      if (suggestion.storeName) setStoreName(suggestion.storeName);
      if (suggestion.stockStatus) setInventoryStatus(suggestion.stockStatus);
    }
    const filled = Boolean(result.product || result.suggestion?.productName);
    setAiFilled(filled);
    const hasPrice = (result.product?.localPrice || result.suggestion?.localPrice || 0) > 0;
    if (currencyMismatch) {
      setPrice('');
      setError('판매 페이지의 가격 통화가 구매 장소와 달라요. 현지 판매 가격을 확인해주세요.');
    }
    setEditingDetails(!filled || !hasPrice || currencyMismatch);
  };
  const resolve = async (sample = false, force = false) => {
    const value = sample ? 'https://demo.moa.local/products/1' : url.trim();
    if (!value || (!force && lastResolvedUrl.current === value)) return;
    const run = beginRecognition();
    lastResolvedUrl.current = value;
    if (sample) { currentUrl.current = value; setUrl(value); }
    setLinkStatus('checking');
    try {
      const result = await api<RecognitionResult>('/metadata', { url: value });
      if (recognitionRun.current !== run || currentUrl.current.trim() !== value) return;
      applyRecognition(result);
      setMetadataMessage(result.notice);
      setLinkStatus(['LINK_NOT_FOUND', 'LINK_UNREACHABLE', 'LINK_BLOCKED'].includes(result.status) ? 'error' : 'done');
    } catch (e) {
      if (recognitionRun.current !== run) return;
      setError((e as Error).message);
      setLinkStatus('error');
      setEditingDetails(true);
      lastResolvedUrl.current = '';
    } finally {
      if (recognitionRun.current === run) setResolving(false);
    }
  };
  useEffect(() => {
    const value = url.trim();
    if (method !== 'link' || !/^https?:\/\/[^\s]+$/i.test(value)) {
      setLinkStatus('idle');
      return;
    }
    if (lastResolvedUrl.current === value) return;
    setAiFilled(false);
    setLinkStatus('checking');
    setMetadataMessage('링크를 확인하고 있어요…');
    const timer = setTimeout(() => void resolve(), 650);
    return () => clearTimeout(timer);
  }, [url, method]);
  const photo = async () => {
    const selectionRun = recognitionRun.current;
    let run = selectionRun;
    try {
      const v = await pickImage();
      if (v && selectionRun === recognitionRun.current) {
        run = beginRecognition();
        setUrl('');
        setImage(v);
        const result = await api<RecognitionResult>('/recognize', { image: v });
        if (recognitionRun.current !== run) return;
        applyRecognition(result, v);
        const ocr = result.signals?.extractedText.filter(Boolean).slice(0, 3).join(' · ');
        setMetadataMessage(`${result.notice}${ocr ? ` 읽은 글자: ${ocr}` : ''}`);
      }
    } catch (e) {
      if (recognitionRun.current !== run) return;
      setError((e as Error).message);
      setEditingDetails(true);
    } finally {
      if (recognitionRun.current === run) setResolving(false);
    }
  };
  const recognizeSample = async () => {
    const run = beginRecognition();
    setUrl('');
    try {
      const result = await api<RecognitionResult>('/recognize', { sample: 'chiikawa' });
      if (recognitionRun.current !== run) return;
      applyRecognition(result);
      setMetadataMessage(
        `${result.notice} 인식 신뢰도 ${Math.round((result.confidence || 0) * 100)}% · OCR: ${result.signals?.extractedText.join(' · ') || '문구 없음'}`,
      );
    } catch (e) {
      if (recognitionRun.current !== run) return;
      setError((e as Error).message);
      setEditingDetails(true);
    } finally {
      if (recognitionRun.current === run) setResolving(false);
    }
  };
  const next = () => {
    if (name.trim().length < 2 || !/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      setError('상품명과 0원보다 큰 현지가를 입력해주세요.');
      return;
    }
    if (url && !/^https?:\/\//.test(url)) {
      setError('상품 링크는 https://로 시작하는 주소를 입력해주세요.');
      return;
    }
    setError('');
    setStep(2);
  };
  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desired)) {
      setError('희망 수령일은 YYYY-MM-DD로 입력해주세요.');
      return;
    }
    if (mode === 'DOMESTIC_PARCEL' && (!deliveryRecipient || !deliveryPhone || !deliveryPostalCode || !deliveryAddress1)) {
      setError('국내 택배를 받을 배송지 정보를 모두 입력해주세요.');
      return;
    }
    if (mode === 'MEETUP' && !meetupLocation.trim()) {
      setError('직거래 희망 장소를 선택하거나 입력해주세요.');
      return;
    }
    setError('');
    const request = await a.mutate<ProductRequest>(
      '/requests',
      {
        productName: name.trim(),
        productUrl: url.trim(),
        productImage: image,
        art,
        placeId,
        localPrice: Number(price),
        quantity,
        desiredDate: desired,
        deliveryCountry,
        deliveryCity,
        category,
        storeName: storeName.trim(),
        option,
        transport: mode,
        inventoryStatus,
        ...(mode === 'DOMESTIC_PARCEL' ? {
          deliveryAddressId: deliveryAddressId || undefined,
          deliveryRecipient: deliveryRecipient.trim(),
          deliveryPhone: deliveryPhone.trim(),
          deliveryPostalCode: deliveryPostalCode.trim(),
          deliveryAddress1: deliveryAddress1.trim(),
          deliveryAddress2: deliveryAddress2.trim(),
        } : { meetupLocation: meetupLocation.trim() }),
      },
      '부탁을 등록했어요. 가는 길의 여행자가 수락하면 알려드릴게요.',
    );
    if (request) {
      a.setRequestDraft(null);
      a.nav('request', { id: request.id });
    }
  };
  return (
    <Page
      title="이거 부탁하기"
      onBack={step === 2 ? () => setStep(1) : undefined}
      footer={
        <Stack gap={6}>
          {step === 2 && (
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              지금은 결제하지 않아요. 여행자가 수락한 뒤 결제해요.
            </Txt>
          )}
          <Button
            label={step === 1 ? '수령 방법 정하기' : '부탁 등록하기'}
            icon={step === 1 ? ArrowRight : Check}
            loading={a.busy || resolving || linkStatus === 'checking'}
            onPress={step === 1 ? next : submit}
          />
        </Stack>
      }
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge>간편 요청</Badge>
        <Txt size={13} color={c.secondary}>
          {step} / 2
        </Txt>
      </Row>
      <View style={{ height: 4, backgroundColor: c.border, borderRadius: 2 }}>
        <View
          style={{
            height: 4,
            width: step === 1 ? '50%' : '100%',
            backgroundColor: c.green,
            borderRadius: 2,
          }}
        />
      </View>
      <Stack gap={6}>
        <Txt size={28} weight="800">
          {step === 1 ? '링크나 사진을 보내주세요' : '어떻게 받을까요?'}
        </Txt>
        <Txt color={c.secondary}>
          {step === 1
            ? d.recognition?.image === false
              ? '링크로 자동 입력하거나 사진 샘플을 체험해보세요.'
              : 'AI가 상품명·종류·구매 장소를 알아서 채워드려요.'
            : '측정된 예상 금액을 확인하고 수령 방법만 정해주세요.'}
        </Txt>
      </Stack>
      {error.length > 0 && <Notice tone="error">{error}</Notice>}
      {step === 1 ? (
        <>
          <Row>
            {[
              ['link', '상품 링크', Link],
              ['photo', '사진 올리기', ImagePlus],
            ].map(([v, label, Icon]) => (
              <Chip
                key={v as string}
                label={label as string}
                icon={Icon as typeof Link}
                selected={method === v}
                onPress={() => {
                  if (method === v) return;
                  recognitionRun.current++;
                  setResolving(false); clearFeedback();
                  setMethod(v as 'link' | 'photo');
                }}
              />
            ))}
          </Row>
          {method === 'link' ? (
            <Stack gap={12}>
              <Field
                label="상품 링크"
                value={url}
                onChange={changeUrl}
                keyboard="url"
                placeholder="https://..."
              />
              <Button
                label="링크에서 정보 가져오기"
                kind="secondary"
                icon={Sparkles}
                loading={resolving}
                onPress={() => resolve(false, true)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => resolve(true)}
                style={{ paddingVertical: 8 }}
              >
                <Txt size={13} color={c.green} style={{ textDecorationLine: 'underline' }}>
                  예시 링크로 빠르게 채우기
                </Txt>
              </Pressable>
            </Stack>
          ) : (
            <Stack gap={10}>
              <Button
                label={image ? '사진 다시 선택하고 인식하기' : '사진 보내고 바로 인식하기'}
                icon={ImagePlus}
                loading={resolving}
                onPress={photo}
              />
              <Txt size={13} color={c.secondary}>
                {d.recognition?.image === false
                  ? '현재 실제 사진 AI 연결이 필요해요. 아래 샘플로 자동 입력 흐름을 먼저 체험할 수 있어요.'
                  : '사진 속 글자(OCR)·로고·포장을 함께 봐서 상품과 살 곳을 찾아요.'}
              </Txt>
              <Txt size={12} color={c.muted}>
                자동 인식을 사용하면 선택한 사진이 인식 서버로 전송돼요.
              </Txt>
              <Button
                small
                label="치이카와 샘플로 인식 체험"
                kind="secondary"
                icon={Sparkles}
                loading={resolving}
                onPress={recognizeSample}
              />
            </Stack>
          )}
          {metadataMessage.length > 0 && (
            <Notice tone={linkStatus === 'error' ? 'error' : 'info'}>{metadataMessage}</Notice>
          )}
          {aiFilled && !editingDetails ? (
            <Card>
              <Stack gap={14}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <Sparkles size={18} color={c.green} />
                    <Txt size={17} weight="700">
                      {preset ? '이전 부탁을 불러왔어요' : sampleFilled ? '예시 상품을 채웠어요' : '상품 정보를 채웠어요'}
                    </Txt>
                  </Row>
                  <Button small label="수정" kind="ghost" onPress={() => setEditingDetails(true)} />
                </Row>
                <Row style={{ alignItems: 'flex-start' }}>
                  <ProductArt
                    image={image}
                    art={art}
                    featured={name.includes('치이카와')}
                    size={76}
                  />
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Txt weight="700">{name}</Txt>
                    <Row style={{ gap: 6 }}>
                      <MapPin size={14} color={c.green} />
                      <Txt size={13} color={c.secondary} style={{ flex: 1 }}>
                        {storeName || place.name}
                      </Txt>
                    </Row>
                    {storeName.length > 0 && storeName !== place.name && (
                      <Txt size={12} color={c.muted}>
                        구매 동선 후보 · {place.city} · {place.name}
                      </Txt>
                    )}
                    <Txt size={13} color={c.secondary}>
                      {CATEGORIES[category]} ·{' '}
                      {price
                        ? localMoney(Number(price), currencyForCountry(place.country))
                        : '가격 확인 필요'}
                    </Txt>
                  </Stack>
                </Row>
                <Txt size={12} color={c.muted}>
                  {preset
                    ? '기존 상품 정보를 그대로 가져왔어요. 수령 방법과 날짜를 확인하고 다시 부탁해주세요.'
                    : sampleFilled
                    ? '자동 입력 흐름을 확인하는 샘플이에요. 실제 상품 식별이나 재고 확인 결과는 아니에요.'
                    : '가져온 상품 정보를 등록 전에 한 번만 확인해주세요.'}
                </Txt>
              </Stack>
            </Card>
          ) : editingDetails ? (
            <>
          <Row style={{ alignItems: 'flex-start', gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="상품 이미지 선택"
              onPress={photo}
            >
              <ProductArt
                image={image}
                art={art}
                featured={name.includes('치이카와')}
                size={100}
              />
            </Pressable>
            <Stack gap={10} style={{ flex: 1 }}>
              <Field
                label="상품명"
                required
                value={name}
                onChange={setName}
                placeholder="예: 한정 키링"
              />
              <Txt size={11} color={c.secondary}>
                {image ? '선택한 사진' : '예시 일러스트 · 실제 상품 사진 아님'}
              </Txt>
            </Stack>
          </Row>
          <Field
            label={`현지가 (${currencyForCountry(place.country)})`}
            required
            value={price}
            onChange={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
            keyboard="numeric"
            placeholder="예: 2420"
          />
          <Field
            label="매장·판매처"
            value={storeName}
            onChange={setStoreName}
            placeholder="AI가 링크와 사진에서 찾아요"
          />
          <View>
            <Txt size={14} weight="600" style={{ marginBottom: 10 }}>
              어디에서 살 수 있나요?
            </Txt>
            <DestinationPicker country={place.country} cities={[place.city]} onChange={(country, cities) => {
              const target = d.places.find((p) => p.country === country && (!cities.length || cities.includes(p.city)));
              if (!target) return;
              if (target.country !== place.country) setPrice('');
              setPlaceId(target.id); setStoreName(target.name);
            }} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingTop: 12 }}
            >
              {d.places.filter((p) => p.country === place.country && p.city === place.city).map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.city} · ${p.name}`}
                  selected={placeId === p.id}
                  onPress={() => {
                    if (p.country !== place.country) setPrice('');
                    setPlaceId(p.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
          <View>
            <Txt size={14} weight="600" style={{ marginBottom: 10 }}>
              상품 종류
            </Txt>
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(CATEGORIES).map(([v, label]) => (
                <Chip
                  key={v}
                  label={label}
                  selected={category === v}
                  onPress={() => setCategory(v as Category)}
                />
              ))}
            </Row>
          </View>
          <Field label="옵션" value={option} onChange={setOption} placeholder="색상·사이즈 등" />
          <Txt size={12} color={c.secondary}>
            식품·의약품·주류·담배·고가 명품은 요청할 수 없어요.
          </Txt>
            </>
          ) : null}
          {!aiFilled && !editingDetails && (
            <Button
              small
              label="사진 없이 직접 입력하기"
              kind="ghost"
              onPress={() => setEditingDetails(true)}
            />
          )}
        </>
      ) : (
        <>
          <Card>
            <Row>
              <ProductArt
                art={art}
                image={image}
                featured={name.includes('치이카와')}
                size={70}
              />
              <View style={{ flex: 1 }}>
                <Txt weight="700">{name}</Txt>
                <Txt size={13} color={c.secondary}>
                  {place.name}
                </Txt>
              </View>
              <Button small label="수정" kind="ghost" onPress={() => setStep(1)} />
            </Row>
          </Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt weight="600">수량</Txt>
            <Row>
              <IconButton
                icon={Minus}
                label="수량 줄이기"
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              />
              <Txt size={22} weight="700">
                {quantity}
              </Txt>
              <IconButton
                icon={Plus}
                label="수량 늘리기"
                onPress={() => setQuantity(Math.min(10, quantity + 1))}
              />
            </Row>
          </Row>
          <Stack gap={10}>
            <Txt size={14} weight="600">
              어느 나라에서 받으세요?
            </Txt>
            <Row>
              <Chip
                label="한국"
                selected={deliveryCountry === 'KR'}
                onPress={() => {
                  setDeliveryCountry('KR');
                  setDeliveryCity('서울');
                }}
              />
              <Chip
                label="일본"
                selected={deliveryCountry === 'JP'}
                onPress={() => {
                  setDeliveryCountry('JP');
                  setDeliveryCity('도쿄');
                }}
              />
            </Row>
            <Field label="수령 도시" value={deliveryCity} onChange={setDeliveryCity} />
          </Stack>
          <Stack gap={10}>
            <Txt size={14} weight="600">
              {countryName(deliveryCountry)} 도착 후 어떻게 받을까요?
            </Txt>
            <Row>
              <Chip
                label="국내 택배 · ₩3,500"
                selected={mode === 'DOMESTIC_PARCEL'}
                onPress={() => setTransport('DOMESTIC_PARCEL')}
              />
              <Chip
                label="직접 전달 · 무료"
                selected={mode === 'MEETUP'}
                onPress={() => setTransport('MEETUP')}
              />
            </Row>
          </Stack>
          {mode === 'DOMESTIC_PARCEL' ? (
            <Card>
              <Stack gap={12}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt size={17} weight="700">받을 배송지</Txt>
                  {defaultAddress && <Badge>기본 배송지</Badge>}
                </Row>
                {defaultAddress && deliveryAddressId !== defaultAddress.id && (
                  <Button
                    small
                    kind="secondary"
                    label="기본 배송지로 설정"
                    onPress={() => {
                      setDeliveryAddressId(defaultAddress.id);
                      setDeliveryRecipient(defaultAddress.recipient);
                      setDeliveryPhone(defaultAddress.phone);
                      setDeliveryPostalCode(defaultAddress.postalCode);
                      setDeliveryAddress1(defaultAddress.address1);
                      setDeliveryAddress2(defaultAddress.address2);
                    }}
                  />
                )}
                <Row>
                  <Field style={{ flex: 1 }} label="받는 분" required value={deliveryRecipient} onChange={(v) => { setDeliveryAddressId(''); setDeliveryRecipient(v); }} />
                  <Field style={{ flex: 1 }} label="연락처" required value={deliveryPhone} onChange={(v) => { setDeliveryAddressId(''); setDeliveryPhone(v); }} />
                </Row>
                <Field label="우편번호" required value={deliveryPostalCode} onChange={(v) => { setDeliveryAddressId(''); setDeliveryPostalCode(v); }} keyboard="numeric" />
                <Field label="주소" required value={deliveryAddress1} onChange={(v) => { setDeliveryAddressId(''); setDeliveryAddress1(v); }} placeholder="도로명 주소" />
                <Field label="상세 주소" value={deliveryAddress2} onChange={(v) => { setDeliveryAddressId(''); setDeliveryAddress2(v); }} />
                <Txt size={12} color={c.secondary}>MY의 배송지 관리에서 기본 배송지를 바꿀 수 있어요.</Txt>
              </Stack>
            </Card>
          ) : (
            <Stack gap={10}>
              <Txt size={17} weight="700">직거래 희망 장소</Txt>
              <Field label="장소 검색" value={meetupSearch} onChange={setMeetupSearch} placeholder="역, 동네, 건물 이름으로 검색" />
              {meetupResults.map((spot) => (
                <Pressable key={spot.name} accessibilityRole="button" accessibilityLabel={`${spot.name} 직거래 장소 선택`} onPress={() => setMeetupLocation(spot.name)} style={{ borderWidth: 1, borderColor: meetupLocation === spot.name ? c.green : c.border, backgroundColor: meetupLocation === spot.name ? c.mint : c.paper, padding: 14, borderRadius: 14 }}>
                  <Row><MapPin size={19} color={c.green} /><View style={{ flex: 1 }}><Txt weight="700">{spot.name}</Txt><Txt size={12} color={c.secondary}>{spot.area} · 현재 위치에서 {spot.distance} 예시</Txt></View>{meetupLocation === spot.name && <Check size={19} color={c.green} />}</Row>
                </Pressable>
              ))}
              {!meetupResults.length && <Notice>검색 결과가 없어요. 아래에 원하는 장소를 직접 입력해주세요.</Notice>}
              <Field label="희망 장소 직접 입력" required value={meetupLocation} onChange={setMeetupLocation} placeholder="예: 성수역 3번 출구" />
              <Notice>정확한 시간은 여행자와 매칭된 뒤 거래 채팅에서 정해요.</Notice>
            </Stack>
          )}
          <Card>
            <Stack>
              <Txt size={17} weight="700">
                예상 비용을 미리 확인해요
              </Txt>
              <MoneyBreakdown price={q} />
            </Stack>
          </Card>
          <Card style={{ backgroundColor: c.mint }}>
            <Stack gap={12}>
              <Txt size={17} weight="700">받는 방법별 금액 비교</Txt>
              <Row style={{ justifyContent: 'space-between' }}><Txt color={c.secondary}>국내 택배</Txt><Txt weight="700">{money(parcelQuote.totalPrice)}</Txt></Row>
              <Row style={{ justifyContent: 'space-between' }}><Txt color={c.secondary}>직거래</Txt><Txt weight="700" color={c.green}>{money(meetupQuote.totalPrice)}</Txt></Row>
              <Txt size={12} color={c.secondary}>직거래는 국내 배송비 {money(parcelQuote.totalPrice - meetupQuote.totalPrice)}을 아낄 수 있어요.</Txt>
            </Stack>
          </Card>
          <DateField label="희망 수령일" value={desired} onChange={setDesired} min={future(0)} />
          {place.country !== deliveryCountry && (
            <Notice>
              해외에서 {countryName(deliveryCountry)}까지는 여행자의 원래 이동으로 가져와요. 별도 국제배송비는 붙지 않아요.
            </Notice>
          )}
          <Notice>
            일반 직구 비교 정보는 아직 없어요. 가격이 더 싸거나 온라인 구매가 불가능하다고 단정하지
            않아요.
          </Notice>
        </>
      )}
    </Page>
  );
}
export function TripForm() {
  const a = useApp(),
    d = a.data!;
  const [departure, setDeparture] = useState('서울'),
    [depCountry, setDepCountry] = useState<'KR' | 'JP'>('KR'),
    [country, setCountry] = useState<Country>('JP'),
    [cities, setCities] = useState<string[]>(['도쿄']),
    [start, setStart] = useState(future(4)),
    [end, setEnd] = useState(future(7)),
    [places, setPlaces] = useState<string[]>(['p-shibuya', 'p-station']),
    [capacity, setCapacity] = useState('8'),
    [error, setError] = useState('');
  const available = d.places.filter((p) => p.country === country && cities.includes(p.city));
  const submit = async () => {
    if (!cities.length || cities.some((city) => !places.some((id) => d.places.find((p) => p.id === id)?.city === city))) {
      setError('선택한 도시마다 방문할 장소를 하나 이상 골라주세요.');
      return;
    }
    if (!places.length) {
      setError('방문할 장소를 하나 이상 골라주세요.');
      return;
    }
    const t = await a.mutate<Trip>(
      '/trips',
      {
        departureCountry: depCountry,
        departureCity: departure,
        destinationCountry: country,
        destinationCity: cities[0],
        startDate: start,
        endDate: end,
        placeIds: places,
        maxItems: Number(capacity),
      },
      '여행을 등록했어요. 동선에 맞는 부탁을 찾아볼게요.',
    );
    if (t) {
      a.setRole('traveler');
      a.tab('home');
    }
  };
  return (
    <Page
      title="어디로 떠나세요?"
      footer={
        <Button
          label="내 동선의 부탁 찾아보기"
          icon={ArrowRight}
          loading={a.busy}
          onPress={submit}
        />
      }
    >
      <Stack gap={8}>
        <Badge>여행 일정 등록</Badge>
        <Txt size={29} weight="800">
          원래 가는 그 길에,{'\n'}작은 보상을 더해요.
        </Txt>
      </Stack>
      {error.length > 0 && <Notice tone="error">{error}</Notice>}
      <Field label="출발 도시" value={departure} onChange={setDeparture} />
      <Row>
        <Chip
          label="한국 출발"
          selected={depCountry === 'KR'}
          onPress={() => setDepCountry('KR')}
        />
        <Chip
          label="일본 출발"
          selected={depCountry === 'JP'}
          onPress={() => {
            setDepCountry('JP');
            setDeparture('도쿄');
          }}
        />
      </Row>
      <Stack gap={10}>
        <Txt size={14} weight="600">
          어디로 여행 가시나요? · 여러 곳 선택 가능
        </Txt>
        <DestinationPicker country={country} cities={cities} multiple onChange={(nextCountry, selectedCities) => {
          if (nextCountry === 'ALL') return;
          setCountry(nextCountry); setCities(selectedCities); setError('');
          setPlaces(places.filter((id) => { const place = d.places.find((p) => p.id === id); return place?.country === nextCountry && selectedCities.includes(place.city); }));
        }} />
        <Txt size={12} color={c.secondary}>한 여행에서는 선택한 국가·지역 안의 여러 도시를 묶어요.</Txt>
      </Stack>
      <DateField label="여행 시작일" value={start} onChange={setStart} min={future(0)} />
      <DateField label="여행 종료일" value={end} onChange={setEnd} min={start} />
      <View>
        <Section title="들를 곳을 골라주세요" subtitle="예정된 장소에 있는 부탁만 추천해요." />
        {available.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: places.includes(p.id) }}
            accessibilityLabel={p.name}
            onPress={() =>
              setPlaces(
                places.includes(p.id) ? places.filter((id) => id !== p.id) : [...places, p.id],
              )
            }
            style={{
              backgroundColor: places.includes(p.id) ? c.mint : c.paper,
              borderWidth: 1,
              borderColor: places.includes(p.id) ? c.green : c.border,
              borderRadius: 16,
              padding: 18,
              marginBottom: 10,
            }}
          >
            <Row>
              <MapPin size={22} color={c.green} />
              <View style={{ flex: 1 }}>
                <Txt weight="700">{p.name}</Txt>
                <Txt size={12} color={c.secondary}>
                  {p.region} · 예시 요청 {p.requestCount}건
                </Txt>
              </View>
              <View
                style={{
                  width: 23,
                  height: 23,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: places.includes(p.id) ? c.green : c.border,
                  backgroundColor: places.includes(p.id) ? c.green : c.paper,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {places.includes(p.id) && <Check size={16} color="white" />}
              </View>
            </Row>
          </Pressable>
        ))}
      </View>
      <Field
        label="최대 처리 가능한 상품 수량"
        value={capacity}
        onChange={(v) => setCapacity(v.replace(/[^0-9]/g, ''))}
        keyboard="numeric"
        hint="여유 시간을 생각해 1~20개 사이로 정해주세요."
      />
      <Notice>
        일정 등록만으로 여행 일정 인증이 완료되지는 않아요. 실제 인증은 검증 사업자 연결 후 제공할
        예정이에요.
      </Notice>
    </Page>
  );
}
