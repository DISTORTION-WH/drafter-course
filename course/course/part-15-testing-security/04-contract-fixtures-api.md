# Глава 4. Contract fixtures и совместимость API

## 1. У приложения несколько контрактных границ

```text
OpenDota/Steam/replay parser -> provider adapters
backend HTTP                 -> generated mobile client
worker payload               -> queue consumer
push payload                 -> mobile notification router
database migration           -> existing persisted rows
```

Каждую границу нужно фиксировать своим контрактом. Один огромный E2E не объяснит, где именно произошло несовпадение.

## 2. Provider fixture

Fixture — сохранённый пример ответа внешнего provider:

```text
test/fixtures/opendota/
  match-finished-minimal.json
  match-remake.json
  match-missing-team.json
  match-unknown-field.json
  error-rate-limited.json
```

Правила fixture:

- не содержит API key, cookies, IP и лишних персональных данных;
- происхождение/дата/schema version документированы;
- формат максимально близок к wire response;
- редактирование вручную явно отмечено;
- один fixture объясняет один важный случай;
- лицензия/условия provider разрешают нужное хранение.

Не сохраняйте каждый production response в Git.

## 3. Adapter contract test

```ts
it('нормализует отсутствующую команду, не превращая ID в number', async () => {
  const raw = await loadJsonFixture('match-missing-team.json');
  const adapter = new OpenDotaAdapter(new FixtureTransport(raw));

  const match = await adapter.fetchMatch('8173564281');

  expect(match.id).toBe('8173564281');
  expect(match.radiantTeam).toBeNull();
  expect(match.provenance.provider).toBe('opendota');
});
```

Здесь тестируется runtime parser и normalization. Он не обращается в интернет.

## 4. Что делать с новыми полями provider

Обычно дополнительные неизвестные поля не должны ломать parser. Удалённое поле или смена типа должны привести к контролируемой ошибке quarantine/data quality, а не к частично неверной canonical записи.

Контрактные cases:

```text
extra unknown field -> ignore/preserve raw согласно policy
optional absent     -> null/undefined по canonical contract
required absent     -> parse failure с code
numeric ID          -> безопасное преобразование в decimal string, если provider гарантирует точность transport
oversized payload   -> reject/quarantine
invalid timestamp   -> reject field/record согласно policy
```

Для 64-битного JSON number есть риск потери точности ещё в `JSON.parse`. Если provider присылает небезопасное число, нужен parser/transport, сохраняющий big integer, либо provider endpoint со строкой. Нельзя восстановить уже округлённые цифры.

## 5. OpenAPI snapshot

Backend экспортирует детерминированный `openapi.json`. CI:

```text
export schema
-> generated client
-> git diff должен быть пуст
-> API compatibility diff
-> backend E2E response checks
-> mobile typecheck
```

Не делайте текстовый snapshot всего OpenAPI единственным тестом: он создаёт большой diff, который легко принять не читая. Дополнительно проверяйте operation IDs, required fields и отсутствие accidental breaking changes.

## 6. Response schema в E2E

OpenAPI type существует только во время компиляции. HTTP E2E должен проверить реальный JSON. Возможные подходы:

- validator response against exported OpenAPI;
- runtime schemas, из которых генерируются DTO/OpenAPI;
- точечные assertions + contract validator.

Не пишите три независимых схемы вручную. Выберите один source of truth и автоматические преобразования.

## 7. Queue contract

Job payload версионируется:

```ts
type IngestMatchJobV1 = {
  version: 1;
  matchId: string;
  requestedAt: string;
  reason: 'schedule' | 'reconciliation' | 'manual';
};
```

Producer может обновиться раньше worker. При ломающем изменении consumer некоторое время понимает обе версии или rollout сначала обновляет consumer.

Fixture tests декодируют старые поддерживаемые payload.

## 8. Push contract

```json
{
  "eventId": "event-uuid",
  "action": "OPEN_MATCH",
  "matchId": "8173564281"
}
```

Mobile parser test проверяет unknown action, missing ID, numeric ID, arbitrary URL и duplicate event. Старый mobile должен безопасно игнорировать новое неизвестное действие.

## 9. Live provider canary

Обычный PR CI не вызывает provider. Отдельный scheduled canary с минимальной частотой может:

- запросить один разрешённый публичный объект;
- проверить только форму/adapter;
- уважать quotas и terms;
- не блокировать каждый merge из-за provider outage;
- создать alert владельцу ingestion.

Это monitoring, не замена deterministic fixtures.

## 10. Упражнение

Создайте contract fixture suite для одного provider, OpenAPI и push payload. Для каждого fixture напишите, какое реальное изменение он должен поймать и какое изменение разрешено.

[Предыдущая глава](03-integration-testcontainers.md) · [Оглавление](README.md) · [Следующая глава](05-backend-e2e-critical-path.md)

