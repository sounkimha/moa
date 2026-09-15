import type { RequestDraft } from './AppContext';

const key = 'moa-request-draft-v1';
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const strings = [
  'url', 'name', 'image', 'price', 'desired', 'placeId', 'storeName', 'option',
  'metadataMessage', 'deliveryCity', 'deliveryAddressId', 'deliveryRecipient',
  'deliveryPhone', 'deliveryPostalCode', 'deliveryAddress1', 'deliveryAddress2', 'meetupLocation',
] as const;

export function clearDraft(storage: SessionStorage) {
  try { storage.removeItem(key); } catch { /* Private browsing can disable storage. */ }
}

export function readDraft(storage: SessionStorage, ownerId: string): RequestDraft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 4_000_000) return null;
    const saved = JSON.parse(raw), draft = saved.draft;
    if (saved.ownerId !== ownerId || !draft || ![1, 2].includes(draft.step) ||
      !['link', 'photo'].includes(draft.method) ||
      !Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 100 ||
      !strings.every((field) => typeof draft[field] === 'string') ||
      !['CHARACTER', 'GAME', 'POPUP', 'LOCAL', 'FASHION', 'CONCERT'].includes(draft.category) ||
      !['keyring', 'plush', 'pouch', 'tshirt', 'pin', 'bag'].includes(draft.art) ||
      !['KR', 'JP', 'TW', 'HK', 'CN', 'TH', 'VN', 'SG', 'MY', 'ID'].includes(draft.deliveryCountry) ||
      !['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'CHECK_REQUIRED'].includes(draft.inventoryStatus) ||
      (draft.sourceRequestId !== undefined && typeof draft.sourceRequestId !== 'string') ||
      (draft.entryPlaceId !== undefined && typeof draft.entryPlaceId !== 'string') ||
      (draft.entryMethod !== undefined && !['link', 'photo'].includes(draft.entryMethod)) ||
      !['aiFilled', 'editingDetails'].every((field) => typeof draft[field] === 'boolean') ||
      !['MEETUP', 'DOMESTIC_PARCEL'].includes(draft.transport)) {
      clearDraft(storage);
      return null;
    }
    // Optional nested metadata is not necessary to resume a draft safely.
    if (draft.meetupPoint && (!Number.isFinite(draft.meetupPoint.latitude) ||
      !Number.isFinite(draft.meetupPoint.longitude) ||
      Math.abs(draft.meetupPoint.latitude) > 90 || Math.abs(draft.meetupPoint.longitude) > 180 ||
      !['name', 'address', 'detail'].every((field) => typeof draft.meetupPoint[field] === 'string')))
      delete draft.meetupPoint;
    if (draft.originalText && !['productName', 'storeName', 'purchaseLocation', 'option']
      .every((field) => typeof draft.originalText[field] === 'string')) delete draft.originalText;
    return draft as RequestDraft;
  } catch {
    clearDraft(storage);
    return null;
  }
}

// Web tab-session only. Never persist tickets, account tokens or drafts in localStorage.
export function writeDraft(storage: SessionStorage, ownerId: string, draft: RequestDraft | null): boolean {
  if (!draft) { clearDraft(storage); return true; }
  try {
    const serialized = JSON.stringify({ ownerId, draft });
    if (serialized.length > 4_000_000) throw new Error('Draft too large');
    storage.setItem(key, serialized);
    return true;
  } catch {
    // Do not leave an older draft behind and pretend the latest edit was saved.
    clearDraft(storage);
    return false;
  }
}
