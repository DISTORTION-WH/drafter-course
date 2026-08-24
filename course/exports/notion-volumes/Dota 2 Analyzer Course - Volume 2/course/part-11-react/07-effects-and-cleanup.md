# Глава 7. `useEffect`, внешние системы и cleanup

[← Глава 6](06-forms-and-state-design.md) · [Оглавление](README.md) · [Глава 8 →](08-api-and-custom-hooks.md)

## Effect нужен не для любого вычисления

Effect синхронизирует React с внешней системой: сеть, timer, subscription, DOM API. Filtering props/state выполняется прямо во время render.

Плохо:

```tsx
useEffect(() => {
  setVisibleMatches(filterMatches(matches, patch));
}, [matches, patch]);
```

Хорошо:

```tsx
const visibleMatches = filterMatches(matches, patch);
```

Первый вариант делает лишний render и создаёт вторую копию derived data.

## Lifecycle Effect

```tsx
useEffect(() => {
  const timerId = window.setInterval(() => {
    console.log('tick');
  }, 30_000);

  return () => window.clearInterval(timerId);
}, []);
```

Callback запускается после commit. Cleanup запускается перед повторной синхронизацией и unmount. Пустой dependency array означает, что Effect не зависит от reactive values, а не «запустить магически один раз»; StrictMode development может проверить setup/cleanup повтором.

## Dependencies

```tsx
useEffect(() => {
  document.title = `Patch: ${patch}`;
}, [patch]);
```

Все reactive values, прочитанные Effect, должны быть dependencies. Не отключайте lint rule, чтобы «остановить цикл». Исправьте structure.

## Abort fetch

```tsx
useEffect(() => {
  const controller = new AbortController();

  void loadMatches({ patch, signal: controller.signal })
    .then(setMatches)
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setError(toPublicMessage(error));
    });

  return () => controller.abort();
}, [patch]);
```

При смене patch старый request отменяется. Но manual fetching быстро требует cache/dedup/retry; в mobile подключим TanStack Query.

## Race condition

Без abort медленный старый response может перезаписать быстрый новый. Если API не поддерживает cancellation, cleanup ставит `ignore=true` и handler проверяет flag.

## Event или Effect

- Пользователь нажал «скачать» → event handler.
- Component видим и должен подписаться → Effect.
- Отправить analytics о показе → Effect с idempotency в development.
- Пересчитать label → render, не Effect.

## `useRef`

Ref хранит значение между renders без запуска render:

```tsx
const inputRef = useRef<HTMLInputElement | null>(null);
function focusSearch() { inputRef.current?.focus(); }
```

Ref подходит DOM handle/timer ID, но не отображаемому state.

## Практика

Добавьте document title, keyboard focus button и timer freshness. У каждого Effect должен быть ответ: какую внешнюю систему синхронизирует и как cleanup отменяет работу.

## Самопроверка

- [ ] Derived data не находится в Effect.
- [ ] Dependencies полны.
- [ ] Subscription/timer/fetch имеют cleanup.
- [ ] StrictMode повтор не ломает итог.
- [ ] Event и Effect различаются по причине запуска.
