import { Platform } from 'react-native';
const fallback =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'
    : Platform.OS === 'web'
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : 'http://localhost:4000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fallback).replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let token = '';
export function setToken(v: string) {
  token = v;
}
const keys = new Map<string, string>();
function key() {
  return `moa-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const fingerprint = path + JSON.stringify(body);
  const id = keys.get(fingerprint) || key();
  if (body !== undefined) keys.set(fingerprint, id);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), path === '/recognize' ? 45000 : path === '/metadata' ? 20000 : 15000);
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Idempotency-Key': id,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status < 500) keys.delete(fingerprint);
      if (response.status === 404 && ['/metadata', '/recognize'].includes(path))
        throw new ApiError('연결된 서버에 인식 기능이 반영되지 않았어요. 개발 서버를 다시 실행한 뒤 새로고침해주세요.', 404);
      throw new ApiError(
        Array.isArray(data?.message)
          ? data.message.join('\n')
          : data?.message || '요청을 처리하지 못했어요.',
        response.status,
      );
    }
    if (data === null || (['/metadata', '/recognize'].includes(path) &&
      (typeof data.status !== 'string' || typeof data.notice !== 'string')))
      throw new ApiError('인식 서버 응답을 읽지 못했어요. 서버 연결 주소를 확인하고 다시 시도해주세요.', 502);
    keys.delete(fingerprint);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controller.signal.aborted)
      throw new ApiError('분석 응답이 늦어지고 있어요. 사진이나 링크를 확인한 뒤 다시 시도해주세요.', 408);
    throw new ApiError('연결이 잠시 끊겼어요. 서버 실행 상태를 확인하고 다시 시도해주세요.', 0);
  } finally {
    clearTimeout(timer);
  }
}
