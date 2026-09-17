import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ImagePlus,
  Link,
  LocateFixed,
  MapPin,
  Package,
  Minus,
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
  ProductOriginalText,
  MeetupPoint,
  Trip,
  Transport,
  quote,
  money,
  normalizeTransport,
  Country,
  Currency,
  TRIP_AREAS,
  currencyForCountry,
  countryName,
  localMoney,
  COUNTRY_CODES,
  MAX_DEMO_REWARD,
} from '@moa/domain';
import { TripRoutePicker, TripStopPicker } from '../components/TripRoutePicker';
import { DateRangePicker } from '../components/DateRangePicker';
import { MeetupPicker } from '../components/MeetupPicker';
import { ProductOriginal } from '../components/ProductOriginal';
import { useApp } from '../state/AppContext';
import { api } from '../lib/api';
import { pickImage } from '../lib/images';
import { useFxRate } from '../lib/use-fx-rate';
import { readTripDraft, writeTripDraft } from '../state/trip-draft';
import { addressValidation, productValidation, validDate, validLocalPrice, validProductUrl } from '../state/form-validation';
import { colors as c } from '../theme/tokens';
import {
  Button,
  Card,
  Chip,
  Divider,
  DateField,
  Empty,
  Field,
  IconButton,
  Notice,
  Page,
  Row,
  SearchField,
  Sheet,
  Stack,
  Txt,
} from '../components/ui';
import { ProductArt, MoneyBreakdown } from '../components/visuals';
import { PlaneRouteAnimation } from '../components/travel-route';
import { getPlacePhoto } from '../lib/place-photos';

const CATEGORY_PATHS: Array<{ name: string; description: string; values: Category[] }> = [
  { name: '굿즈·취미', description: '캐릭터, 게임·애니 관련 상품', values: ['CHARACTER', 'GAME'] },
  { name: '라이프스타일', description: '패션 잡화와 지역 한정 상품', values: ['FASHION', 'LOCAL'] },
  { name: '행사·공연', description: '팝업과 콘서트 현장 상품', values: ['POPUP', 'CONCERT'] },
];

const future = (n: number) => {
  const date = new Date(); date.setDate(date.getDate() + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
type RecognitionSuggestion = {
  originalText?: ProductOriginalText;
  option?: string;
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
  const a = useApp();
  if (!a.data?.places.length) return <Page title="이거 부탁하기"><Empty title="구매 장소를 불러오지 못했어요" body="연결 상태를 확인한 뒤 다시 시도해주세요." action="다시 불러오기" onPress={() => a.refresh().catch((error) => a.notify(error.message))} /></Page>;
  return <RequestFormContent key={`${a.data.me.id}:${a.route.id || ''}:${a.route.placeId || ''}`} />;
}
function RequestFormContent() {
  const a = useApp(),
    d = a.data!;
  const sourceRequest = d.requests.find((request) => request.id === a.route.id && request.requesterId === d.me.id);
  const draft = a.requestDraft?.sourceRequestId === a.route.id &&
    a.requestDraft?.entryPlaceId === a.route.placeId ? a.requestDraft : null;
  const preset = draft ? undefined : sourceRequest;
  const defaultAddress = (d.addresses || []).find((item) => item.userId === d.me.id && item.isDefault);
  const [step, setStep] = useState(draft?.step || 1),
    [originalText, setOriginalText] = useState<ProductOriginalText | undefined>(preset?.originalText || draft?.originalText),
    [method, setMethod] = useState<'link' | 'photo'>(
      (a.route.method && a.route.method !== draft?.entryMethod ? a.route.method : draft?.method) || a.route.method || 'link'),
    [url, setUrl] = useState(preset?.productUrl || draft?.url || ''),
    [name, setName] = useState(preset?.productName || draft?.name || ''),
    [image, setImage] = useState(preset?.productImage || draft?.image || ''),
    [art, setArt] = useState<Art>(preset?.art || draft?.art || 'keyring'),
    [price, setPrice] = useState(preset ? String(preset.localPrice) : draft?.price || ''),
    [requestedReward, setRequestedReward] = useState(preset?.requestedReward !== undefined ? String(preset.requestedReward) : draft?.requestedReward || ''),
    [quantity, setQuantity] = useState(Math.max(1, Math.min(10, preset?.quantity || draft?.quantity || 1))),
    [desired, setDesired] = useState(
      validDate(preset?.desiredDate) && preset.desiredDate >= future(0)
        ? preset.desiredDate
        : validDate(draft?.desired) && draft.desired >= future(0) ? draft.desired : future(18),
    ),
    [placeId, setPlaceId] = useState(() => {
      const selected = draft?.placeId || a.route.placeId || preset?.placeId || '';
      return d.places.some((p) => p.id === selected) ? selected : '';
    }),
    [category, setCategory] = useState<Category>(preset?.category || draft?.category || 'CHARACTER'),
    [storeName, setStoreName] = useState(preset?.storeName || draft?.storeName || ''),
    [option, setOption] = useState(preset?.option || draft?.option || '기본 옵션'),
    [resolving, setResolving] = useState(false),
    [metadataMessage, setMetadataMessage] = useState(draft?.metadataMessage || ''),
    [linkStatus, setLinkStatus] = useState<'idle' | 'checking' | 'done' | 'error'>('idle'),
    [aiFilled, setAiFilled] = useState(Boolean(preset) || Boolean(draft?.aiFilled)),
    [sampleFilled, setSampleFilled] = useState(Boolean(draft?.sampleFilled)),
    [editingDetails, setEditingDetails] = useState(draft?.editingDetails || false),
    [editingAddress, setEditingAddress] = useState(false),
    [editingRegion, setEditingRegion] = useState(false),
    [editingMeetup, setEditingMeetup] = useState(false),
    [error, setError] = useState(''),
    [transport, setTransport] = useState<Transport>(preset?.transport || draft?.transport || 'DOMESTIC_PARCEL'),
    [deliveryCountry, setDeliveryCountry] = useState<Country>(preset?.deliveryCountry || draft?.deliveryCountry || 'KR'),
    [deliveryCity, setDeliveryCity] = useState(preset?.deliveryCity || draft?.deliveryCity || '서울'),
    [deliveryAddressId, setDeliveryAddressId] = useState(preset?.deliveryAddressId ?? draft?.deliveryAddressId ?? defaultAddress?.id ?? ''),
    [deliveryRecipient, setDeliveryRecipient] = useState(preset?.deliveryRecipient ?? draft?.deliveryRecipient ?? defaultAddress?.recipient ?? ''),
    [deliveryPhone, setDeliveryPhone] = useState(preset?.deliveryPhone ?? draft?.deliveryPhone ?? defaultAddress?.phone ?? ''),
    [deliveryPostalCode, setDeliveryPostalCode] = useState(preset?.deliveryPostalCode ?? draft?.deliveryPostalCode ?? defaultAddress?.postalCode ?? ''),
    [deliveryAddress1, setDeliveryAddress1] = useState(preset?.deliveryAddress1 ?? draft?.deliveryAddress1 ?? defaultAddress?.address1 ?? ''),
    [deliveryAddress2, setDeliveryAddress2] = useState(preset?.deliveryAddress2 ?? draft?.deliveryAddress2 ?? defaultAddress?.address2 ?? ''),
    [meetupLocation, setMeetupLocation] = useState(preset?.meetupLocation || draft?.meetupLocation || ''),
    [meetupPoint, setMeetupPoint] = useState<MeetupPoint | undefined>(preset?.meetupPoint || draft?.meetupPoint),
    [inventoryStatus, setInventoryStatus] = useState(
      preset?.inventoryStatus === 'OUT_OF_STOCK'
        ? 'CHECK_REQUIRED'
        : preset?.inventoryStatus || draft?.inventoryStatus || 'CHECK_REQUIRED',
    );
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryPath, setCategoryPath] = useState<typeof CATEGORY_PATHS[number] | null>(null);
  // A retry already has confirmed product details; only recognize a newly edited URL.
  const lastResolvedUrl = useRef(preset?.productUrl?.trim() || (draft?.aiFilled ? draft.url.trim() : ''));
  const pendingUrl = useRef('');
  const currentUrl = useRef(url);
  currentUrl.current = url;
  const recognitionRun = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || step !== 2) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { setStep(1); return true; });
    return () => handler.remove();
  }, [step]);
  useEffect(() => () => { recognitionRun.current++; }, []);
  const clearProduct = () => {
    setOriginalText(undefined);
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
    pendingUrl.current = '';
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
  const editProductManually = () => {
    recognitionRun.current++;
    pendingUrl.current = '';
    lastResolvedUrl.current = currentUrl.current.trim();
    setResolving(false); clearFeedback(); setEditingDetails(true);
  };
  const deliveryValues = () => ({ transport, deliveryCountry, deliveryCity, deliveryAddressId, deliveryRecipient, deliveryPhone, deliveryPostalCode, deliveryAddress1, deliveryAddress2, meetupLocation, meetupPoint });
  const deliverySnapshot = useRef<ReturnType<typeof deliveryValues> | null>(null);
  const openDeliveryEditor = (editor: 'address' | 'region' | 'meetup') => {
    deliverySnapshot.current = deliveryValues();
    setEditingAddress(editor === 'address'); setEditingRegion(editor === 'region'); setEditingMeetup(editor === 'meetup');
  };
  const finishDeliveryEditor = () => {
    deliverySnapshot.current = null;
    setEditingAddress(false); setEditingRegion(false); setEditingMeetup(false); setError('');
  };
  const cancelDeliveryEditor = () => {
    const previous = deliverySnapshot.current;
    if (previous) {
      setTransport(previous.transport); setDeliveryCountry(previous.deliveryCountry); setDeliveryCity(previous.deliveryCity);
      setDeliveryAddressId(previous.deliveryAddressId); setDeliveryRecipient(previous.deliveryRecipient); setDeliveryPhone(previous.deliveryPhone);
      setDeliveryPostalCode(previous.deliveryPostalCode); setDeliveryAddress1(previous.deliveryAddress1); setDeliveryAddress2(previous.deliveryAddress2);
      setMeetupLocation(previous.meetupLocation); setMeetupPoint(previous.meetupPoint);
    }
    finishDeliveryEditor();
  };
  const place = d.places.find((p) => p.id === placeId) || d.places[0];
  const placeResults = d.places.filter((candidate) => {
    const term = placeQuery.trim().toLocaleLowerCase('ko-KR');
    return !term || `${countryName(candidate.country)} ${candidate.city} ${candidate.name} ${candidate.englishName} ${candidate.region} ${candidate.tags.join(' ')}`.toLocaleLowerCase('ko-KR').includes(term);
  });
  const mode = normalizeTransport(transport);
  const pricingInput = { localPrice: validLocalPrice(price) ? Number(price) : 0, quantity, currency: currencyForCountry(place.country) };
  const fx = useFxRate(pricingInput.currency);
  const reward = Number(requestedReward) || 0;
  const previewReward = Number.isSafeInteger(reward) && reward >= 0 && reward <= MAX_DEMO_REWARD ? reward : 0;
  const q = quote(pricingInput, previewReward, mode, fx.rate || undefined);
  const parcelQuote = quote(pricingInput, previewReward, 'DOMESTIC_PARCEL', fx.rate || undefined);
  const meetupQuote = quote(pricingInput, previewReward, 'MEETUP', fx.rate || undefined);
  const completedMeetups = d.transactions.filter((t) =>
    (t.buyerId === d.me.id || t.travelerId === d.me.id) &&
    ['CONFIRMED', 'SETTLED'].includes(t.status)).map((t) => d.requests.find((r) => r.id === t.requestId))
    .filter((r) => r?.transport === 'MEETUP' && r.deliveryCountry === deliveryCountry && r.meetupPoint)
    .map((r) => r!.meetupPoint!).reverse()
    .filter((p, index, all) => all.findIndex((other) => other.latitude === p.latitude && other.longitude === p.longitude) === index).slice(0, 3);
  useEffect(() => {
    if (editingAddress || editingRegion || editingMeetup) return;
    a.setRequestDraft({
      sourceRequestId: a.route.id,
      entryPlaceId: a.route.placeId,
      entryMethod: a.route.method,
      originalText,
      step,
      method,
      url,
      name,
      image,
      art,
      price,
      requestedReward,
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
      meetupPoint,
      inventoryStatus,
    });
  }, [
    originalText,
    step,
    method,
    url,
    name,
    image,
    art,
    price,
    requestedReward,
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
    meetupPoint,
    inventoryStatus,
    editingAddress,
    editingRegion,
    editingMeetup,
  ]);
  const setProduct = (p: Product) => {
    setName(typeof p.name === 'string' ? p.name : '');
    setPrice(Number.isFinite(p.localPrice) ? String(p.localPrice) : '');
    setArt(['keyring', 'plush', 'pouch', 'tshirt', 'pin', 'bag'].includes(p.art) ? p.art : 'keyring');
    setCategory(Object.hasOwn(CATEGORIES, p.category) ? p.category : 'CHARACTER');
    setStoreName(d.places.find((place) => place.id === p.placeId)?.name || '');
    setPlaceId(d.places.some((place) => place.id === p.placeId) ? p.placeId : '');
    setOption('기본 옵션');
  };
  const applyRecognition = (result: RecognitionResult, uploadedImage?: string) => {
    setOriginalText(result.suggestion?.originalText);
    setSampleFilled(result.source === 'DEMO_SAMPLE' || result.status === 'DEMO_FOUND');
    const detectedImage = uploadedImage ?? result.suggestion?.imageUrl ?? result.product?.image;
    setImage(typeof detectedImage === 'string' ? detectedImage : '');
    const detectedPlaceId = result.product?.placeId || result.suggestion?.placeId || placeId;
    const detectedPlace = d.places.find((p) => p.id === detectedPlaceId);
    const detectedCurrency = result.product?.currency || result.suggestion?.currency;
    const currencyMismatch = Boolean(detectedCurrency && detectedCurrency !== currencyForCountry(detectedPlace?.country || place.country));
    if (result.product) setProduct(result.product);
    else if (result.suggestion) {
      const suggestion = result.suggestion;
      if (typeof suggestion.productName === 'string') setName(suggestion.productName);
      setCategory(Object.hasOwn(CATEGORIES, suggestion.category) ? suggestion.category : 'CHARACTER');
      setArt(['keyring', 'plush', 'pouch', 'tshirt', 'pin', 'bag'].includes(suggestion.art) ? suggestion.art : 'keyring');
      if (suggestion.placeId) setPlaceId(detectedPlace?.id || '');
      if (Number.isFinite(suggestion.localPrice) && suggestion.localPrice! > 0) setPrice(String(suggestion.localPrice));
      if (typeof suggestion.storeName === 'string') setStoreName(suggestion.storeName);
      if (suggestion.stockStatus) setInventoryStatus(suggestion.stockStatus);
      setOption(typeof suggestion.option === 'string' ? suggestion.option : '기본 옵션');
    }
    const filled = Boolean(typeof result.product?.name === 'string' ? result.product.name : typeof result.suggestion?.productName === 'string' ? result.suggestion.productName : '');
    setAiFilled(filled);
    const hasPrice = (result.product?.localPrice || result.suggestion?.localPrice || 0) > 0;
    if (currencyMismatch) {
      setPrice('');
      setError('판매 페이지의 가격 통화가 구매 장소와 달라요. 현지 판매 가격을 확인해주세요.');
    }
    if (!detectedPlace) setError('구매 장소를 확인하지 못했어요. 실제 판매처를 선택해주세요.');
    setEditingDetails(!filled || !hasPrice || currencyMismatch || !detectedPlace);
  };
  const resolve = async (sample = false, force = false) => {
    const value = sample ? 'https://demo.moa.local/products/1' : url.trim();
    if (!value || !validProductUrl(value) || (!force && (lastResolvedUrl.current === value || pendingUrl.current === value))) return;
    const run = beginRecognition();
    pendingUrl.current = value;
    if (sample) { currentUrl.current = value; setUrl(value); }
    setLinkStatus('checking');
    try {
      const result = await api<RecognitionResult>('/metadata', { url: value });
      if (recognitionRun.current !== run || currentUrl.current.trim() !== value) return;
      applyRecognition(result);
      lastResolvedUrl.current = value;
      setMetadataMessage(result.notice);
      setLinkStatus(['LINK_NOT_FOUND', 'LINK_UNREACHABLE', 'LINK_BLOCKED'].includes(result.status) ? 'error' : 'done');
    } catch (e) {
      if (recognitionRun.current !== run) return;
      setError((e as Error).message);
      setLinkStatus('error');
      setEditingDetails(true);
      lastResolvedUrl.current = '';
    } finally {
      if (recognitionRun.current === run) { pendingUrl.current = ''; setResolving(false); }
    }
  };
  useEffect(() => {
    const value = url.trim();
    if (method !== 'link' || !value || !validProductUrl(value)) {
      setLinkStatus('idle');
      return;
    }
    if (lastResolvedUrl.current === value || pendingUrl.current === value) return;
    setAiFilled(false);
    setLinkStatus('checking');
    setMetadataMessage('링크를 확인하고 있어요…');
    const timer = setTimeout(() => void resolve(), 650);
    return () => clearTimeout(timer);
  }, [url, method]);
  const photo = async () => {
    const selectionRun = recognitionRun.current;
    let run: number | null = null;
    try {
      const v = await pickImage();
      if (v && selectionRun === recognitionRun.current) {
        run = beginRecognition();
        pendingUrl.current = ''; lastResolvedUrl.current = ''; currentUrl.current = '';
        setUrl('');
        setImage(v);
        const result = await api<RecognitionResult>('/recognize', { image: v });
        if (recognitionRun.current !== run) return;
        applyRecognition(result, v);
        const ocr = Array.isArray(result.signals?.extractedText) ? result.signals.extractedText.filter((text) => typeof text === 'string').slice(0, 3).join(' · ') : '';
        setMetadataMessage(`${result.notice}${ocr ? ` 읽은 글자: ${ocr}` : ''}`);
      }
    } catch (e) {
      if (recognitionRun.current !== (run ?? selectionRun)) return;
      setError((e as Error).message);
      setEditingDetails(true);
    } finally {
      if (run !== null && recognitionRun.current === run) setResolving(false);
    }
  };
  const recognizeSample = async () => {
    const run = beginRecognition();
    pendingUrl.current = ''; lastResolvedUrl.current = ''; currentUrl.current = '';
    setUrl('');
    try {
      const result = await api<RecognitionResult>('/recognize', { sample: 'chiikawa' });
      if (recognitionRun.current !== run) return;
      applyRecognition(result);
      setMetadataMessage(
        result.notice,
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
    const issue = productValidation({ name, price, url, quantity, storeName, option, hasPlace: d.places.some((place) => place.id === placeId) });
    if (issue) {
      setError(!name.trim() && !editingDetails ? '링크를 붙여넣거나 사진을 올려주세요.' : issue);
      if (name.trim()) setEditingDetails(true);
      return;
    }
    setError('');
    setStep(2);
  };
  const submit = async () => {
    const issue = productValidation({ name, price, url, quantity, storeName, option, hasPlace: d.places.some((place) => place.id === placeId) });
    if (issue) { setError(issue); setEditingDetails(true); setStep(1); return; }
    if (!/^\d+$/.test(requestedReward) || !Number.isSafeInteger(reward) || reward > MAX_DEMO_REWARD) {
      setError(`여행자 보상은 0원부터 ${money(MAX_DEMO_REWARD)}까지 직접 정해주세요.`);
      return;
    }
    if (!validDate(desired) || desired < future(0)) {
      setError('희망 수령일은 오늘 이후의 날짜로 선택해주세요.');
      return;
    }
    if (!deliveryCity.trim() || deliveryCity.trim().length > 40) { setError('수령 도시를 40자 안으로 입력해주세요.'); openDeliveryEditor('region'); return; }
    const addressIssue = addressValidation({ recipient: deliveryRecipient, phone: deliveryPhone, postalCode: deliveryPostalCode, address1: deliveryAddress1, address2: deliveryAddress2 });
    if (mode === 'DOMESTIC_PARCEL' && addressIssue) {
      setError(addressIssue);
      openDeliveryEditor('address');
      return;
    }
    if (mode === 'MEETUP' && !meetupPoint) {
      setError('지도를 움직여 만날 지점을 정하고 ‘이 위치에서 만날게요’를 눌러주세요.');
      openDeliveryEditor('meetup');
      return;
    }
    setError('');
    const request = await a.mutate<ProductRequest>(
      '/requests',
      {
        ...(originalText ? { originalText } : {}),
        productName: name.trim(),
        productUrl: url.trim(),
        productImage: image,
        art,
        placeId,
        localPrice: Number(price),
        requestedReward: reward,
        quantity,
        desiredDate: desired,
        deliveryCountry,
        deliveryCity,
        category,
        storeName: storeName.trim(),
        option,
        transport: mode,
        inventoryStatus,
        ...(sourceRequest?.requesterId === d.me.id && sourceRequest.status === 'CANCELLED' ? { retryOfRequestId: sourceRequest.id } : {}),
        ...(mode === 'DOMESTIC_PARCEL' ? {
          deliveryAddressId: deliveryAddressId || undefined,
          deliveryRecipient: deliveryRecipient.trim(),
          deliveryPhone: deliveryPhone.trim(),
          deliveryPostalCode: deliveryPostalCode.trim(),
          deliveryAddress1: deliveryAddress1.trim(),
          deliveryAddress2: deliveryAddress2.trim(),
        } : { meetupLocation: meetupLocation.trim(), meetupPoint }),
      },
      '부탁을 저장했어요. 결제하면 여행자에게 공개돼요.',
    );
    if (request) {
      a.setRequestDraft(null);
      a.nav('payment', { requestIds: [request.id] });
    }
  };
  return (
    <Page
      title="이거 부탁하기"
      resetScrollKey={`${step}:${error}`}
      onBack={step === 2 ? () => setStep(1) : undefined}
      footer={
        <Stack gap={6}>
          {step === 2 && (
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              결제 후 지원한 여행자 중 한 명을 직접 선택해요.
            </Txt>
          )}
          <Button
            label={step === 1 ? '수령 방법 정하기' : '결제 금액 확인하기'}
            icon={step === 1 ? ArrowRight : Check}
            loading={a.busy || resolving || linkStatus === 'checking'}
            onPress={step === 1 ? next : submit}
          />
        </Stack>
      }
    >
      <Row style={{ gap: 12 }}>
        {['상품 확인', '수령·보상'].map((label, index) => <Row key={label} style={{ flex: 1, gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: step >= index + 1 ? c.primary : c.border }}>
            {step > index + 1 ? <Check size={14} color={c.onPrimary} /> : <Txt size={12} weight="700" color={step >= index + 1 ? c.onPrimary : c.secondary}>{index + 1}</Txt>}
          </View>
          <Txt size={13} weight="600" color={step >= index + 1 ? c.primaryDeep : c.muted}>{label}</Txt>
          {index === 0 && <View style={{ flex: 1, height: 1, backgroundColor: c.border, marginLeft: 4 }} />}
        </Row>)}
      </Row>
      <Stack gap={8}>
        <Txt size={28} weight="700">
          {step === 1 ? '어떤 물건을 부탁할까요?' : '어떻게 받을까요?'}
        </Txt>
        <Txt color={c.secondary}>
          {step === 1
            ? d.recognition?.image === false
              ? '상품 링크로 시작해보세요.'
              : '링크나 사진으로 상품 정보를 채워드려요.'
            : '받는 방법과 여행자 보상을 정해주세요.'}
        </Txt>
      </Stack>
      {error.length > 0 && <Notice tone="error">{error}</Notice>}
      {step === 1 ? (
        <>
          <Row style={{ gap: 12 }}>
            {([{ value: 'link', title: '상품 링크', icon: Link }, { value: 'photo', title: '사진 올리기', icon: ImagePlus }] as const).map((item) => <Pressable
              key={item.value} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: method === item.value }} aria-selected={method === item.value}
              onPress={() => {
                if (method === item.value) return;
                pendingUrl.current = '';
                recognitionRun.current++; setResolving(false); clearFeedback(); setMethod(item.value);
              }}
              style={({ pressed }) => ({ flex: 1, minHeight: 88, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1.5, borderColor: method === item.value ? c.primary : c.border, backgroundColor: method === item.value ? c.primarySoft : c.paper, opacity: pressed ? 0.7 : 1 })}>
              <Row style={{ justifyContent: 'space-between' }}><item.icon size={23} color={method === item.value ? c.primaryStrong : c.secondary} />{method === item.value && <Check size={16} color={c.primaryStrong} />}</Row>
              <Txt size={15} weight="700" color={method === item.value ? c.primaryDeep : c.secondary}>{item.title}</Txt>
            </Pressable>)}
          </Row>
          {method === 'link' ? (
            <Stack gap={12}>
              <Field
                label="상품 링크"
                value={url}
                onChange={changeUrl}
                keyboard="url"
                placeholder="상품 페이지의 링크를 붙여넣어 주세요"
              />
              {(resolving || linkStatus === 'checking') ? <Row style={{ gap: 7 }}><Sparkles size={15} color={c.green} /><Txt size={13} color={c.green}>상품 정보를 가져오고 있어요</Txt></Row> : linkStatus === 'error' && <Button label="링크 다시 확인하기" kind="secondary" icon={Sparkles} onPress={() => resolve(false, true)} />}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="예시 링크로 빠르게 채우기"
                onPress={() => resolve(true)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Txt size={13} color={c.secondary}>
                  링크가 없다면 예시로 체험하기
                </Txt>
              </Pressable>
            </Stack>
          ) : (
            <Stack gap={10}>
              <Button
                label={image ? '사진 다시 선택하고 인식하기' : '사진 보내고 바로 인식하기'}
                icon={ImagePlus}
                kind="secondary"
                loading={resolving}
                onPress={photo}
              />
              <Txt size={13} color={c.secondary}>
                {d.recognition?.image === false
                  ? '사진 자동 인식은 준비 중이에요. 샘플로 먼저 체험할 수 있어요.'
                  : '상품 이름과 포장이 잘 보이는 사진을 골라주세요.'}
              </Txt>
              <Txt size={12} color={c.muted}>
                자동 인식을 위해 선택한 사진이 전송돼요.
              </Txt>
              <Button
                small
                label="치이카와 샘플로 인식 체험"
                kind="ghost"
                icon={Sparkles}
                loading={resolving}
                onPress={recognizeSample}
              />
            </Stack>
          )}
          {metadataMessage.length > 0 && !resolving && (linkStatus === 'error' || !aiFilled) && (
            <Notice tone={linkStatus === 'error' ? 'error' : 'info'}>{metadataMessage}</Notice>
          )}
          {aiFilled && !editingDetails ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Stack gap={16} style={{ padding: 20 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <Sparkles size={18} color={c.green} />
                    <Txt size={14} weight="600">
                      {preset ? '이전 부탁을 불러왔어요' : sampleFilled ? '예시 상품을 채웠어요' : '상품 정보를 채웠어요'}
                    </Txt>
                  </Row>
                  <Button small label="수정" kind="ghost" onPress={editProductManually} />
                </Row>
                <Row style={{ alignItems: 'flex-start' }}>
                  <ProductArt
                    image={image}
                    art={art}
                    featured={name.includes('치이카와')}
                    size={92}
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
                    <Txt size={24} weight="800">{price ? money(q.productPrice) : '가격 확인 필요'}</Txt>
                    <Txt size={12} color={c.secondary}>{CATEGORIES[category]} · {localMoney(Number(price), currencyForCountry(place.country))}</Txt>
                    {option !== '기본 옵션' && <Txt size={13} color={c.secondary}>{option}</Txt>}
                  </Stack>
                </Row>
              </Stack>
              <View style={{ backgroundColor: c.primarySoft, paddingHorizontal: 20, paddingVertical: 14 }}><Txt size={12} color={c.primaryDeep}>
                  {preset
                    ? '수령 방법과 날짜를 확인하고 다시 부탁해주세요.'
                    : sampleFilled
                    ? '예시 정보예요. 실제 상품·재고 확인 결과는 아니에요.'
                    : '이 상품이 맞는지 확인해주세요. 재고는 구매 전에 확인해요.'}
                </Txt></View>
            </Card>
          ) : editingDetails ? (
            <>
          <Card><Stack gap={18}>
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
                size={76}
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
            placeholder="예: 시부야 PARCO"
          />
          <View>
            <Txt size={14} weight="600" style={{ marginBottom: 10 }}>어디에서 살 수 있나요?</Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="구매 장소 검색 열기"
              onPress={() => setPlaceSearchOpen(true)}
              style={({ pressed }) => ({ minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.76 : 1 })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.lilac, alignItems: 'center', justifyContent: 'center' }}><MapPin size={20} color={c.green} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Txt size={12} color={c.secondary}>구매 장소</Txt><Txt size={16} weight="700" lines={1}>{place.city} · {place.name}</Txt></View>
              <ChevronRight size={20} color={c.muted} />
            </Pressable>
          </View>
          <View>
            <Txt size={14} weight="600" style={{ marginBottom: 10 }}>상품 종류</Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="상품 종류 선택 열기"
              onPress={() => { setCategoryPath(null); setCategoryPickerOpen(true); }}
              style={({ pressed }) => ({ minHeight: 62, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.76 : 1 })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Txt size={12} color={c.secondary}>카테고리</Txt><Txt size={16} weight="700">{CATEGORIES[category]}</Txt></View>
              <ChevronRight size={20} color={c.muted} />
            </Pressable>
          </View>
          <Field label="옵션" value={option} onChange={setOption} placeholder="색상·사이즈 등" />
          <Txt size={12} color={c.secondary}>
            식품·의약품·주류·담배·고가 명품은 요청할 수 없어요.
          </Txt>
          </Stack></Card>
          <Sheet
            visible={placeSearchOpen}
            title="구매 장소 찾기"
            subtitle="도시, 매장, 쇼핑몰 이름으로 검색하세요."
            onClose={() => { setPlaceSearchOpen(false); setPlaceQuery(''); }}
          >
            <SearchField label="구매 장소 검색" value={placeQuery} onChange={setPlaceQuery} placeholder="예: 시부야 PARCO, 도쿄, 치이카와" />
            <Txt size={12} color={c.secondary}>{placeQuery.trim() ? `${placeResults.length}곳을 찾았어요` : '여행지와 매장을 한 번에 찾아보세요.'}</Txt>
            {placeResults.map((candidate) => <Pressable key={candidate.id} accessibilityRole="button" accessibilityLabel={`${candidate.city} ${candidate.name} 선택`} onPress={() => {
              if (candidate.country !== place.country) setPrice('');
              setPlaceId(candidate.id); setStoreName(candidate.name); setInventoryStatus('CHECK_REQUIRED'); setError('');
              setPlaceSearchOpen(false); setPlaceQuery('');
            }} style={({ pressed }) => ({ minHeight: 76, padding: 16, borderRadius: 16, backgroundColor: placeId === candidate.id ? c.lilac : c.canvas, borderWidth: 1, borderColor: placeId === candidate.id ? c.green : c.border, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.72 : 1 })}>
              {getPlacePhoto(candidate) ? <Image source={getPlacePhoto(candidate)!.source} style={{ width: 54, height: 54, borderRadius: 12 }} resizeMode="cover" /> : <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}><MapPin size={18} color={c.green} /></View>}
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Txt size={16} weight="700" lines={1}>{candidate.name}</Txt><Txt size={12} color={c.secondary} lines={1}>{countryName(candidate.country)} · {candidate.city} · {candidate.region}</Txt></View>
              {placeId === candidate.id ? <Check size={20} color={c.green} /> : <ChevronRight size={18} color={c.muted} />}
            </Pressable>)}
            {!placeResults.length && <Empty title="찾는 장소가 없어요" body="도시나 매장 이름을 다시 검색해보세요." />}
          </Sheet>
          <Sheet
            visible={categoryPickerOpen}
            title={categoryPath ? categoryPath.name : '상품 종류 선택'}
            subtitle={categoryPath ? '가장 가까운 상품 종류를 골라주세요.' : '먼저 상품이 속한 큰 범주를 골라주세요.'}
            onClose={() => { setCategoryPickerOpen(false); setCategoryPath(null); }}
          >
            {categoryPath ? <>
              <Button small kind="ghost" label="← 큰 범주로 돌아가기" onPress={() => setCategoryPath(null)} style={{ alignSelf: 'flex-start' }} />
              {categoryPath.values.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${CATEGORIES[value]} 선택`} onPress={() => { setCategory(value); setCategoryPickerOpen(false); setCategoryPath(null); }} style={({ pressed }) => ({ minHeight: 68, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: category === value ? c.green : c.border, backgroundColor: category === value ? c.lilac : c.paper, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.72 : 1 })}><Txt size={16} weight="700" style={{ flex: 1 }}>{CATEGORIES[value]}</Txt>{category === value ? <Check size={20} color={c.green} /> : <ChevronRight size={19} color={c.muted} />}</Pressable>)}</> : CATEGORY_PATHS.map((path) => <Pressable key={path.name} accessibilityRole="button" accessibilityLabel={`${path.name} 상품 종류 선택`} onPress={() => setCategoryPath(path)} style={({ pressed }) => ({ minHeight: 78, padding: 16, borderRadius: 16, backgroundColor: c.paper, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.72 : 1 })}><View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt size={16} weight="700">{path.name}</Txt><Txt size={12} color={c.secondary}>{path.description}</Txt></View><ChevronRight size={19} color={c.muted} /></Pressable>)}
          </Sheet>
            </>
          ) : null}
          <ProductOriginal text={originalText} />
          {!aiFilled && !editingDetails && (
            <Button
              small
              label="사진 없이 직접 입력하기"
              kind="ghost"
              onPress={editProductManually}
            />
          )}
        </>
      ) : (
        <>
          <Card><Stack gap={16}>
            <Row style={{ alignItems: 'flex-start' }}>
              <ProductArt
                art={art}
                image={image}
                featured={name.includes('치이카와')}
                size={56}
              />
              <View style={{ flex: 1 }}>
                <Txt weight="700">{name}</Txt>
                <Txt size={13} color={c.secondary}>
                  {place.name}
                </Txt>
              </View>
              <Button small label="수정" kind="ghost" onPress={() => setStep(1)} />
            </Row>
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
          </Stack></Card>
          <Stack gap={10}>
            <Row style={{ justifyContent: 'space-between' }}><Txt size={17} weight="700">받는 방법</Txt><Pressable accessibilityRole="button" accessibilityLabel="수령 지역 변경" onPress={() => openDeliveryEditor('region')} style={{ minHeight: 44, justifyContent: 'center' }}><Row style={{ gap: 3 }}><Txt size={12} color={c.secondary}>{countryName(deliveryCountry)} · {deliveryCity}</Txt><ChevronRight size={14} color={c.muted} /></Row></Pressable></Row>
            {([
              ['DOMESTIC_PARCEL', '국내 택배 · ₩3,500', '국내 택배', '귀국 후 집으로 보내드려요', parcelQuote],
              ['MEETUP', '직접 전달 · 무료', '직접 만나요', '배송비 없이 가까운 곳에서 받아요', meetupQuote],
            ] as const).map(([value, accessibilityLabel, label, description, priceQuote]) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: mode === value }} aria-selected={mode === value} aria-pressed={mode === value} onPress={() => { if (value === 'MEETUP' && !meetupPoint) openDeliveryEditor('meetup'); setTransport(value); }}
              style={({ pressed }) => ({ padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: mode === value ? c.primary : c.border, backgroundColor: mode === value ? c.primarySoft : c.paper, gap: 14, opacity: pressed ? 0.7 : 1 })}>
              <Row style={{ gap: 10 }}>
                {value === 'DOMESTIC_PARCEL' ? <Package size={21} color={mode === value ? c.primaryStrong : c.secondary} /> : <MapPin size={21} color={mode === value ? c.primaryStrong : c.secondary} />}
                <Txt size={16} weight="700" style={{ flex: 1 }}>{label}</Txt>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: mode === value ? c.primary : c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === value ? c.primary : c.paper }}>{mode === value && <Check size={13} color={c.onPrimary} />}</View>
              </Row>
              <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 5 }}><Txt size={12} color={c.secondary}>{description}</Txt><Txt size={12} weight="600" color={c.primaryDeep}>{value === 'MEETUP' ? '배송비 0원' : '배송비 3,500원'}</Txt></View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}><Txt size={11} color={c.secondary}>{requestedReward === '' ? '보상 입력 전' : '예상 합계'}</Txt><Txt size={20} weight="800">{money(priceQuote.totalPrice)}</Txt></View>
              </Row>
            </Pressable>)}
          </Stack>
          {mode === 'DOMESTIC_PARCEL' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="받을 배송지 변경" onPress={() => openDeliveryEditor('address')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <MapPin size={19} color={c.secondary} /><View style={{ flex: 1, gap: 5 }}><Txt size={13} weight="600">{deliveryAddressId && deliveryAddressId === defaultAddress?.id ? '기본 배송지' : '받을 배송지'}</Txt><Txt size={14} color={c.secondary}>{deliveryAddress1 ? `${deliveryAddress1} ${deliveryAddress2}`.trim() : '배송지를 추가해주세요'}</Txt>{!!deliveryRecipient && <Txt size={12} color={c.muted}>{deliveryRecipient} · {deliveryPhone}</Txt>}</View><ChevronRight size={19} color={c.muted} />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="직거래 위치 변경" onPress={() => openDeliveryEditor('meetup')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <MapPin size={19} color={c.secondary} /><View style={{ flex: 1, gap: 5 }}><Txt size={14} weight="600">{meetupPoint?.name || '어디에서 만날까요?'}</Txt><Txt size={12} color={c.secondary}>{meetupPoint ? '직거래 위치가 저장됐어요' : '지도에서 만날 곳을 골라주세요'}</Txt>{!!meetupPoint?.detail && <Txt size={12} color={c.muted}>{meetupPoint.detail}</Txt>}</View><ChevronRight size={19} color={c.muted} />
            </Pressable>
          )}
          <Divider />
          <DateField label="희망 수령일" value={desired} onChange={setDesired} min={future(0)} />
          <Stack gap={10}><Txt size={19} weight="700">고마운 마음, 얼마를 전할까요?</Txt><Field label="여행자 보상 (원)" value={requestedReward} onChange={(value) => { setRequestedReward(value.replace(/[^0-9]/g, '').slice(0, 7)); setError(''); }} keyboard="numeric" placeholder="직접 금액을 정해주세요" hint="보상은 부탁하는 사람이 자유롭게 정해요." /></Stack>
          <Card><Stack gap={20}><Row><ShieldCheck size={20} color={c.primary} /><Txt size={18} weight="700">예상 결제금액</Txt></Row><MoneyBreakdown price={q} rewardPending={requestedReward === ''} />{fx.loading && <Txt size={12} color={c.secondary}>최신 환율을 확인하고 있어요.</Txt>}{fx.failed && <Button small kind="ghost" label="환율 다시 확인" onPress={() => void fx.refresh()} />}<Txt size={12} color={c.secondary}>먼저 결제하고 지원한 여행자를 선택해요. 상품을 받은 뒤 정산돼요. 실제 적용 금액은 결제 전에 다시 확인해요.</Txt></Stack></Card>
          <Sheet visible={editingMeetup} title="어디에서 만날까요?" onClose={cancelDeliveryEditor}>
            {editingMeetup && <MeetupPicker key={deliveryCountry} country={deliveryCountry} value={meetupPoint} legacyName={meetupLocation} history={completedMeetups} onChange={(point) => {
              setMeetupPoint(point);
              if (point) { setMeetupLocation(point.name); finishDeliveryEditor(); }
            }} />}
          </Sheet>
          <Sheet visible={editingAddress} title="어디로 보내드릴까요?" onClose={cancelDeliveryEditor} footer={<Button label="이 배송지로 받을게요" disabled={!!addressValidation({ recipient: deliveryRecipient, phone: deliveryPhone, postalCode: deliveryPostalCode, address1: deliveryAddress1, address2: deliveryAddress2 })} onPress={finishDeliveryEditor} />}>
            {deliveryCountry === 'KR' && defaultAddress && deliveryAddressId !== defaultAddress.id && <Button kind="secondary" label="기본 배송지로 설정" onPress={() => {
              setDeliveryAddressId(defaultAddress.id); setDeliveryRecipient(defaultAddress.recipient); setDeliveryPhone(defaultAddress.phone); setDeliveryPostalCode(defaultAddress.postalCode); setDeliveryAddress1(defaultAddress.address1); setDeliveryAddress2(defaultAddress.address2);
            }} />}
            <Field label="받는 분" value={deliveryRecipient} onChange={(value) => { setDeliveryAddressId(''); setDeliveryRecipient(value); }} />
            <Field label="연락처" value={deliveryPhone} onChange={(value) => { setDeliveryAddressId(''); setDeliveryPhone(value); }} />
            <Field label="우편번호" value={deliveryPostalCode} onChange={(value) => { setDeliveryAddressId(''); setDeliveryPostalCode(value); }} keyboard="numeric" />
            <Field label="주소" value={deliveryAddress1} onChange={(value) => { setDeliveryAddressId(''); setDeliveryAddress1(value); }} placeholder="도로명 주소" />
            <Field label="상세 주소" value={deliveryAddress2} onChange={(value) => { setDeliveryAddressId(''); setDeliveryAddress2(value); }} />
          </Sheet>
          <Sheet visible={editingRegion} title="어느 지역에서 받으세요?" onClose={cancelDeliveryEditor} footer={<Button label="이 지역에서 받을게요" disabled={!deliveryCity.trim() || deliveryCity.trim().length > 40} onPress={finishDeliveryEditor} />}>
            <Row>{(['KR', 'JP'] as const).map((code) => <Chip key={code} label={countryName(code)} selected={deliveryCountry === code} onPress={() => {
              if (deliveryCountry === code) return;
              if (deliveryCountry !== code) { setMeetupPoint(undefined); setMeetupLocation(''); setDeliveryAddressId(''); setDeliveryAddress1(''); setDeliveryAddress2(''); setDeliveryPostalCode(''); }
              setDeliveryCountry(code); setDeliveryCity(code === 'KR' ? '서울' : '도쿄');
            }} />)}</Row><Field label="수령 도시" value={deliveryCity} onChange={(value) => { setDeliveryCity(value); if (value.trim() !== deliveryCity.trim()) { setMeetupPoint(undefined); setMeetupLocation(''); } }} />
          </Sheet>
        </>
      )}
    </Page>
  );
}
export function TripForm() {
  const a = useApp();
  if (!a.data) return <Page title="여행 등록"><Empty title="여행 정보를 불러오는 중이에요" /></Page>;
  return <TripFormContent key={a.data.me.id} />;
}
function TripFormContent() {
  const a = useApp(),
    d = a.data!;
  const homeAddress = (d.addresses || []).find((item) => item.userId === d.me.id && item.isDefault);
  const homeCity = homeAddress?.address1.match(/서울|부산|대구|인천|광주|대전|울산|제주/)?.[0]
    || homeAddress?.address1.trim().split(/\s+/).find((part) => /[시군]$/.test(part))?.replace(/[시군]$/, '') || '';
  const [restored] = useState(() => {
    const current = readTripDraft(d.me.id);
    if (current || !a.tripDraft) return current;
    const previous = a.tripDraft;
    const areas = previous.cities.filter((city) => TRIP_AREAS[previous.destinationCountry].some((area) => area.name === city));
    return {
      departure: previous.departureCity, depCountry: previous.departureCountry,
      originSource: 'manual' as const, country: previous.destinationCountry, areas,
      customStops: [], places: previous.placeIds.filter((id) => d.places.some((place) => place.id === id && place.country === previous.destinationCountry && areas.includes(place.city))),
      start: previous.startDate, end: previous.endDate, capacity: previous.capacity,
    };
  });
  const initialStart = restored?.start && restored.start >= future(0) ? restored.start : future(4);
  const initialEnd = restored?.end && restored.end >= initialStart ? restored.end : initialStart > future(7) ? initialStart : future(7);
  const [departure, setDeparture] = useState(restored?.departure ?? homeCity),
    [depCountry, setDepCountry] = useState<Country>(restored?.depCountry || 'KR'),
    [originSource, setOriginSource] = useState<'address' | 'gps' | 'manual'>(restored?.originSource || (homeAddress ? 'address' : 'manual')),
    [editingOrigin, setEditingOrigin] = useState(false),
    [locating, setLocating] = useState(false),
    [country, setCountry] = useState<Country>(restored?.country || 'JP'),
    [areas, setAreas] = useState<string[]>(restored?.areas || []),
    [customStops, setCustomStops] = useState<string[]>(restored?.customStops || []),
    [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(initialEnd),
    [capacity, setCapacity] = useState(restored?.capacity ?? '8'),
    [places, setPlaces] = useState<string[]>(restored?.places.filter((id) => d.places.some((place) => place.id === id && place.country === restored.country && restored.areas.includes(place.city))) || []),
    [error, setError] = useState('');
  const saved = useRef(false), storageWarning = useRef(false);
  const originSnapshot = useRef<{ departure: string; depCountry: Country; originSource: typeof originSource } | null>(null);
  const locationRun = useRef(0);
  useEffect(() => () => { locationRun.current++; }, []);
  const openOriginEditor = () => { originSnapshot.current = { departure, depCountry, originSource }; setEditingOrigin(true); };
  const finishOriginEditor = () => { locationRun.current++; setLocating(false); originSnapshot.current = null; setEditingOrigin(false); setError(''); };
  const cancelOriginEditor = () => {
    const previous = originSnapshot.current;
    if (previous) { setDeparture(previous.departure); setDepCountry(previous.depCountry); setOriginSource(previous.originSource); }
    finishOriginEditor();
  };
  useEffect(() => {
    if (saved.current || editingOrigin) return;
    const stored = writeTripDraft(d.me.id, { departure, depCountry, originSource, country, areas, customStops, start, end, places, capacity });
    if (!stored && !storageWarning.current) { storageWarning.current = true; a.notify('임시 저장을 사용할 수 없어요. 이 화면에서 일정을 마저 등록해주세요.'); }
  }, [d.me.id, departure, depCountry, originSource, country, areas, customStops, start, end, places, capacity, editingOrigin]);
  const locateDeparture = async () => {
    const currentRun = ++locationRun.current;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (currentRun !== locationRun.current) return;
      if (permission.status !== 'granted') throw new Error('위치 권한을 허용해주세요.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync(current.coords);
      if (currentRun !== locationRun.current) return;
      const code = address?.isoCountryCode?.toUpperCase();
      const city = address?.city || address?.district || address?.subregion || address?.region;
      if (!city) throw new Error('현재 도시를 확인하지 못했어요.');
      if (!code || !(COUNTRY_CODES as readonly string[]).includes(code)) throw new Error('현재 위치는 지원하는 출발 국가가 아니에요. 출발지를 직접 선택해주세요.');
      setDepCountry(code as Country);
      setDeparture(city);
      setOriginSource('gps');
      finishOriginEditor();
      a.notify('현재 위치를 출발지로 설정했어요.');
    } catch (locationError) {
      if (currentRun !== locationRun.current) return;
      const message = (locationError as Error).message || '';
      a.notify(/[가-힣]/.test(message) ? message : '현재 도시를 확인하지 못했어요. 출발지를 직접 선택해주세요.');
    } finally {
      if (currentRun === locationRun.current) setLocating(false);
    }
  };
  const submit = async () => {
    if (!departure.trim() || departure.trim().length > 40) {
      setError('출발 도시를 40자 안으로 입력해주세요.');
      openOriginEditor();
      return;
    }
    if (!validDate(start) || !validDate(end) || start < future(0) || end < start) {
      setError('오늘 이후의 시작일과 그 이후의 종료일을 선택해주세요.');
      return;
    }
    const maxItems = Number(capacity);
    if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 20) {
      setError('가져올 수량을 1~20개 사이로 정해주세요.');
      return;
    }
    const destinationAreas = areas.length ? areas : [`${countryName(country)} 전역`];
    const t = await a.mutate<Trip>(
      '/trips',
      {
        departureCountry: depCountry,
        departureCity: departure.trim(),
        destinationCountry: country,
        destinationCity: destinationAreas[0],
        destinationAreas,
        startDate: start,
        endDate: end,
        placeIds: places,
        customStops,
        maxItems,
      },
      '여행을 등록했어요. 왕복 항공권을 확인해주세요.',
    );
    if (t) {
      saved.current = true;
      writeTripDraft(d.me.id, null);
      a.setTripDraft(null);
      a.setRole('traveler');
      a.nav('flight-proof', { id: t.id });
    }
  };
  return (
    <Page
      title="어디로 떠나세요?"
      resetScrollKey={error}
      footer={
        <Button
          label="이 일정으로 계속"
          icon={ArrowRight}
          loading={a.busy}
          onPress={submit}
        />
      }
    >
      {error.length > 0 && <Notice tone="error">{error}</Notice>}
      <Stack gap={8}><Txt size={12} weight="700" color={c.primaryStrong}>MY NEXT TRIP</Txt><Txt size={28} weight="800">여행지만 알려주세요.</Txt><Txt size={15} color={c.secondary}>가는 길의 부탁을 모아드릴게요.</Txt></Stack>
      <PlaneRouteAnimation departure={departure.trim() || '출발지'} destination={areas[0] || countryName(country)} compact />
      <View style={{ backgroundColor: c.paper, borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: c.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="출발지 변경" onPress={openOriginEditor} style={({ pressed }) => ({ paddingVertical: 16, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.65 : 1 })}>
          <LocateFixed size={21} color={c.secondary} /><View style={{ flex: 1, gap: 4 }}><Txt size={12} color={c.secondary}>출발 · {originSource === 'gps' ? '현재 위치' : originSource === 'address' ? '기본 배송지' : '직접 선택'}</Txt><Txt size={16} weight="600">{departure ? `${countryName(depCountry)} · ${departure}` : '출발지를 선택해주세요'}</Txt></View><ChevronRight size={19} color={c.muted} />
        </Pressable>
        <Divider />
        <TripRoutePicker country={country} areas={areas} onChange={(nextCountry, selectedAreas) => {
          setCountry(nextCountry); setAreas(selectedAreas); setError('');
          setPlaces(places.filter((id) => d.places.some((place) => place.id === id && place.country === nextCountry && selectedAreas.includes(place.city))));
          setCustomStops(country === nextCountry ? customStops.filter((stop) => selectedAreas.some((area) => stop.startsWith(`${area} · `))) : []);
        }} />
        <Divider />
        <DateRangePicker start={start} end={end} min={future(0)} onChange={(nextStart, nextEnd) => { setStart(nextStart); setEnd(nextEnd); setError(''); }} />
      </View>
      <View style={{ gap: 8 }}><Row style={{ justifyContent: 'space-between' }}><Txt size={19} weight="700">들를 곳도 정해졌나요?</Txt><Txt size={12} color={c.muted}>선택</Txt></Row>
        <TripStopPicker country={country} areas={areas} catalog={d.places} placeIds={places} customStops={customStops} onChange={(ids, stops) => { setPlaces(ids); setCustomStops(stops); }} />
      </View>
      <Divider />
      <Row style={{ justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Txt size={16} weight="700">가져올 수 있는 수량</Txt><Txt size={12} color={c.secondary}>짐과 일정에 맞게 정해주세요.</Txt></View><Row style={{ gap: 8 }}><IconButton icon={Minus} label="여행 상품 수량 줄이기" onPress={() => setCapacity(String(Math.max(1, Number(capacity) - 1)))} /><Txt size={23} weight="800">{capacity}</Txt><IconButton icon={Plus} label="여행 상품 수량 늘리기" onPress={() => setCapacity(String(Math.min(20, Number(capacity) + 1)))} /></Row></Row>
      <Row style={{ gap: 8, padding: 16, borderRadius: 16, backgroundColor: c.primarySoft }}><ShieldCheck size={19} color={c.primaryStrong} /><Txt size={13} color={c.primaryDeep} style={{ flex: 1 }}>저장 후 항공권을 확인해요. 인증을 마쳐야 부탁에 지원할 수 있어요.</Txt></Row>
      <Sheet visible={editingOrigin} title="어디에서 출발하세요?" onClose={cancelOriginEditor} footer={<Button label="이 출발지로 설정" disabled={!departure.trim() || departure.trim().length > 40} onPress={finishOriginEditor} />}>
        {Platform.OS !== 'web' ? <Button kind="secondary" icon={LocateFixed} label="현재 위치로 바꾸기" loading={locating} onPress={() => void locateDeparture()} /> : <Txt size={13} color={c.secondary}>웹에서는 출발 도시를 직접 선택해주세요.</Txt>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {COUNTRY_CODES.map((code) => <Chip key={code} label={countryName(code)} selected={code === depCountry} onPress={() => { if (depCountry !== code) setDeparture(''); setDepCountry(code); setOriginSource('manual'); }} />)}
        </ScrollView>
        <Field label="출발 도시" value={departure} onChange={(value) => { setDeparture(value); setOriginSource('manual'); }} placeholder="예: 서울" />
      </Sheet>
    </Page>
  );
}
