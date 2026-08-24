# Глава 2. Серверный Steam OpenID flow

## 1. Что предоставляет Steam

Для входа через браузер Steam использует OpenID 2.0. Пользователь перенаправляется на Steam Community, входит там и возвращается на наш сервер. Официальный endpoint:

```text
https://steamcommunity.com/openid/
```

После корректной серверной проверки claimed identifier имеет форму, содержащую SteamID64:

```text
https://steamcommunity.com/openid/id/<steamid>
```

Схема может использовать нормализованный HTTP/HTTPS-вариант согласно проверенному ответу и библиотеке. Не извлекайте ID до успешной проверки всего OpenID response.

## 2. Полный поток

```text
1. Mobile создаёт локальный state/challenge запроса входа.
2. Mobile открывает GET /v1/auth/steam/start через системную auth-сессию.
3. Backend создаёт серверный login transaction с коротким TTL.
4. Backend redirect -> Steam OpenID.
5. Пользователь входит только на домене Steam.
6. Steam redirect -> HTTPS callback нашего backend.
7. Backend проверяет OpenID response у Steam.
8. Backend извлекает подтверждённый SteamID64.
9. Backend создаёт/находит user и одноразовый exchange code.
10. Backend redirect -> наш universal/app link?code=...&state=...
11. Mobile сверяет state.
12. Mobile POST /v1/auth/exchange с одноразовым code.
13. Backend атомарно погашает code и выдаёт access + refresh session.
```

В URL находится только короткоживущий одноразовый код, не access или refresh token.

## 3. Таблица login transactions

```sql
CREATE TABLE auth_login_transactions (
  id uuid PRIMARY KEY,
  state_hash text NOT NULL UNIQUE,
  mobile_redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_exchange_codes (
  id uuid PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id),
  login_transaction_id uuid NOT NULL REFERENCES auth_login_transactions(id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Raw `state` и raw `code` не нужны после выдачи: храните hash. Значения генерируются криптографически стойким генератором с достаточной энтропией. UUID идентификатор строки сам по себе не заменяет случайный secret-код.

## 4. Redirect allowlist

Backend никогда не принимает произвольный `returnTo=https://attacker.example`. Допустимые mobile redirect URI перечислены конфигурацией окружения:

```text
development: dota-analyzer-dev://auth/callback
staging:     https://staging-app.example.com/auth/callback
production:  https://app.example.com/auth/callback
```

В production предпочтительны проверенные HTTPS universal links/app links. Custom scheme полезна в development, но другое приложение потенциально может зарегистрировать ту же схему.

OpenID `realm` и `return_to` также формируются backend из фиксированного публичного origin. Не доверяйте `Host`/forwarded headers без настройки trusted proxy.

## 5. Что именно проверяет backend

Используйте поддерживаемую OpenID-библиотеку или аккуратно реализованный server adapter по спецификации. Backend проверяет:

- ответ действительно относится к нашему `return_to`/realm;
- anti-forgery state/login transaction существует, не истёк и не погашен;
- OpenID response проходит проверку у Steam;
- provider endpoint ожидаемый;
- claimed identity имеет допустимый Steam-формат;
- SteamID состоит из десятичных цифр и остаётся строкой;
- exchange code одноразовый и короткоживущий.

Нельзя просто прочитать query `openid.claimed_id` и считать пользователя вошедшим.

## 6. Controller и service

Контроллер только оркестрирует HTTP:

```ts
@Get('steam/start')
async startSteamLogin(@Query() query: StartSteamLoginDto, @Res() res: Response) {
  const redirectUrl = await this.authService.createSteamRedirect(query);
  return res.redirect(302, redirectUrl);
}

@Get('steam/callback')
async finishSteamLogin(@Req() req: Request, @Res() res: Response) {
  const mobileRedirect = await this.authService.verifySteamAndCreateCode(req);
  return res.redirect(302, mobileRedirect);
}
```

Service выполняет транзакции и verification через отдельный `SteamOpenIdAdapter`. Это позволяет тестам заменить внешний provider fixture.

## 7. Mobile открывает системную auth-сессию

Expo WebBrowser предоставляет auth session API. Логика:

```ts
const result = await WebBrowser.openAuthSessionAsync(
  startUrl,
  callbackUrl,
);
```

Точные поля результата и настройка universal links зависят от текущей Expo SDK, поэтому устанавливайте модуль через `npx expo install expo-web-browser` и сверяйте типы зафиксированной версии.

Не встраивайте Steam login в собственный WebView и не просите пароль Steam внутри UI приложения.

## 8. Ошибки потока

Обработайте отдельно:

- пользователь отменил browser session;
- transaction истекла;
- state не совпал;
- Steam временно недоступен;
- exchange code уже использован;
- redirect URI не разрешён;
- SteamID уже связан с другим пользователем.

После любой ошибки приложение остаётся гостем. Оно не должно оказаться в частично авторизованном состоянии.

## 9. Официальный источник

Описание browser-based Steam authentication и OpenID endpoint находится в [официальной документации Steamworks](https://partner.steamgames.com/doc/features/auth).

[Предыдущая глава](01-guest-and-identity-model.md) · [Оглавление](README.md) · [Следующая глава](03-sessions-and-token-rotation.md)

