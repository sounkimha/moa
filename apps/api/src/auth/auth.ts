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
import { parse, get } from '../common/validation';
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
    await this.store.read((db) => get(db.users, userId));
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
}
