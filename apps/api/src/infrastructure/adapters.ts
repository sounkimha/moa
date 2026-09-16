import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export interface PaymentProvider {
  hold(transactionId: string, amount: number, method: 'CARD' | 'EASY_PAY' | 'WALLET'): { providerRef: string };
  refund(providerRef: string): void;
}
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  hold(transactionId: string, amount: number, method: 'CARD' | 'EASY_PAY' | 'WALLET') {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid payment amount');
    return { providerRef: `mock-${method.toLowerCase()}-hold-${transactionId}` };
  }
  refund(_providerRef: string) {
    /* No funds leave this process. */
  }
}
export interface PayoutProvider {
  request(userId: string, amount: number): { providerRef: string; status: 'MOCK_COMPLETED' };
}
@Injectable()
export class MockPayoutProvider implements PayoutProvider {
  request(userId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid payout amount');
    return { providerRef: `mock-payout-${userId}-${randomUUID()}`, status: 'MOCK_COMPLETED' as const };
  }
}
export interface IdentityProvider {
  verify(userId: string, method: 'PASS' | 'SMS'): { providerRef: string; status: 'DEMO_VERIFIED' };
}
@Injectable()
export class MockIdentityProvider implements IdentityProvider {
  verify(userId: string, method: 'PASS' | 'SMS') {
    return { providerRef: `mock-${method.toLowerCase()}-${userId}`, status: 'DEMO_VERIFIED' as const };
  }
}
@Injectable()
export class CatalogCache {
  private redis?: Redis;
  private memory = new Map<string, { value: unknown; expiry: number }>();
  constructor() {
    if (process.env.REDIS_URL)
      this.redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    this.redis?.on('error', () => undefined);
  }
  async get<T>(key: string): Promise<T | undefined> {
    if (this.redis) {
      try {
        const v = await this.redis.get(key);
        return v ? JSON.parse(v) : undefined;
      } catch {
        return undefined;
      }
    }
    const v = this.memory.get(key);
    return v && v.expiry > Date.now() ? (v.value as T) : undefined;
  }
  async set(key: string, value: unknown) {
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', 60);
      } catch {
        /* cache is non-authoritative */
      }
    } else this.memory.set(key, { value, expiry: Date.now() + 60000 });
  }
  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
/** Adapter boundary for production image storage. Currently the mobile prototype
 * stores downscaled data URLs through authenticated commands for zero-key startup.
 * This presigner deliberately remains internal until upload ownership/scan gates exist. */
export class S3Storage {
  private client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-2' });
  async createUpload(userId: string, contentType: 'image/jpeg' | 'image/png') {
    const key = `private/${userId}/${randomUUID()}`;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
      { expiresIn: 120 },
    );
    return { key, url };
  }
}
