# Глава 4. Трассировка с OpenTelemetry

## 1. Trace и span

Trace описывает одну распределённую операцию. Span — участок работы:

```text
Trace: пользователь открыл матч
  Span: HTTP GET /v1/matches/:matchId
    Span: Redis GET match-detail
    Span: PostgreSQL SELECT match
```

Span имеет start/end, status, attributes, events и parent context.

## 2. SDK запускается раньше приложения

Автоинструментация patch-ит/import hooks libraries, поэтому telemetry bootstrap загружается до Nest/Fastify/DB modules.

Conceptual `instrumentation.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: env.otlpTracesUrl,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

await sdk.start();
```

Точные packages/options сверяются с зафиксированной версией OpenTelemetry. Resource attributes задают service name/version/environment через актуальный API/standard variables.

## 3. Auto и manual spans

Auto instrumentation покрывает HTTP и поддерживаемые clients. Manual span нужен для domain step:

```ts
return tracer.startActiveSpan('ingestion.normalize_match', async (span) => {
  try {
    const result = await normalizer.normalize(raw);
    span.setAttribute('dota.completeness', result.completeness);
    return result;
  } catch (error) {
    span.recordException(toSafeException(error));
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

Span name стабилен и не содержит match ID. ID можно добавить как attribute только после privacy/cardinality review; traces тоже стоят денег и доступны операторам.

## 4. Semantic conventions

Используйте текущие OpenTelemetry semantic conventions для HTTP, DB, messaging. Собственные attributes имеют namespace:

```text
dota.provider
dota.ingestion.reason
dota.match.completeness
dota.parser.schema_version
dota.notification.event_type
```

Не дублируйте стандартное поле собственным именем.

## 5. Queue propagation

Producer:

```text
current context -> inject into safe trace carrier -> job metadata
```

Consumer:

```text
extract carrier -> create CONSUMER span -> process -> child DB/provider spans
```

Job может ждать час. Parent/linked span semantics выбираются по messaging conventions и tracing backend; очень длинный trace иногда лучше связать span link, чем изображать синхронный вызов.

Не кладите весь baggage: он переносится по системе, увеличивает payload и рискует утечкой. User/token data в baggage запрещены.

## 6. Sampling

100% production traces дорого. Head sampling выбирает при старте; tail sampling в collector может сохранить:

- errors;
- slow traces;
- редкий provider/parser outcome;
- малую долю обычных success.

Sampling policy документируется. Metrics/SLO нельзя считать только по sampled traces — они будут смещены.

## 7. Collector

```text
SDK -> OTLP -> Collector receiver
-> memory limiter
-> batch
-> attribute redaction/filter
-> tail sampling
-> exporter(s)
```

Collector config хранится как code, тестируется/валидируется, использует TLS/auth. Очередь exporter bounded; dropped spans имеют self-metrics/alert.

## 8. Mobile trace boundary

Не доверяйте incoming trace headers как identity. Backend может продолжить trace с validated format, но authorization выполняется отдельно. Public clients способны создавать произвольные trace IDs; edge sampling/limits защищают backend.

Mobile performance/error SDK и backend OTel могут связываться через accepted propagation format, если privacy и vendor setup утверждены.

## 9. Не записывайте

- query/body с токенами;
- raw SQL parameters;
- full provider payload;
- SteamID/push token;
- arbitrary exception text как metric label;
- replay bytes/object signed URL;
- PII в span events.

## 10. Проверка

В staging откройте match detail и найдите trace. Он должен связать route, cache/DB, status, release и duration. Затем вызовите ingestion job и проверьте producer-consumer propagation. Убедитесь, что exporter outage не ломает API.

Официальный справочник: [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/).

[Предыдущая глава](03-metrics-cardinality.md) · [Оглавление](README.md) · [Следующая глава](05-sentry-releases-mobile.md)

