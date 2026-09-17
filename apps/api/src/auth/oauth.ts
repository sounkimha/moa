import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Store } from '../infrastructure/store';
import { parse } from '../common/validation';
import { Sessions } from './auth';

const providers = ['GOOGLE', 'KAKAO', 'NAVER'] as const;
export type OAuthProvider = (typeof providers)[number];

type PendingState = {
  provider: OAuthProvider;
  returnUrl: string;
  callbackUrl: string;
  expires: number;
};

type ProviderProfile = { subject: string; nickname: string };

const providerSchema = z.enum(providers);
const startSchema = z.object({ returnUrl: z.string().min(1).max(500) }).strict();
const exchangeSchema = z.object({ code: z.string().min(20).max(300) }).strict();

const providerLabel: Record<OAuthProvider, string> = {
  GOOGLE: 'Google',
  KAKAO: '카카오',
  NAVER: '네이버',
};

@Injectable()
export class OAuthService {
  private readonly states = new Map<string, PendingState>();
  private readonly loginCodes = new Map<string, { userId: string; provider: OAuthProvider; expires: number }>();

  constructor(
    private readonly store: Store,
    private readonly sessions: Sessions,
  ) {}

  status() {
    return {
      GOOGLE: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      KAKAO: Boolean(process.env.KAKAO_LOGIN_REST_API_KEY),
      NAVER: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    };
  }

  start(providerInput: string, returnUrlInput: unknown, request: Request) {
    const provider = parse(providerSchema, providerInput.toUpperCase());
    const { returnUrl } = parse(startSchema, returnUrlInput);
    if (!this.status()[provider])
      throw new ServiceUnavailableException(`${providerLabel[provider]} 로그인을 사용하려면 서버 OAuth 키를 설정해주세요.`);
    const safeReturnUrl = this.validateReturnUrl(returnUrl);
    const callbackUrl = this.callbackUrl(request, provider);
    const state = randomBytes(32).toString('base64url');
    this.cleanup();
    this.states.set(state, { provider, returnUrl: safeReturnUrl, callbackUrl, expires: Date.now() + 10 * 60_000 });
    return { provider, authorizationUrl: this.authorizationUrl(provider, callbackUrl, state) };
  }

  async complete(providerInput: string, state: string, code?: string, providerError?: string) {
    const provider = parse(providerSchema, providerInput.toUpperCase());
    const pending = this.states.get(state);
    this.states.delete(state);
    if (!pending || pending.expires < Date.now() || pending.provider !== provider)
      throw new BadRequestException('로그인 요청이 만료되었어요. 앱에서 다시 시작해주세요.');
    if (providerError || !code)
      return { returnUrl: pending.returnUrl, error: '소셜 로그인이 취소되었어요.' };
    try {
      const accessToken = await this.exchangeProviderCode(provider, code, pending.callbackUrl, state);
      const profile = await this.loadProfile(provider, accessToken);
      const userId = await this.upsertUser(provider, profile);
      const loginCode = randomBytes(32).toString('base64url');
      this.loginCodes.set(loginCode, { userId, provider, expires: Date.now() + 5 * 60_000 });
      return { returnUrl: pending.returnUrl, loginCode, provider };
    } catch {
      return { returnUrl: pending.returnUrl, error: `${providerLabel[provider]} 계정 정보를 확인하지 못했어요. 다시 시도해주세요.` };
    }
  }

  exchange(input: unknown) {
    const { code } = parse(exchangeSchema, input);
    const pending = this.loginCodes.get(code);
    this.loginCodes.delete(code);
    if (!pending || pending.expires < Date.now())
      throw new BadRequestException('앱 로그인 코드가 만료되었어요. 소셜 로그인을 다시 시작해주세요.');
    return {
      ...this.sessions.create(pending.userId, 'oauth'),
      provider: pending.provider,
      notice: `${providerLabel[pending.provider]} 계정으로 로그인했어요.`,
    };
  }

  redirectUrl(result: { returnUrl: string; loginCode?: string; provider?: OAuthProvider; error?: string }) {
    const url = new URL(result.returnUrl);
    if (result.loginCode) url.searchParams.set('oauth_code', result.loginCode);
    if (result.provider) url.searchParams.set('oauth_provider', result.provider);
    if (result.error) url.searchParams.set('oauth_error', result.error);
    if (url.protocol === 'http:' || url.protocol === 'https:') url.hash = 'home';
    return url.toString();
  }

  private validateReturnUrl(value: string) {
    if (value === 'moa://oauth') return value;
    let url: URL;
    try { url = new URL(value); } catch { throw new BadRequestException('허용되지 않은 로그인 복귀 주소예요.'); }
    const allowed = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081')
      .split(',').map((item) => item.trim()).filter(Boolean);
    const codespaces = /^https:\/\/[a-z0-9-]+-8081\.app\.github\.dev$/i.test(url.origin);
    if (!allowed.includes(url.origin) && !codespaces)
      throw new BadRequestException('허용되지 않은 로그인 복귀 주소예요.');
    return url.origin;
  }

  private callbackUrl(request: Request, provider: OAuthProvider) {
    const configured = process.env.OAUTH_CALLBACK_BASE_URL?.replace(/\/$/, '');
    const forwardedHost = typeof request.headers['x-forwarded-host'] === 'string'
      ? request.headers['x-forwarded-host'] : '';
    const forwardedProto = request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';
    const allowedForwarded = forwardedOrigin && (() => {
      try { return this.validateReturnUrl(forwardedOrigin) === new URL(forwardedOrigin).origin; } catch { return false; }
    })();
    const base = configured || (allowedForwarded ? forwardedOrigin : `${request.protocol}://${request.get('host')}`);
    return `${base}/api/auth/oauth/${provider.toLowerCase()}/callback`;
  }

  private authorizationUrl(provider: OAuthProvider, callbackUrl: string, state: string) {
    const urls: Record<OAuthProvider, string> = {
      GOOGLE: 'https://accounts.google.com/o/oauth2/v2/auth',
      KAKAO: 'https://kauth.kakao.com/oauth/authorize',
      NAVER: 'https://nid.naver.com/oauth2.0/authorize',
    };
    const url = new URL(urls[provider]);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.credentials(provider).clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('state', state);
    if (provider === 'GOOGLE') url.searchParams.set('scope', 'openid email profile');
    return url.toString();
  }

  private credentials(provider: OAuthProvider) {
    if (provider === 'GOOGLE') return { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! };
    if (provider === 'KAKAO') return { clientId: process.env.KAKAO_LOGIN_REST_API_KEY!, clientSecret: process.env.KAKAO_LOGIN_CLIENT_SECRET || '' };
    return { clientId: process.env.NAVER_CLIENT_ID!, clientSecret: process.env.NAVER_CLIENT_SECRET! };
  }

  private async exchangeProviderCode(provider: OAuthProvider, code: string, redirectUri: string, state: string) {
    const endpoints: Record<OAuthProvider, string> = {
      GOOGLE: 'https://oauth2.googleapis.com/token',
      KAKAO: 'https://kauth.kakao.com/oauth/token',
      NAVER: 'https://nid.naver.com/oauth2.0/token',
    };
    const credentials = this.credentials(provider);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: credentials.clientId,
      code,
    });
    if (provider === 'NAVER') body.set('state', state);
    else body.set('redirect_uri', redirectUri);
    if (credentials.clientSecret) body.set('client_secret', credentials.clientSecret);
    const response = await fetch(endpoints[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json() as { access_token?: string };
    if (!response.ok || !data.access_token) throw new Error('OAuth token exchange failed');
    return data.access_token;
  }

  private async loadProfile(provider: OAuthProvider, accessToken: string): Promise<ProviderProfile> {
    const endpoints: Record<OAuthProvider, string> = {
      GOOGLE: 'https://openidconnect.googleapis.com/v1/userinfo',
      KAKAO: 'https://kapi.kakao.com/v2/user/me',
      NAVER: 'https://openapi.naver.com/v1/nid/me',
    };
    const response = await fetch(endpoints[provider], {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error('OAuth profile request failed');
    if (provider === 'GOOGLE')
      return { subject: String(data.sub || ''), nickname: String(data.name || data.email?.split('@')[0] || '') };
    if (provider === 'KAKAO')
      return { subject: String(data.id || ''), nickname: String(data.kakao_account?.profile?.nickname || data.properties?.nickname || '') };
    return { subject: String(data.response?.id || ''), nickname: String(data.response?.nickname || data.response?.name || '') };
  }

  private async upsertUser(provider: OAuthProvider, profile: ProviderProfile) {
    if (!profile.subject) throw new Error('OAuth subject is missing');
    const digest = createHash('sha256').update(`${provider}:${profile.subject}`).digest('hex').slice(0, 24);
    const userId = `oauth-${provider.toLowerCase()}-${digest}`;
    const label = `${providerLabel[provider]} 계정`;
    const nickname = profile.nickname.trim().slice(0, 24) || `${providerLabel[provider]} 사용자`;
    await this.store.transaction((db) => {
      const now = new Date().toISOString();
      const user = db.users.find((item) => item.id === userId);
      if (user) {
        // A returning provider must not replace the nickname the user chose in MOA.
        user.lastActive = now;
        if (!user.verificationLabels.includes(label)) user.verificationLabels.push(label);
      } else db.users.push({
        id: userId,
        createdAt: now,
        nickname,
        initials: nickname.slice(0, 1),
        avatarColor: '#EAF2FF',
        bio: '가는 길의 부탁을 모으고 있어요.',
        completed: 0,
        successRate: null,
        responseMinutes: 0,
        lastActive: now,
        verificationLabels: [label],
      });
    });
    return userId;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.states) if (value.expires < now) this.states.delete(key);
    for (const [key, value] of this.loginCodes) if (value.expires < now) this.loginCodes.delete(key);
  }
}

@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get('status') status() {
    return this.oauth.status();
  }

  @Get(':provider/start') start(
    @Param('provider') provider: string,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    return this.oauth.start(provider, query, request);
  }

  @Get(':provider/callback') async callback(
    @Param('provider') provider: string,
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.oauth.complete(provider, state, code, error);
    response.redirect(302, this.oauth.redirectUrl(result));
  }

  @Post('exchange') exchange(@Body() body: unknown) {
    return this.oauth.exchange(body);
  }
}
