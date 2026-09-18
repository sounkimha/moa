import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { z, ZodType } from 'zod';
import { Database, Entity } from '@moa/domain';
export const base = (): Entity => ({ id: randomUUID(), createdAt: new Date().toISOString() });
export const today = () => new Date().toISOString().slice(0, 10);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD로 입력해주세요.')
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    '올바른 날짜를 입력해주세요.',
  );
export const amount = z.number().int().min(0).max(2_000_000);
export const localAmount = z.number().min(0).max(20_000_000).multipleOf(0.01);
export const transport = z.enum(['DOMESTIC_PARCEL', 'CONVENIENCE_PARCEL', 'MEETUP'], {
  errorMap: () => ({ message: '귀국 후 국내 택배, 편의점 택배 또는 직거래만 선택할 수 있어요.' }),
});
export const imageData = z
  .string()
  .max(2_800_000)
  .refine(
    (v) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
    '이미지 파일을 선택해주세요.',
  );
export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException({
      message: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n'),
      code: 'VALIDATION_ERROR',
    });
  return result.data;
}
export function get<T extends { id: string }>(rows: T[], id: string, label = '항목'): T {
  const found = rows.find((x) => x.id === id);
  if (!found) throw new NotFoundException(`${label}을 찾을 수 없어요.`);
  return found;
}
export function owner(actual: string, expected: string) {
  if (actual !== expected) throw new ForbiddenException('이 작업을 할 수 있는 사용자가 아니에요.');
}
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConflictException(message);
}
export function once<T>(
  db: Database,
  actorId: string,
  key: string | undefined,
  operation: string,
  input: unknown,
  fn: () => T,
): T {
  if (!key || key.length < 8 || key.length > 100)
    throw new BadRequestException('Idempotency-Key(8~100자)가 필요해요.');
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = db.commands.find(
    (c) => c.actorId === actorId && c.key === key && c.operation === operation,
  );
  if (previous) {
    check(previous.fingerprint === fingerprint, '같은 요청 키로 다른 내용을 보낼 수 없어요.');
    return previous.result as T;
  }
  const result = fn();
  db.commands.push({
    ...base(),
    actorId,
    key,
    operation,
    fingerprint,
    result: structuredClone(result),
  });
  return result;
}
