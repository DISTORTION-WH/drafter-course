# Глава 1. Граница replay-функции, источники и риски

## 1. Что такое replay

Dota 2 replay (`.dem`) — бинарная запись сетевых сообщений/состояний игрового матча, которую client способен воспроизводить. Это не стабильный JSON API. Внутри встречаются:

- overview матча;
- сетевые entities и их свойства;
- game/user messages;
- combat log;
- modifiers;
- временные сущности;
- данные, зависящие от engine/game build;
- потенциально chat, voice и другие чувствительные/ненужные данные.

Мы извлекаем только заранее определённый allowlist.

## 2. Продуктовые функции первой версии

```text
teamfight timeline
hero deaths/kills/assists subset
damage/heal subset
sampled hero trajectories
heatmap агрегаты
overview validation
```

Не обещаем точную семантику каждого combat события до проверки на нескольких patch/build и manual comparison.

## 3. Источник replay

Перед разработкой для каждого source фиксируется:

```text
provider/правообладатель
официальный способ получить metadata/URL
authentication/quota
URL expiry
разрешённое хранение
разрешённые derived данные
retention
commercial terms
attribution
удаление/запрос правообладателя
```

Не scrape-ите client/CDN endpoint, опираясь на случайный URL из форума. License Clarity относится к parser source, а не к данным Valve/provider.

## 4. Replay selection policy

Replay parsing дорого. `eligible`:

- canonical professional match подтверждён;
- tournament/source разрешён;
- replay metadata доступна;
- match не remake/unsupported mode по policy;
- файл не превышает limit;
- parser поддерживает detected engine/build или идёт canary;
- budget/quota не исчерпаны;
- ещё нет успешного output этой версии.

```ts
type ReplayEligibility =
  | { eligible: true; reason: 'selected-pro-match' }
  | {
      eligible: false;
      reason:
        | 'not-professional'
        | 'source-not-allowed'
        | 'replay-unavailable'
        | 'unsupported-mode'
        | 'already-parsed'
        | 'budget-exhausted';
    };
```

## 5. Threat model

Replay считается недоверенным:

- malformed/truncated binary;
- decompression bomb/огромный файл;
- parser CPU/memory exhaustion;
- crash/JVM bug;
- path traversal через filename;
- URL SSRF;
- unexpected chat/voice personal data;
- output explosion;
- corrupted file, который всегда retry-ится;
- patch/build меняет property semantics без crash.

Поэтому parser изолирован от API, DB credentials ограничены, egress минимален, есть timeout/memory/temp-disk limits и quarantine.

## 6. Не связываем доступность базового матча

Canonical match:

```text
status = complete
replayStatus = unavailable | pending | parsing | available | failed | unsupported
```

`GET /v1/matches/{id}` отвечает даже при replay failure. Replay-derived блок показывает состояние/freshness/version отдельно.

## 7. Provenance

Для файла:

```ts
type ReplayProvenance = {
  matchId: string;
  sourceProvider: string;
  sourceReference: string;
  fetchedAt: string;
  contentSha256: string;
  byteLength: string;
  objectKey: string;
  sourceTermsRevision?: string;
};
```

`sourceReference` не хранит signed URL с secret query. Он содержит безопасный provider object/reference.

## 8. Data minimization

Первая версия не сохраняет:

- raw voice;
- public/all chat content;
- spectator identity events без необходимости;
- полный unprocessed protobuf dump;
- каждый entity property;
- signed download URL;
- пользовательские machine paths.

Если новая функция требует поле, сначала обновляется data catalog/privacy/license review и schema version.

## 9. Success criteria

- 95%+ выбранных поддерживаемых golden/current replays парсятся согласно baseline — конкретный target после пилота;
- basic overview совпадает с canonical match;
- один replay имеет bounded CPU/RAM/time/output;
- corrupted replay не блокирует queue;
- parser update сравним с предыдущим output;
- derived API всегда показывает parser/schema/game build/freshness.

## 10. Упражнение

Сделайте data inventory каждого желаемого replay-поля: источник event, цель продукта, retention, чувствительность, output table, test oracle и поведение при неизвестном build.

[Назад к оглавлению](README.md) · [Следующая глава](02-java-gradle-service.md)

