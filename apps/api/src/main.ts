import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { json, Request, Response, NextFunction } from 'express';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';
const localOrigins = ['http://localhost:8081', 'http://127.0.0.1:8081'];
const allowedOrigins = (process.env.CORS_ORIGINS || localOrigins.join(',')).split(',');
const isCodespacesWebOrigin = (origin: string) =>
  /^https:\/\/[a-z0-9-]+-8081\.app\.github\.dev$/i.test(origin);
const permittedOrigin: CustomOrigin = (origin, callback) =>
  callback(null, !origin || allowedOrigins.includes(origin) || isCodespacesWebOrigin(origin));
export async function bootstrap() {
  const demoPreview = process.env.MOA_DEMO_PREVIEW === '1';
  if (process.env.NODE_ENV === 'production' && !demoPreview)
    throw new Error(
      'Production startup is disabled until payment, account lifecycle, provider secrets and policy gates are fully configured.',
    );
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: process.env.QUIET === '1' ? false : ['error', 'warn', 'log'],
  });
  // The web map lives in srcdoc iframes, which inherit this page's CSP.
  // Give each HTML response a fresh nonce so only our map bootstrap scripts run.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = randomBytes(16).toString('base64');
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", (_req, res) => `'nonce-${(res as Response).locals.cspNonce}'`, "'unsafe-eval'", 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://dapi.kakao.com', 'https://*.daumcdn.net'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'data:', 'blob:', 'https://*.googleapis.com', 'https://*.google.com', 'https://*.gstatic.com', 'https://dapi.kakao.com', 'https://*.daumcdn.net'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'https://*.google.com', 'https://map.kakao.com'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(json({ limit: '6mb' }));
  app.enableCors({
    origin: permittedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });
  const hits = new Map<string, { count: number; until: number }>();
  const authHits = new Map<string, { count: number; until: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Request-Id', randomUUID());
    res.setHeader('Cache-Control', 'no-store');
    const key = req.ip || 'local',
      now = Date.now();
    if (req.method === 'POST' && /^\/api\/auth\/(?:login|test|register)\/?$/.test(req.path)) {
      const attempt = authHits.get(key);
      if (!attempt || attempt.until <= now) authHits.set(key, { count: 1, until: now + 60000 });
      else if (++attempt.count > 30) {
        res.setHeader('Retry-After', Math.ceil((attempt.until - now) / 1000));
        res.status(429).json({ message: '로그인 시도가 많아요. 잠시 후 다시 시도해주세요.' });
        return;
      }
      if (authHits.size > 10000) for (const [id, value] of authHits) if (value.until <= now) authHits.delete(id);
    }
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
      capabilities: { metadata: true, recognizeSample: true, recognizeImage: Boolean(process.env.OPENAI_API_KEY),
        prepaidApplications: true, chatReplies: true, aiChatReplies: Boolean(process.env.OPENAI_API_KEY) },
  }));
  app.setGlobalPrefix('api');
  if (process.env.MOA_SERVE_WEB === '1') {
    const webDirectory = join(process.cwd(), 'apps', 'mobile', 'dist');
    const adminDirectory = join(process.cwd(), 'apps', 'admin', 'dist');
    const index = join(webDirectory, 'index.html');
    const adminIndex = join(adminDirectory, 'index.html');
    if (!existsSync(index)) throw new Error('Web preview build is missing. Run the mobile web export first.');
    if (!existsSync(adminIndex)) throw new Error('Admin web build is missing. Run the admin build first.');
    const server = app.getHttpAdapter().getInstance();
    const indexHtml = readFileSync(index, 'utf8');
    const adminIndexHtml = readFileSync(adminIndex, 'utf8');
    const serveIndex = (_req: Request, res: Response) => {
      const nonceMeta = `<meta name="moa-csp-nonce" content="${res.locals.cspNonce}">`;
      res.type('html').send(indexHtml.replace('</head>', `${nonceMeta}</head>`));
    };
    const serveAdminIndex = (_req: Request, res: Response) => {
      const nonceMeta = `<meta name="moa-csp-nonce" content="${res.locals.cspNonce}">`;
      res.type('html').send(adminIndexHtml.replace('</head>', `${nonceMeta}</head>`));
    };
    server.get('/index.html', serveIndex);
    server.use(express.static(webDirectory, { index: false, fallthrough: true }));
    server.get('/admin', serveAdminIndex);
    server.use('/admin', express.static(adminDirectory, { index: false, fallthrough: true }));
    server.get(/^\/admin(?:\/.*)?$/, serveAdminIndex);
    server.get(/^(?!\/api(?:\/|$)|\/health$).*/, serveIndex);
  }
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 4000), process.env.HOST || '0.0.0.0');
  return app;
}
if (require.main === module)
  bootstrap().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
