import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ActorRequest, AuthGuard } from '../auth/auth';
import { Store } from '../infrastructure/store';
import { base, check, get, once, parse } from '../common/validation';
@UseGuards(AuthGuard)
@Controller('rooms')
export class ChatController {
  constructor(private readonly store: Store) {}
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
