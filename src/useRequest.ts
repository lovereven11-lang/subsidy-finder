import { useEffect, useState } from "react";

interface RequestState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// key가 바뀔 때마다 load를 다시 부른다. key가 null이면 요청하지 않는다.
// 이전 요청의 응답이 늦게 도착해도 덮어쓰지 않도록 key로 결과를 구분한다.
export function useRequest<T>(key: string | null, load: () => Promise<T>): RequestState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const requestKey = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ key: requestKey, data, error: null }),
      (e: unknown) =>
        !cancelled && setResult({ key: requestKey, data: null, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      cancelled = true;
    };
    // load는 key로 대표되므로 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current = result && result.key === requestKey ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: requestKey !== null && current === null,
    retry: () => setAttempt((n) => n + 1),
  };
}
