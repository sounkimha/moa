import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Request } from 'express';
import { z } from 'zod';
import { base, parse, get } from '../common/validation';
import { Store } from '../infrastructure/store';
export interface ActorRequest extends Request {
  actorId: string;
}
@Injectable()
export class Sessions {
  private sessions = new Map<string, { userId: string; expires: number }>();
  create(userId: string, mode: 'demo' | 'oauth' = 'demo') {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, { userId, expires: Date.now() + 24 * 3600000 });
    return { token, expiresIn: 86400, mode };
  }
  resolve(token: string) {
    const s = this.sessions.get(token);
    if (!s || s.expires < Date.now()) {
      this.sessions.delete(token);
      throw new UnauthorizedException('체험 세션이 끝났어요. 다시 시작해주세요.');
    }
    return s.userId;
  }
  remove(token: string) {
    this.sessions.delete(token);
  }
  clear() {
    this.sessions.clear();
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: Sessions) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    req.actorId = this.sessions.resolve((req.headers.authorization || '').replace(/^Bearer /, ''));
    return true;
  }
}
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: Sessions,
    private readonly store: Store,
  ) {}
  @Post('demo') async demo(@Body() body: unknown) {
    const { userId, provider, reset } = parse(
      z
        .object({
          userId: z.enum(['u-me', 'u-min', 'u-haru', 'u-joon', 'u-sora']).default('u-me'),
          provider: z.enum(['DEMO', 'PHONE', 'APPLE', 'GOOGLE', 'KAKAO', 'NAVER']).default('DEMO'),
          reset: z.boolean().default(false),
        })
        .strict(),
      body,
    );
    const oauthConfigured = Boolean(
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      process.env.KAKAO_LOGIN_REST_API_KEY ||
      (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    );
    const resetApplied = reset && !process.env.DATABASE_URL && !oauthConfigured;
    if (resetApplied) {
      await this.store.resetDemo();
      this.sessions.clear();
    }
    await this.store.transaction((db) => {
      get(db.users, userId);
      const providerUserId = `demo:${provider}:${userId}`;
      if (!db.authIdentities.some((identity) => identity.provider === provider && identity.providerUserId === providerUserId))
        db.authIdentities.push({
          ...base(), userId, provider, providerUserId, status: 'DEMO_LINKED',
        });
    });
    return {
      ...this.sessions.create(userId),
      provider,
      resetApplied,
      notice: reset && !resetApplied
        ? '공유 또는 소셜 로그인 환경이라 기존 데이터를 유지하고 체험 계정으로 로그인했어요.'
        : '개인정보 없이 사용하는 체험 계정이에요.',
    };
  }
  @UseGuards(AuthGuard) @Post('logout') logout(@Req() req: ActorRequest) {
    this.sessions.remove((req.headers.authorization || '').replace(/^Bearer /, ''));
    return { ok: true };
  }
  @UseGuards(AuthGuard) @Post('identity/verify') async verifyIdentity(
    @Req() req: ActorRequest,
    @Body() body: unknown,
  ) {
    const data = parse(
      z.object({
        name: z.string().trim().min(2).max(30),
        phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '휴대폰 번호를 확인해주세요.'),
        birthDate: z.string().regex(/^\d{6}$/, '생년월일 6자리를 입력해주세요.'),
        consent: z.literal(true, { errorMap: () => ({ message: '본인인증 안내에 동의해주세요.' }) }),
      }).strict(),
      body,
    );
    await this.store.transaction((db) => {
      const user = get(db.users, req.actorId, '사용자');
      if (!user.verificationLabels.includes('본인 인증')) user.verificationLabels.push('본인 인증');
      const current = db.verifications.find((item) => item.userId === req.actorId && item.kind === 'IDENTITY');
      if (current) current.status = 'DEMO_VERIFIED';
      else db.verifications.push({
        ...base(),
        userId: req.actorId,
        kind: 'IDENTITY',
        status: 'DEMO_VERIFIED',
        providerRef: `demo-identity-${randomBytes(6).toString('hex')}`,
      });
      db.events.push({ ...base(), actorId: req.actorId, type: 'identity_verified', note: 'demo-provider' });
    });
    return {
      verified: true,
      maskedPhone: data.phone.replace(/(\d{3})-?\d{3,4}-?(\d{4})/, '$1-****-$2'),
      notice: '체험용 본인인증을 완료했어요. 입력한 이름·생년월일·휴대폰 번호는 저장하지 않았어요.',
    };
  }
}
