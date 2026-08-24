# Глава 9. Доступность, тестирование и отладка

[← Глава 8](08-api-and-custom-hooks.md) · [Оглавление](README.md) · [Глава 10 →](10-final-react-lab.md)

## Semantic HTML сначала

- Настоящий `<button>`, не clickable `<div>`.
- `<label htmlFor>` связан с input.
- Heading levels идут логично.
- `<ul>/<li>` для списка, если это список.
- `alt` описывает смысл изображения; декоративное имеет пустой alt.
- Focus visible и keyboard navigation.

ARIA не исправляет неправильный native element лучше, чем semantic HTML.

## Async states

```tsx
function LoadingState() {
  return <p role="status" aria-live="polite">Загружаем матчи…</p>;
}

function ErrorState({ message, onRetry }: Props) {
  return (
    <section role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Повторить</button>
    </section>
  );
}
```

Не кодируйте winner только цветом; добавьте text/icon accessible label. Contrast проверяется для обеих тем.

## Testing Library смотрит глазами пользователя

Установка по текущей official Vite setup:

```powershell
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Предпочитайте queries:

```tsx
screen.getByRole('button', { name: 'Открыть матч' });
screen.getByLabelText('Patch');
screen.findByText('Team Spirit');
```

`getByTestId` — запасной вариант, когда semantic query невозможно.

## Component test

```tsx
it('сообщает выбранный match ID', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(<MatchCard match={fixtureMatch} onSelect={onSelect} />);
  await user.click(screen.getByRole('button', { name: /открыть/i }));

  expect(onSelect).toHaveBeenCalledWith(fixtureMatch.id);
});
```

Тест не проверяет внутреннее имя handler/state. Он проверяет поведение.

## Integration state tests

Для MatchesPage подмените API boundary/mock server:

- loading появляется;
- success показывает rows;
- empty имеет отдельный текст;
- error и retry;
- смена patch делает запрос с filter;
- старый response не перезаписывает новый.

Не mockайте `useState`/React internals.

## Отладка

Порядок:

1. Прочитать первую собственную строку stack.
2. Проверить Console/Network status/body.
3. Посмотреть props/state React DevTools.
4. Свести к маленькому component/fixture.
5. Добавить failing test.
6. Исправить root cause.

Не оставляйте console log с raw user/API data.

## Error boundary

Error boundary ловит render errors дочернего дерева и показывает fallback. Он не заменяет обработку network errors и не ловит автоматически все event/async exceptions. Подключите на page/root boundary, логируйте через observability без sensitive state.

## Практика

Пройдите интерфейс только keyboard. Увеличьте zoom до 200%. Добавьте tests для loading/error/empty/success и accessible names всех buttons/filters.

## Самопроверка

- [ ] Используются semantic elements и labels.
- [ ] Async changes сообщаются доступно.
- [ ] Tests ищут UI по role/name.
- [ ] Network и render errors разделены.
- [ ] Keyboard/zoom/contrast проверены вручную.
