# Модуль 13. Steam login и безопасные сессии

## Результат

Пользователь войдёт через официальный Steam OpenID flow в системном браузере. API свяжет SteamID с внутренним user, выдаст короткий access token и вращаемый refresh token. Mobile сохранит секреты в SecureStore, а не AsyncStorage.

## Сначала понять поток

```text
mobile -> API /auth/steam/start
API -> Steam OpenID page
Steam -> API /auth/steam/callback
API проверяет ответ у Steam
API -> mobile deep link с одноразовым code
mobile -> API /auth/exchange
API -> access token + refresh token
```

Password Steam никогда не проходит через наше приложение. Callback принимает только одноразовый OpenID result. В mobile deep link не кладутся постоянные tokens.

## 1. Таблицы авторизации

Добавьте в Prisma schema:

```prisma
model User {
  id           String           @id @default(cuid())
  steamId      String           @unique
  displayName  String?
  avatarUrl    String?
  sessions     RefreshSession[]
  loginTickets LoginTicket[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}

model AuthAttempt {
  id             String    @id @default(cuid())
  stateHash      String    @unique
  mobileRedirect String
  expiresAt      DateTime
  consumedAt     DateTime?
  createdAt      DateTime  @default(now())
}

model LoginTicket {
  id         String    @id @default(cuid())
  codeHash   String    @unique
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime  @default(now())
}

model RefreshSession {
  id               String    @id @default(cuid())
  refreshTokenHash String    @unique
  userId           String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime  @default(now())
}
```

Создайте migration `add_auth`.

- В БД хранятся hashes, не bearer secrets.
- `state` связывает начало и callback и защищает login CSRF.
- `LoginTicket` живёт несколько минут и используется один раз.
- `RefreshSession` можно отозвать отдельно для одного устройства.

## 2. Генерация и hashing случайных секретов

Создайте `apps/api/src/auth/token-secrets.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
```

- `randomBytes(32)` создаёт 256 бит криптографической случайности.
- `base64url` безопасен в URL и JSON.
- `secret` — значение, которое знает клиент; hash — то, что хранит сервер.
- SHA-256 здесь применён к уже случайному длинному token. Для человеческих passwords нужен медленный Argon2/bcrypt, но passwords мы вообще не принимаем.

## 3. Начало OpenID flow

Добавьте env:

```dotenv
PUBLIC_API_URL=https://api.example.com/v1
MOBILE_REDIRECT_URI=dotaanalyzer://auth/callback
JWT_SECRET=<не менее 32 случайных байт>
```

Разрешайте redirect только из server-side allowlist, не доверяйте произвольному URL query.

В `AuthService.startSteamLogin`:

```ts
async startSteamLogin(): Promise<string> {
  const state = createOpaqueSecret();
  await this.prisma.authAttempt.create({
    data: {
      stateHash: hashOpaqueSecret(state),
      mobileRedirect: env.MOBILE_REDIRECT_URI,
      expiresAt: new Date(Date.now() + 10 * 60 * 1_000),
    },
  });

  const returnTo = new URL('/v1/auth/steam/callback', env.PUBLIC_API_URL);
  returnTo.searchParams.set('state', state);

  const steamUrl = new URL('https://steamcommunity.com/openid/login');
  steamUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  steamUrl.searchParams.set('openid.mode', 'checkid_setup');
  steamUrl.searchParams.set(
    'openid.claimed_id',
    'http://specs.openid.net/auth/2.0/identifier_select',
  );
  steamUrl.searchParams.set(
    'openid.identity',
    'http://specs.openid.net/auth/2.0/identifier_select',
  );
  steamUrl.searchParams.set('openid.return_to', returnTo.toString());
  steamUrl.searchParams.set('openid.realm', new URL(env.PUBLIC_API_URL).origin);
  return steamUrl.toString();
}
```

Controller отвечает HTTP redirect на возвращённый URL. `state` хранится только в браузере, `stateHash` — в БД. 10 минут — срок на вход, не срок пользовательской сессии.

## 4. Проверка callback у Steam

Нельзя считать callback подлинным только потому, что в URL написан SteamID. Отправьте OpenID fields обратно Steam с mode `check_authentication`:

```ts
async function verifySteamAssertion(rawQuery: Record<string, string>): Promise<string> {
  const verification = new URLSearchParams(rawQuery);
  verification.set('openid.mode', 'check_authentication');

  const response = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: verification,
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();
  if (!response.ok || !body.includes('is_valid:true')) {
    throw new UnauthorizedException('Invalid Steam assertion');
  }

  const claimedId = rawQuery['openid.claimed_id'] ?? '';
  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) throw new UnauthorizedException('Invalid Steam identity');
  return match[1];
}
```

- `verification` — копия подписанных OpenID fields.
- `body` — текст проверки Steam.
- `claimedId` — identity URL, не готовый SteamID.
- RegExp разрешает только официальный host, точный path и цифры.
- `match[1]` — первая capture group: SteamID64.

Callback service затем:

1. Ищет `AuthAttempt` по `hashOpaqueSecret(state)`.
2. Проверяет `consumedAt === null` и `expiresAt > now`.
3. Вызывает `verifySteamAssertion`.
4. Делает `user.upsert({ where: { steamId } })`.
5. Генерирует `loginCode`, хранит его hash в `LoginTicket` на 2 минуты.
6. Одной transaction отмечает attempt consumed и создаёт ticket.
7. Redirect в разрешённый `mobileRedirect?code=<loginCode>`.

## 5. Exchange и сессия

Установите зависимости и создайте `apps/api/src/auth/access-token.ts`:

```powershell
pnpm --filter @dota/api add jsonwebtoken fastify
pnpm --filter @dota/api add -D @types/jsonwebtoken
```

```ts
import { randomUUID } from 'node:crypto';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

const TOKEN_ISSUER = 'dota-analyzer-api';
const TOKEN_AUDIENCE = 'dota-analyzer-mobile';

export function signAccessToken(userId: string): string {
  return sign({}, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    jwtid: randomUUID(),
    expiresIn: 15 * 60,
  });
}

export function verifyAccessToken(token: string): string {
  const payload = verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as JwtPayload;
  if (!payload.sub) throw new Error('Access token subject is missing');
  return payload.sub;
}
```

- `TOKEN_ISSUER` и `TOKEN_AUDIENCE` не дают принять token другого сервиса/клиента.
- `userId` записывается в стандартный JWT subject `sub`.
- `jwtid` делает каждый access token уникальным.
- `15 * 60` — 15 минут в секундах.
- `algorithms: ['HS256']` запрещает подменить algorithm из входного token.

Access token подписывайте на 15 минут, refresh token создавайте `createOpaqueSecret()` и храните hash на 30 дней. Добавьте в API env schema `JWT_SECRET: z.string().min(32)`.

Создайте response contract в `packages/contracts/src/auth.ts` и экспортируйте его из `index.ts`:

```ts
export const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: z.object({
    id: z.string(),
    steamId: z.string(),
    displayName: z.string().nullable(),
  }),
});
```

`POST /auth/exchange` принимает `code`. В transaction найдите unused/unexpired `LoginTicket`, пометьте consumed, создайте `RefreshSession`. Один code нельзя обменять дважды.

`POST /auth/refresh` находит hash refresh token, проверяет срок/revocation, отзывает старую запись и создаёт новую. Это rotation: украденный старый token перестаёт работать.

Protected endpoints получают header `Authorization: Bearer <accessToken>`. Создайте `AccessTokenGuard`:

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { verifyAccessToken } from './access-token';

type AuthenticatedRequest = FastifyRequest & {
  user: { id: string };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const accessToken = authorization.slice('Bearer '.length);
      request.user = { id: verifyAccessToken(accessToken) };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
```

`AuthenticatedRequest` — `FastifyRequest & { user: { id: string } }`. Guard проверяет подпись, issuer, audience и expiration, затем кладёт внутренний `userId` в request. SteamID не используется как право доступа к чужому user.

## 6. Mobile browser и SecureStore

Установите:

```powershell
pnpm --filter @dota/mobile exec expo install expo-web-browser expo-linking expo-secure-store
```

В `app.json` задайте scheme `dotaanalyzer`. Создайте `src/auth/session-storage.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export async function saveSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
```

`ACCESS_TOKEN_KEY` и `REFRESH_TOKEN_KEY` — локальные имена записей, не сами tokens. `Promise.all` выполняет две независимые secure-storage операции вместе.

В этот же файл добавьте чтение:

```ts
export type StoredSession = {
  accessToken: string;
  refreshToken: string;
};

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
```

Теперь замените `apiGet` в `src/api/api-client.ts` общей final-реализацией; старые вызовы `apiGet(path, schema)` продолжат работать:

```ts
type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string;
};

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(`${mobileEnv.apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status}`);
  }
  const json: unknown = await response.json();
  return schema.parse(json);
}

export function apiGet<T>(
  path: string,
  schema: ZodType<T>,
  accessToken?: string,
): Promise<T> {
  return apiRequest(path, schema, { accessToken });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  schema: ZodType<T>,
  accessToken?: string,
): Promise<T> {
  return apiRequest(path, schema, {
    method: 'POST',
    body,
    accessToken,
  });
}

export function apiPut<T>(
  path: string,
  body: unknown,
  schema: ZodType<T>,
  accessToken: string,
): Promise<T> {
  return apiRequest(path, schema, {
    method: 'PUT',
    body,
    accessToken,
  });
}

export function apiDelete<T>(
  path: string,
  schema: ZodType<T>,
  accessToken: string,
): Promise<T> {
  return apiRequest(path, schema, { method: 'DELETE', accessToken });
}
```

- `options` объединяет method/body/token без нескольких почти одинаковых fetch-функций.
- `headers` содержит Authorization только для private вызова.
- `body === undefined` важно для GET: он не отправляет строку `"undefined"`.
- `apiGet` и `apiPost` — маленькие публичные wrappers с прежним понятным интерфейсом.

Создайте `src/auth/authenticated-request.ts`, чтобы access token действительно обновлялся:

```ts
import { AuthSessionSchema } from '@dota/contracts';
import { ApiError, apiPost } from '../api/api-client';
import { clearSession, loadSession, saveSession } from './session-storage';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;

  try {
    const refreshed = await apiPost(
      '/auth/refresh',
      { refreshToken: session.refreshToken },
      AuthSessionSchema,
    );
    await saveSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSession();
      return null;
    }
    throw error;
  }
}

export async function authenticatedRequest<T>(
  request: (accessToken: string) => Promise<T>,
): Promise<T> {
  const session = await loadSession();
  if (!session) throw new ApiError(401, 'Authentication required');

  try {
    return await request(session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const freshAccessToken = await refreshPromise;
    if (!freshAccessToken) throw error;
    return request(freshAccessToken);
  }
}
```

- `refreshPromise` существует в final-коде, чтобы пять одновременных 401 не вращали один refresh token пять раз.
- `request` — конкретный private вызов, например `token => apiGet('/me/watchlist', schema, token)`.
- Invalid refresh очищает сессию, но временная ошибка сети её сохраняет.
- Повтор выполняется ровно один раз. Второй 401 возвращается экрану и не образует бесконечный цикл.
- Любая не-401 ошибка сразу пробрасывается без refresh.

Login function:

```ts
const callbackUrl = Linking.createURL('/auth/callback');
const startUrl = `${mobileEnv.apiUrl}/auth/steam/start`;
const result = await WebBrowser.openAuthSessionAsync(startUrl, callbackUrl);

if (result.type !== 'success') return;
const code = new URL(result.url).searchParams.get('code');
if (!code) throw new Error('Login code is missing');

const session = await apiPost('/auth/exchange', { code }, AuthSessionSchema);
await saveSession(session.accessToken, session.refreshToken);
```

`callbackUrl` строится из реального scheme приложения. `result.type` отличает успешный redirect от cancel. Постоянные secrets появляются только в HTTPS response exchange.

## 7. Ваша аналогичная задача: logout с отзывом сессии

Не ограничивайтесь удалением телефона: refresh session должна стать недействительной на сервере.

Требования:

1. `POST /v1/auth/logout` принимает текущий `refreshToken`.
2. Service вычисляет `refreshTokenHash`.
3. `updateMany` ставит `revokedAt: new Date()` только где hash совпал и `revokedAt: null`.
4. Endpoint всегда возвращает `{ success: true }`, не раскрывая существование token.
5. Mobile сначала пытается вызвать logout, затем в `finally` выполняет `clearSession()`.
6. После этого очистить private TanStack Query cache.

Эталон server update:

```ts
await this.prisma.refreshSession.updateMany({
  where: {
    refreshTokenHash: hashOpaqueSecret(refreshToken),
    revokedAt: null,
  },
  data: { revokedAt: new Date() },
});
return { success: true as const };
```

Эталон mobile control flow:

```ts
try {
  await apiPost('/auth/logout', { refreshToken }, LogoutResponseSchema);
} finally {
  await clearSession();
  queryClient.clear();
}
```

Даже без сети user должен выйти локально; server token сам истечёт, а при доступной сети отзывается немедленно.

## 8. Проверка и commit

```powershell
pnpm --filter @dota/database exec prisma migrate dev --name add_auth
pnpm -r typecheck
pnpm -r test
git add apps packages
git commit -m "feat(auth): add Steam OpenID and rotating sessions"
```

Обязательные тесты: поддельный callback; повтор state; expired ticket; повтор exchange code; revoked refresh; refresh rotation; logout без сети. В production callback и API работают только по HTTPS.

[Следующий модуль](14-watchlist-notifications.md)
