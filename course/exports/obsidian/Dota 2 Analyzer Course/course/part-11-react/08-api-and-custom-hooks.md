# Глава 8. Загрузка API и custom hooks

[← Глава 7](07-effects-and-cleanup.md) · [Оглавление](README.md) · [Глава 9 →](09-accessibility-and-testing.md)

## API client вне component

```ts
export type ListMatchesResponse = {
  items: readonly MatchSummary[];
  page: { nextCursor: string | null; hasMore: boolean; limit: number };
  meta: { generatedAt: string };
};

export async function fetchMatches(
  apiBaseUrl: URL,
  patch: string,
  signal: AbortSignal,
): Promise<ListMatchesResponse> {
  const url = new URL('/v1/matches', apiBaseUrl);
  if (patch !== 'all') url.searchParams.set('patch', patch);

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal,
  });

  const body: unknown = await response.json();
  if (!response.ok) throw parseApiError(response.status, body);
  return parseListMatchesResponse(body);
}
```

Response снова `unknown`: собственный backend тоже может иметь incompatible deploy/proxy error. В production лучше generated OpenAPI client + runtime validation policy; базовый parser остаётся полезен.

## Custom hook

```tsx
type MatchesLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'success'; response: ListMatchesResponse };

export function useMatches(patch: string): MatchesLoadState {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<MatchesLoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    void fetchMatches(apiBaseUrl, patch, controller.signal)
      .then((response) => setState({ status: 'success', response }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setState({
          status: 'error',
          message: toPublicMessage(error),
          retry: () => setRequestVersion((value) => value + 1),
        });
      });

    return () => controller.abort();
  }, [patch, requestVersion]);

  return state;
}
```

Это учебная реализация. Есть тонкость: callback `retry` создаётся в catch и обновляет version. Более чисто hook может всегда возвращать отдельную stable retry function; сделайте refactor самостоятельно.

## Hook — переиспользование логики, не UI

Custom hook начинается с `use`, вызывает hooks только top-level и возвращает данные/actions. Он не разделяет state между component instances автоматически: каждый вызов имеет своё состояние.

## Отображение union

```tsx
const matchesState = useMatches(patch);

if (matchesState.status === 'loading') return <LoadingState />;
if (matchesState.status === 'error') {
  return <ErrorState message={matchesState.message} onRetry={matchesState.retry} />;
}
if (matchesState.response.items.length === 0) return <EmptyState />;
return <MatchList matches={matchesState.response.items} />;
```

TypeScript narrowing знает поля конкретной ветки.

## Почему позже TanStack Query

Manual hook ещё не решает хорошо:

- shared cache/dedup;
- stale time;
- background refetch;
- pagination;
- reconnect/app focus;
- retry policy;
- persistence.

В части 12 эти задачи получит TanStack Query. Сначала вы увидели, какую проблему он решает.

## CORS и адрес

Browser web-lab требует, чтобы backend разрешал его origin. Mobile позже использует другой network environment. Нельзя обходить CORS отключением browser security; настройте backend allowlist для development.

## Практика

Реализуйте parser fixture tests: valid response, error envelope, missing items, ID number вместо string, invalid timestamp, extra unknown field по выбранной policy.

## Самопроверка

- [ ] Component не строит URL/parse JSON.
- [ ] API response входит как `unknown`.
- [ ] Custom hook изолирует state/effect logic.
- [ ] Request отменяется при смене filter/unmount.
- [ ] Я понимаю ограничения manual server-state hook.
