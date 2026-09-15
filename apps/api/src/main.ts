import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json, Request, Response, NextFunction } from 'express';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import { AppModule } from './app.module';
const localOrigins = ['http://localhost:8081', 'http://127.0.0.1:8081'];
const allowedOrigins = (process.env.CORS_ORIGINS || localOrigins.join(',')).split(',');
const isCodespacesWebOrigin = (origin: string) =>
  /^https:\/\/[a-z0-9-]+-8081\.app\.github\.dev$/i.test(origin);
const permittedOrigin: CustomOrigin = (origin, callback) =>
  callback(null, !origin || allowedOrigins.includes(origin) || isCodespacesWebOrigin(origin));
export async function bootstrap() {
  if (process.env.NODE_ENV === 'production')
    throw new Error(
      'Production startup is disabled until payment, account lifecycle, provider secrets and policy gates are fully configured.',
    );
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: process.env.QUIET === '1' ? false : ['error', 'warn', 'log'],
  });
  app.use(helmet());
  app.use(json({ limit: '6mb' }));
  app.enableCors({
    origin: permittedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });
  const hits = new Map<string, { count: number; until: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Request-Id', randomUUID());
    res.setHeader('Cache-Control', 'no-store');
    const key = req.ip || 'local',
      now = Date.now();
    const h = hits.get(key);
    if (!h || h.until < now) hits.set(key, { count: 1, until: now + 60000 });
    else if (++h.count > 300) {
      res.status(429).json({ message: '잠시 후 다시 시도해주세요.' });
      return;
    }
    if (hits.size > 10000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
    next();
  });
  app
    .getHttpAdapter()
    .get('/health', (_req: Request, res: Response) => res.json({
      status: 'ok', mode: 'demo', apiVersion: 'recognition-v2',
      capabilities: { metadata: true, recognizeSample: true, recognizeImage: Boolean(process.env.OPENAI_API_KEY) },
    }));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 4000), process.env.HOST || '0.0.0.0');
  return app;
}
if (require.main === module)
  bootstrap().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
