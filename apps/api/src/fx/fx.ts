import { BadRequestException, Controller, Get, Injectable, Param } from '@nestjs/common';
import { CURRENCY_CODES, Currency, DEMO_FX_RATES, FxRate } from '@moa/domain';

type CachedRate = { rate: FxRate; expiresAt: number };

function validRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1_000_000;
}
function recentRateDate(value: string): boolean {
  const timestamp = Date.parse(value);
  const age = Date.now() - timestamp;
  // Reference feeds skip weekends and bank holidays, but an old stored response is not a current rate.
  return Number.isFinite(timestamp) && age >= -24 * 60 * 60_000 && age < 8 * 24 * 60 * 60_000;
}

@Injectable()
export class FxService {
  private readonly cache = new Map<Currency, CachedRate>();
  private readonly pending = new Map<Currency, Promise<FxRate>>();

  async latest(currency: Currency): Promise<FxRate> {
    if (currency === 'KRW') return { currency, krwPerUnit: 1, source: 'KRW_PARITY' };
    // Keep the demo UI deterministic unless the server explicitly opts into a live feed.
    // This preserves the 1 JPY = 9.4 KRW prototype amounts shown in the product flow.
    if (process.env.FX_RATE_MODE !== 'LIVE')
      return { currency, krwPerUnit: DEMO_FX_RATES[currency], source: 'DEMO_FIXED' };
    const cached = this.cache.get(currency);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.rate };
    const inflight = this.pending.get(currency);
    if (inflight) return { ...await inflight };
    const request = this.load(currency);
    this.pending.set(currency, request);
    try { return { ...await request }; }
    finally { this.pending.delete(currency); }
  }

  private async load(currency: Currency): Promise<FxRate> {
    const key = process.env.CURRENCYAPI_KEY?.trim();
    let result: FxRate | null = null;
    if (key) result = await this.fromCurrencyApi(currency, key).catch(() => null);
    if (!result) result = await this.fromFrankfurter(currency).catch(() => null);
    if (!result) result = { currency, krwPerUnit: DEMO_FX_RATES[currency], source: 'DEMO_FIXED' };
    const ttl = result.source === 'PROVIDER_LATEST' ? 2 * 60_000 : result.source === 'DAILY_REFERENCE' ? 30 * 60_000 : 5 * 60_000;
    this.cache.set(currency, { rate: result, expiresAt: Date.now() + ttl });
    return result;
  }

  private async fromCurrencyApi(currency: Currency, key: string): Promise<FxRate> {
    const url = new URL('https://api.currencyapi.com/v3/latest');
    url.searchParams.set('base_currency', currency);
    url.searchParams.set('currencies', 'KRW');
    const response = await fetch(url, { headers: { apikey: key }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Exchange rate provider unavailable');
    const body = await response.json() as { meta?: { last_updated_at?: unknown }; data?: { KRW?: { value?: unknown } } };
    const value = body.data?.KRW?.value;
    const asOf = body.meta?.last_updated_at;
    if (!validRate(value) || typeof asOf !== 'string' || !recentRateDate(asOf))
      throw new Error('Invalid exchange rate response');
    return { currency, krwPerUnit: value, source: 'PROVIDER_LATEST', asOf };
  }

  private async fromFrankfurter(currency: Currency): Promise<FxRate> {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/${currency.toLowerCase()}/krw`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Reference rate provider unavailable');
    const body = await response.json() as { date?: unknown; base?: unknown; quote?: unknown; rate?: unknown };
    if (body.base !== currency || body.quote !== 'KRW' ||
        typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
        !recentRateDate(body.date) || !validRate(body.rate))
      throw new Error('Invalid reference rate response');
    return { currency, krwPerUnit: body.rate, source: 'DAILY_REFERENCE', asOf: body.date };
  }
}

@Controller('fx')
export class FxController {
  constructor(private readonly service: FxService) {}

  @Get(':currency') latest(@Param('currency') value: string) {
    const currency = value.toUpperCase();
    if (!CURRENCY_CODES.includes(currency as Currency)) throw new BadRequestException('지원하지 않는 통화예요.');
    return this.service.latest(currency as Currency);
  }
}
