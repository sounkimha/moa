import { Platform } from 'react-native';
import { apiErrorMessage } from './api-errors';
function defaultApiUrl() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  if (Platform.OS !== 'web') return 'http://localhost:4000';
  // Web development is served through the same-origin proxy on 8081. Keeping
  // auth on that origin avoids stale API ports and supports OAuth callbacks.
  return window.location.origin;
}
const fallback =
  defaultApiUrl();
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
  if (token !== v) keys.clear();
  token = v;
}
const keys = new Map<string, string>();
function key() {
  return `moa-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const fingerprint = path + JSON.stringify(body);
  const id = keys.get(fingerprint) || key();
  if (body !== undefined) {
    if (keys.size >= 100 && !keys.has(fingerprint)) keys.delete(keys.keys().next().value!);
    keys.set(fingerprint, id);
  }
  const forget = () => { if (keys.get(fingerprint) === id) keys.delete(fingerprint); };
  const recognition = ['/metadata', '/recognize'].includes(path) || path.endsWith('/flight-proof');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), path.endsWith('/flight-proof') ? 55000 : path === '/recognize' ? 45000 : path === '/metadata' ? 35000 : 15000);
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
      if (response.status < 500) forget();
      if (response.status === 404 && ['/metadata', '/recognize'].includes(path))
        throw new ApiError('지금은 자동 인식을 이용할 수 없어요. 잠시 후 다시 시도하거나 직접 입력해주세요.', 404);
      throw new ApiError(
        apiErrorMessage(data?.message, response.status),
        response.status,
      );
    }
    if (data === null || (path === '/snapshot' && (!data.me?.id ||
      !['users', 'places', 'requests', 'trips', 'transactions', 'notifications', 'offers', 'addresses'].every((field) => Array.isArray(data[field])))) ||
      (['/metadata', '/recognize'].includes(path) &&
      (typeof data.status !== 'string' || typeof data.notice !== 'string')))
      throw new ApiError('서버 응답을 읽지 못했어요. 잠시 후 다시 시도해주세요.', 502);
    forget();
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controller.signal.aborted)
      throw new ApiError(recognition
        ? '분석 응답이 늦어지고 있어요. 사진이나 링크를 확인한 뒤 다시 시도해주세요.'
        : '서버 응답이 늦어지고 있어요. 거래 상태를 새로고침해 확인한 뒤 다시 시도해주세요.', 408);
    throw new ApiError('연결이 잠시 끊겼어요. 인터넷 연결을 확인하고 다시 시도해주세요.', 0);
  } finally {
    clearTimeout(timer);
  }
}
