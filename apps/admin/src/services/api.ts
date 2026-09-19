import type { AdminIdentity, ConversationDetail, ConversationList, DashboardData, TransactionDetail, TransactionList } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin${path}`, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body = await response.json().catch(() => null);
  if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('moa-admin-auth-expired'));
  if (!response.ok) throw new ApiError(typeof body?.message === 'string' ? body.message : '요청을 처리하지 못했습니다.', response.status);
  return body as T;
}

export const adminApi = {
  me: () => request<{ admin: AdminIdentity; mode: string }>('/me'),
  login: (email: string, password: string, code: string) => request<{ admin: AdminIdentity; mode: string }>('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, code }) }),
  logout: () => request<{ ok: boolean }>('/logout', { method: 'POST' }),
  dashboard: () => request<DashboardData>('/dashboard'),
  transactions: (params: URLSearchParams) => request<TransactionList>(`/transactions?${params.toString()}`),
  transaction: (id: string) => request<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`),
  conversations: (params: URLSearchParams) => request<ConversationList>(`/conversations?${params.toString()}`),
  conversation: (id: string) => request<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`),
};
