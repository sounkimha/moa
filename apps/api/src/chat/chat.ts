import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ActorRequest, AuthGuard } from '../auth/auth';
import { Store } from '../infrastructure/store';
import { base, check, get, once, parse } from '../common/validation';
import { aiReplies, basicResult, replyContext } from './replies';
@UseGuards(AuthGuard)
@Controller('rooms')
export class ChatController {
  constructor(private readonly store: Store) {}
  private readonly recentAI = new Map<string, number>();
  @Get(':id/replies') async replies(@Req() r: ActorRequest, @Param('id') id: string) {
    return basicResult(await this.store.read((db) => replyContext(db, r.actorId, id)));
  }
  @Post(':id/replies') async generate(@Req() r: ActorRequest, @Param('id') id: string, @Body() body: unknown) {
    parse(z.object({ useAI: z.literal(true) }).strict(), body);
    const context = await this.store.read((db) => replyContext(db, r.actorId, id));
    const now = Date.now();
    for (const [actor, time] of this.recentAI) if (now - time > 60000) this.recentAI.delete(actor);
    if (now - (this.recentAI.get(r.actorId) || 0) < 12000)
      return basicResult(context, '잠시 후 다시 추천받을 수 있어요. 지금은 기본 추천을 보여드려요.');
    this.recentAI.set(r.actorId, now);
    return aiReplies(context);
  }
  @Post(':id/messages') send(
    @Req() r: ActorRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    const data = parse(z.object({ text: z.string().trim().min(1).max(1000) }).strict(), body);
    return this.store.transaction((db) =>
      once(db, r.actorId, key, `message:${id}`, data, () => {
        const room = get(db.rooms, id, '대화방');
        check(
          room.buyerId === r.actorId || room.travelerId === r.actorId,
          '거래 참여자만 대화할 수 있어요.',
        );
        const message = {
          ...base(),
          roomId: id,
          senderId: r.actorId,
          text: data.text,
          system: false,
        };
        db.messages.push(message);
        return message;
      }),
    );
  }
}
