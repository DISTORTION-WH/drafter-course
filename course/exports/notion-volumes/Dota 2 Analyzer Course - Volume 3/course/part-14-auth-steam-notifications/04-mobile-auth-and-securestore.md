# Глава 4. Авторизация в mobile и SecureStore

## 1. Что где хранить

```text
access token  -> только память процесса
refresh token -> Expo SecureStore
user profile  -> TanStack Query (/v1/me)
auth status   -> небольшой auth store/context
```

SecureStore использует защищённые механизмы платформы, но не превращает устройство в абсолютно доверенную среду. Root/jailbreak, backup-политики и физический доступ остаются рисками. Поэтому refresh token вращается и может быть отозван.

Установите модуль совместимой командой:

```bash
npx expo install expo-secure-store expo-web-browser expo-linking
```

Не фиксируйте случайную последнюю версию `npm install`, если Expo SDK ожидает совместимую.

## 2. Обёртка над SecureStore

```ts
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'auth.refresh-token.v1';

export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function writeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

Константа с версией ключа облегчает будущую миграцию. Не печатайте аргумент `token` даже в development log.

## 3. Bootstrap приложения

При запуске:

```text
1. auth state = bootstrapping
2. прочитать refresh token
3. если отсутствует -> guest
4. если есть -> вызвать refresh
5. успех -> записать новый refresh, access держать в памяти
6. invalid/revoked -> удалить local token, guest
7. временная network error -> recoverable-error, не уничтожать token сразу
```

Последний пункт важен. Недоступный Wi-Fi не означает, что сессия отозвана. Удаляйте refresh token при подтверждённой auth-ошибке, а не при любом `fetch failed`.

## 4. Хранилище access token

Минимальный класс:

```ts
class AccessTokenStore {
  private token: string | null = null;
  private expiresAtMs = 0;

  set(token: string, expiresAtIso: string): void {
    this.token = token;
    this.expiresAtMs = Date.parse(expiresAtIso);
  }

  get(): string | null {
    return this.token;
  }

  willExpireSoon(nowMs = Date.now()): boolean {
    return this.expiresAtMs - nowMs < 30_000;
  }

  clear(): void {
    this.token = null;
    this.expiresAtMs = 0;
  }
}
```

Буфер в 30 секунд компенсирует задержку сети и небольшое расхождение часов. Сервер всё равно является окончательным судьёй срока.

## 5. Один refresh одновременно

```ts
let refreshPromise: Promise<void> | null = null;

export function ensureFreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
```

Все запросы ждут один promise вместо отправки пяти refresh. После 401:

1. убедиться, что запрос был authenticated;
2. выполнить координированный refresh один раз;
3. повторить исходный безопасный запрос максимум один раз;
4. при повторном 401 завершить сессию;
5. не создавать бесконечный цикл middleware.

Для mutation повтор допустим только при доказанной идемпотентности. Лучше refresh до отправки, если access скоро истекает.

## 6. Exchange после browser redirect

Callback должен содержать только:

```text
code=<short-lived-one-time-code>
state=<anti-forgery-state>
```

Mobile:

- проверяет, что маршрут именно auth callback;
- сравнивает state с созданным локально;
- отправляет code/state через `POST /auth/exchange`;
- сначала надёжно записывает новый refresh token;
- затем устанавливает access token и authenticated state;
- очищает одноразовый state.

Если безопасная запись refresh token не удалась, не объявляйте вход полностью успешным: отзовите/завершите выданную сессию по возможности и покажите ошибку.

## 7. Query cache при смене пользователя

После входа:

- загрузите `/v1/me`;
- синхронизируйте watchlist;
- зарегистрируйте push только после разрешения;
- не очищайте публичный кэш матчей без причины.

После logout:

- отмените private queries;
- удалите private query data (`me`, watchlist, preferences);
- очистите access/refresh tokens;
- переключите auth state в guest;
- публичные матчи можно оставить.

Query keys приватных данных должны включать стабильную границу пользователя или полностью очищаться при смене identity, чтобы аккаунт B не увидел кэш аккаунта A.

## 8. Упражнение

Тестами смоделируйте:

1. первый запуск без token;
2. успешный bootstrap refresh;
3. refresh вернул revoked;
4. refresh получил network error;
5. пять запросов одновременно получили 401;
6. повторный 401 после refresh;
7. logout во время запроса `/me`;
8. вход другим пользователем на том же устройстве.

[Предыдущая глава](03-sessions-and-token-rotation.md) · [Оглавление](README.md) · [Следующая глава](05-steam-linking-and-privacy.md)

