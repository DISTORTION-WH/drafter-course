# Часть 6. HTTP, JSON и внешние API

[← Часть 5. Git](../part-05-git/README.md) · [Карта курса](../01-course-map.md) · [Часть 7. PostgreSQL →](../part-07-postgresql/README.md)

## Что мы строим

В этой части консольный TypeScript-проект впервые получает реальные данные из сети. Итог — небольшой, но надёжный клиент OpenDota, который:

- собирает URL без склейки строк;
- отправляет `GET`-запрос через встроенный в Node.js `fetch`;
- ограничивает время ожидания;
- отличает сетевую ошибку от HTTP-ответа с ошибкой;
- повторяет только временно неудачные запросы;
- воспринимает внешний JSON как `unknown` и проверяет его;
- сохраняет неизменённый raw payload и метаданные получения;
- не помещает ключ API в репозиторий или мобильное приложение.

## Главы

1. [Клиент, сервер и устройство URL](01-client-server-url.md)
2. [HTTP-запрос и HTTP-ответ](02-request-response.md)
3. [JSON, `unknown` и проверка границы](03-json-unknown-validation.md)
4. [Первый запрос через Node.js `fetch`](04-node-fetch.md)
5. [Timeout, классификация ошибок и retry](05-timeout-errors-retry.md)
6. [Rate limit, pagination и cache](06-rate-limit-pagination-cache.md)
7. [API key, переменные окружения и секреты](07-api-key-and-secrets.md)
8. [Контракт OpenDota и исследование ответа](08-opendota-contract.md)
9. [Provider client и raw archive](09-provider-client-and-raw-archive.md)
10. [Итоговая лабораторная: загрузить и сохранить матч](10-final-http-lab.md)

## Рабочая папка

Создайте новую feature branch и папку рядом с проектом части 4:

```powershell
git switch -c feature/http-opendota-client
New-Item -ItemType Directory -Force practice/dota-data-pipeline
Set-Location practice/dota-data-pipeline
pnpm init
```

Не копируйте ключи и реальные ответы API в Git. В лабораторной появятся папки `data/raw` и `.env`; обе будут исключены через `.gitignore`.

## Зафиксированная граница

OpenDota — первый учебный провайдер, но не доменная модель приложения. Имена полей OpenDota не должны растечься по backend и mobile. В части 9 появятся adapter и canonical model.

## Критерий готовности

Вы умеете своими словами объяснить цепочку:

```text
URL → HTTP request → status/headers/body → unknown JSON
→ runtime validation → raw file + metadata
```

И можете показать, почему `response.ok`, timeout, ограниченный retry и raw archive — разные, необходимые проверки.

## Официальные справочники

- [Node.js: глобальный `fetch`](https://nodejs.org/docs/latest-v24.x/api/globals.html#fetch)
- [MDN: HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [OpenDota API](https://docs.opendota.com/)

Версии, тарифы и квоты меняются. Ссылки и примеры сверены 16 июля 2026 года; перед коммерческим запуском условия провайдера нужно проверить заново.
