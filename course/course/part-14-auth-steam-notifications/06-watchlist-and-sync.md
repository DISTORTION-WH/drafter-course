# Глава 6. Watchlist и синхронизация

## 1. Что такое watchlist

Watchlist — приватный список сущностей, за которыми пользователь хочет следить:

```text
team
player
tournament
```

Не называйте таблицу `favorites` только потому, что кнопка выглядит как сердечко: продуктовая семантика может включать подписку на события, а не эмоциональное «любимое».

## 2. Схема данных

```sql
CREATE TABLE watchlist_entries (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN ('team', 'player', 'tournament')),
  entity_id text NOT NULL,
  notifications_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX watchlist_entries_user_created_idx
  ON watchlist_entries(user_id, created_at DESC, id DESC);
```

`entity_id` — строка. Backend дополнительно проверяет существование и допустимый тип сущности. Unique constraint делает повторное добавление безопасным.

Полиморфная ссылка не может иметь обычный foreign key одновременно на три таблицы. Альтернативы:

- три отдельные watchlist-таблицы;
- единый каталог entity;
- service validation плюс периодическая проверка целостности.

Для MVP допустим последний вариант, если soft-deleted entity остаётся корректно отображаемой.

## 3. API

```text
GET /v1/me/watchlist?limit=50&cursor=...
POST /v1/me/watchlist
DELETE /v1/me/watchlist/{entryId}
PATCH /v1/me/watchlist/{entryId}
```

Тело добавления:

```json
{
  "entityType": "team",
  "entityId": "2163",
  "notificationsEnabled": true
}
```

Ответ — канонический entry с `id`, нормализованными полями и кратким snapshot сущности для карточки. Никогда не принимайте `userId` из body.

Семантика повторного POST должна быть документирована. Удобный вариант: idempotent upsert возвращает существующий/обновлённый entry. Другой вариант — 409. Для mobile первый проще, но нельзя неожиданно сбрасывать настройки.

## 4. Query и mutation

Ключи:

```ts
export const watchlistKeys = {
  all: ['me', 'watchlist'] as const,
  list: () => [...watchlistKeys.all, 'list'] as const,
};
```

После добавления:

```ts
onSuccess: () => {
  void queryClient.invalidateQueries({
    queryKey: watchlistKeys.all,
  });
}
```

Также инвалидируйте detail/card query только если она хранит вычисляемое `isWatched`. Более чистый вариант — вычислять `isWatched` из watchlist query, не встраивая user-specific поле в публичный match/team DTO.

## 5. Гостевой watchlist

Есть три продуктовых варианта:

1. Гостю недоступна кнопка — после нажатия предлагается вход.
2. Гость хранит список только локально и осознанно переносит после входа.
3. Гость получает анонимный серверный профиль.

Для MVP выбираем вариант 2: полезно без регистрации и не создаёт скрытую серверную identity.

Локальная форма:

```ts
type GuestWatchItem = {
  entityType: 'team' | 'player' | 'tournament';
  entityId: string;
  addedAt: string;
};
```

Не храните весь DTO команды: он устаревает. Храните ключ, а отображаемые данные берите из публичного API/cache.

## 6. Merge после входа

После первого входа покажите выбор: «Добавить локальные подписки в аккаунт». Не удаляйте local список до успешного завершения.

Алгоритм:

```text
1. загрузить server watchlist
2. построить множество (entityType, entityId)
3. отправить отсутствующие local entries idempotent batch/по одному
4. обработать invalid/deleted entities отдельно
5. перечитать server watchlist
6. только после подтверждения очистить migrated local entries
```

Если сеть пропала на шаге 3, повтор безопасен благодаря unique constraint/upsert. Не включайте push автоматически для импортированных items без явного согласия.

## 7. Гонки нескольких устройств

Device A удалил команду, device B в старом UI снова включил уведомления. Backend использует `updated_at` или явную версию, если нужен conflict detection. Для простой toggle-операции last-write-wins может быть приемлем, но это должно быть продуктовое решение.

TanStack Query обновляет watchlist:

- после mutation;
- при возвращении в приложение, если stale;
- после login/logout;
- после открытия notification settings.

## 8. Privacy и лимиты

Добавьте разумный лимит entries на пользователя и rate limit mutation. Watchlist приватен и не входит в публичный team endpoint. Worker уведомлений получает только необходимые внутренние ID.

## 9. Упражнение

Реализуйте team watchlist и проверьте:

- два одинаковых POST не создают дубль;
- user A не удаляет entry user B по угаданному UUID;
- guest merge можно безопасно повторить;
- invalid entity не очищает остальные items;
- logout убирает private cache, но сохраняет согласованный guest state;
- импорт не включает push без разрешения.

[Предыдущая глава](05-steam-linking-and-privacy.md) · [Оглавление](README.md) · [Следующая глава](07-push-device-registration.md)

