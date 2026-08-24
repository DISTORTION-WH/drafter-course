# Глава 1. Клиент, сервер и устройство URL

[← Оглавление](README.md) · [Глава 2 →](02-request-response.md)

## Результат главы

Вы сможете разобрать адрес API по частям и безопасно построить URL запроса.

## Клиент и сервер

Клиент начинает общение. Сервер ждёт запрос и формирует ответ. В нашей системе ролей несколько:

```text
OpenDota server ← наш backend как HTTP-клиент
наш backend server ← мобильное приложение как HTTP-клиент
```

Слова «frontend» и «backend» не определяют роль навсегда. Backend является сервером для телефона, но клиентом для OpenDota.

## Из чего состоит URL

Рассмотрим учебный адрес:

```text
https://api.opendota.com/api/proMatches?less_than_match_id=8000000000
```

- `https` — схема, то есть протокол и защищённое соединение;
- `api.opendota.com` — host;
- `/api/proMatches` — path;
- `?` начинает query string;
- `less_than_match_id` — имя query-параметра;
- `8000000000` — его значение.

Fragment после `#` браузер обычно не отправляет HTTP-серверу. Для API он нам не нужен.

## Не склеивайте URL вручную

Такой код хрупок:

```ts
const url = baseUrl + '/proMatches?less_than_match_id=' + matchId;
```

Можно получить двойной `/`, забыть `?`, неправильно закодировать пробел или специальный символ. Используйте `URL`:

```ts
const baseUrl = 'https://api.opendota.com/api/';
const endpointUrl = new URL('proMatches', baseUrl);
endpointUrl.searchParams.set('less_than_match_id', '8000000000');

console.log(endpointUrl.toString());
```

Разберём переменные:

- `baseUrl` не меняется, поэтому `const`;
- `endpointUrl` тоже объявлен через `const`: ссылка на объект не заменяется;
- метод `searchParams.set` изменяет внутреннее состояние объекта, но не переназначает переменную;
- ID передаётся строкой, потому что идентификатор не участвует в арифметике и может превышать безопасный диапазон JavaScript `number`.

## Функция-конструктор URL

```ts
function buildMatchUrl(baseUrl: string, matchId: string): URL {
  if (!/^\d+$/.test(matchId)) {
    throw new Error('matchId must contain digits only');
  }

  return new URL(`matches/${matchId}`, ensureTrailingSlash(baseUrl));
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
```

Почему две функции:

- `buildMatchUrl` знает доменную задачу «адрес матча»;
- `ensureTrailingSlash` решает маленькую техническую задачу;
- параметры имеют имена, описывающие смысл;
- `return` отдаёт готовый объект вызывающему коду;
- проверка не позволяет внедрить в path произвольный фрагмент.

## Path-параметр и query-параметр

```text
/matches/123                 path-параметр: какой ресурс
/matches?limit=20&offset=40  query: как отфильтровать/представить коллекцию
```

Это соглашение, а не закон природы. Всегда читайте контракт конкретного API.

## Практика

Создайте `src/url.ts` и реализуйте:

```ts
export function buildProMatchesUrl(
  baseUrl: string,
  lessThanMatchId?: string,
): URL
```

Если второй аргумент отсутствует, query-параметра быть не должно. Если присутствует — разрешите только цифры.

Проверьте три случая вручную: без курсора, с курсором и с неправильным `abc`.

## Частые ошибки

- Передавать ID как `number`.
- Называть переменную `data`, когда в ней URL.
- Считать, что `const` делает объект полностью неизменяемым.
- Принимать пользовательский path без проверки.

## Самопроверка

- [ ] Я нахожу scheme, host, path и query.
- [ ] Я понимаю роли клиента и сервера в двух направлениях.
- [ ] Я строю адрес через `URL` и `URLSearchParams`.
- [ ] Dota ID в моём прикладном JSON — строка.
