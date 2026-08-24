# 5. Источники документации и лицензионные проверки

Этот документ фиксирует первичные источники, которые нужно повторно проверить перед production-запуском. Условия, тарифы, лимиты и версии технологий меняются.

## Valve и Steam

- [Steam Web API overview](https://partner.steamgames.com/doc/webapi_overview)
- [Authentication using Web API Keys](https://partner.steamgames.com/doc/webapi_overview/auth)
- [Steam Web API Terms of Use](https://steamcommunity.com/dev/apiterms)
- [Steam user authentication and OpenID](https://partner.steamgames.com/doc/features/auth)

Что проверить:

- допустимый сценарий использования данных;
- правила хранения и защиты API key;
- branding requirements;
- ограничения перераспространения;
- актуальный процесс browser-based Steam authentication.

Ключ Steam API хранится только на backend. Мобильный клиент не получает его ни в исходном коде, ни в собранном bundle.

## OpenDota

- [OpenDota API documentation](https://docs.opendota.com/)
- [OpenDota core repository](https://github.com/odota/core)
- [OpenDota website](https://www.opendota.com/)

Репозиторий полезен для изучения реальной data-архитектуры: Node.js services, PostgreSQL, Redis, replay retrieval и Java/Clarity parser.

Перед запуском проверить:

- текущую бесплатную и платную квоту;
- rate limits;
- правила длительного хранения ответов;
- коммерческое использование;
- полноту профессиональных матчей;
- задержку parsed match data.

Лицензия программного кода OpenDota и условия использования доступных через API данных — не обязательно одно и то же.

## STRATZ

- [STRATZ API knowledge base](https://stratz.com/knowledge-base/API)
- [STRATZ overview](https://stratz.com/welcome)

Перед production:

- получить актуальный API token;
- подтвердить GraphQL limits;
- уточнить коммерческое использование;
- проверить право кэшировать и показывать derived data;
- измерить покрытие профессиональных лиг и replay data.

## Liquipedia

- [Liquipedia API](https://liquipedia.net/api)
- [Liquipedia API Terms of Use](https://liquipedia.net/api-terms-of-use)

Критичные правила:

- использовать официальный API, а не автоматический сбор HTML-страниц;
- кэшировать результаты;
- соблюдать rate limits;
- указывать источник при использовании контента с обязательной атрибуцией;
- заранее согласовать коммерческий план.

## Replay parsing

- [Clarity repository](https://github.com/skadistats/clarity)
- [OpenDota core](https://github.com/odota/core)

Clarity написан на Java и извлекает combat log, entities, modifiers, user messages, game events и match overview. Перед внедрением нужно проверить актуальную версию Java, лицензию parser, поддержку текущего game build и способ законного получения replay metadata.

## Node.js

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Node.js EOL information](https://nodejs.org/en/about/eol)

Для production выбирается Active LTS или Maintenance LTS. Версия фиксируется в `package.json`, CI и Docker image.

## React Native и Expo

- [React Native releases](https://reactnative.dev/docs/releases)
- [React Native New Architecture](https://reactnative.dev/architecture/landing-page)
- [Expo documentation](https://docs.expo.dev/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Expo push notifications](https://docs.expo.dev/push-notifications/overview/)

Перед обновлением mobile stack проверяется:

- совместимость Expo SDK и React Native;
- поддержка New Architecture у chart/navigation/storage libraries;
- ограничения OTA update;
- актуальные требования FCM и APNs;
- правила App Store и Google Play.

## PostgreSQL, Redis и ClickHouse

- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Redis documentation](https://redis.io/docs/latest/)
- [BullMQ documentation](https://docs.bullmq.io/)
- [ClickHouse documentation](https://clickhouse.com/docs)

ClickHouse добавляется после измеренной аналитической нагрузки. До этого PostgreSQL остаётся единственным основным хранилищем.

## Правило курса

Документация провайдера важнее примера из курса, если они расходятся. При любом обновлении зависимостей или источника данных выполняются:

1. Проверка changelog.
2. Проверка migration guide.
3. Тест на staging.
4. Contract tests.
5. План rollback.

