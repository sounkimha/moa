import { Database, quote } from '@moa/domain';
import { base } from '../common/validation';

/** Upgrade saved prototype data without rewriting already-paid financial history. */
export function migrateLegacyDelivery(db: Database): boolean {
  let changed = false;
  for (const receipt of db.receipts) {
    if (!receipt.outcome) {
      receipt.outcome = 'PURCHASED';
      changed = true;
    }
  }
  for (const row of [...db.requests, ...db.offers, ...db.transactions, ...db.shipments]) {
    if (String(row.transport) !== 'INTERNATIONAL_SHIPPING') continue;
    row.transport = 'DOMESTIC_PARCEL';
    if ('revision' in row) row.revision++;
    changed = true;
    if ('totalPrice' in row) {
      const request = db.requests.find((r) => r.id === row.requestId);
      const unpaid = row.status === 'MATCHED' &&
        !db.payments.some((p) => p.transactionId === row.id) &&
        !db.escrows.some((e) => e.transactionId === row.id);
      if (unpaid && request) {
        Object.assign(row, quote(request, row.travelerReward, 'DOMESTIC_PARCEL'));
      }
      db.events.push({
        ...base(), actorId: row.buyerId, transactionId: row.id,
        type: 'DELIVERY_POLICY_UPDATED',
        note: unpaid
          ? '귀국 후 국내 택배로 정리했어요. 결제 전 예상 금액을 다시 계산했어요.'
          : '귀국 후 전달 방식으로 정리했어요. 이전 결제·환불·정산 금액은 당시 기록 그대로 보관해요.',
      });
    }
  }
  if (changed) for (const bundle of db.bundles)
    bundle.totalReward = db.offers.filter((o) => bundle.offerIds.includes(o.id))
      .reduce((total, o) => total + o.reward, 0);
  return changed;
}
