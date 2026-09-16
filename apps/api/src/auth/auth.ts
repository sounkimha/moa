import {
  BadRequestException,
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
  create(userId: string) {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, { userId, expires: Date.now() + 24 * 3600000 });
    return { token, expiresIn: 86400, mode: 'demo' };
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
    if (reset) {
      if (process.env.DATABASE_URL)
        throw new BadRequestException('공유 데이터베이스에서는 체험 데이터를 초기화할 수 없어요.');
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
      notice: '실제 본인인증·소셜 로그인은 연결되지 않은 체험 계정이에요.',
    };
  }
  @UseGuards(AuthGuard) @Post('logout') logout(@Req() req: ActorRequest) {
    this.sessions.remove((req.headers.authorization || '').replace(/^Bearer /, ''));
    return { ok: true };
  }
}
