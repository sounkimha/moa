import { useCallback, useEffect, useRef, useState } from 'react';
import { Currency, FxRate } from '@moa/domain';
import { api } from './api';

export function useFxRate(currency: Currency) {
  const [rate, setRate] = useState<FxRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setFailed(false);
    try {
      const next = await api<FxRate>(`/fx/${currency}`);
      if (generation.current === current) setRate(next.currency === currency ? next : null);
    } catch {
      if (generation.current === current) { setRate(null); setFailed(true); }
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [currency]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  return { rate: rate?.currency === currency ? rate : null, loading, failed, refresh };
}
