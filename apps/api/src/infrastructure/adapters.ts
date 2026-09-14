import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export interface PaymentGateway {
  hold(transactionId: string, amount: number): { providerRef: string };
  refund(providerRef: string): void;
}
export class MockPaymentGateway implements PaymentGateway {
  hold(transactionId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid payment amount');
    return { providerRef: `mock-hold-${transactionId}` };
  }
  refund(_providerRef: string) {
    /* No funds leave this process. */
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
