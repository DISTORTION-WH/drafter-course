# Глава 5. Sentry, releases и mobile crashes

## 1. Роль Sentry

Sentry дополняет logs/metrics/traces:

- группирует похожие exceptions/crashes;
- показывает stack и breadcrumbs;
- связывает issue с release/environment;
- отслеживает mobile crash-free sessions/users по доступной модели;
- помогает понять, начался ли дефект после deployment.

Sentry не заменяет SLO/data freshness/queue dashboards.

## 2. Отдельные projects/environments

Практичная схема:

```text
backend project
mobile project
replay-parser project или общий backend по масштабу

environment: development/staging/production
release: dota-api@<release-id>, dota-mobile@<version+build>
```

Development noise не должен смешиваться с production alert.

## 3. Инициализация и beforeSend

Concept:

```ts
Sentry.init({
  dsn: env.sentryDsn,
  environment: env.environment,
  release: env.release,
  tracesSampleRate: env.sentryTraceSampleRate,
  beforeSend(event) {
    return redactSentryEvent(event);
  },
});
```

Конкретную интеграцию Nest/Expo/React Native устанавливайте по текущему wizard/official guide для зафиксированных SDK. DSN клиента обычно является ingest identifier, но build/upload auth token — секрет и живёт только в CI.

## 4. Privacy

Default deny для:

- request/response bodies;
- authorization/cookies;
- refresh/exchange codes;
- SteamID/user display data;
- push token;
- signed object URL;
- chat/voice/replay content;
- full SQL/provider payload.

Internal user UUID можно псевдонимно связать только если это нужно, разрешено и имеет retention/access policy. Не отправляйте email/IP автоматически без review.

## 5. Capturing expected errors

Не отправляйте каждую 404/validation error как exception. Capture:

- unexpected 5xx;
- invariant violation;
- parser crash;
- unhandled rejection;
- mobile fatal/native crash;
- повторяющийся corrupted local state;
- background worker terminal failure.

Ожидаемые provider timeout/rate limit чаще metrics/logs; в Sentry — только при необычном pattern/terminal path.

## 6. Context и breadcrumbs

Safe tags с малой cardinality:

```text
service, release, environment, route template,
platform, app version/build, job name, provider, parser version
```

Context может включать requestId/traceId/jobId для поиска, но не secrets. Breadcrumbs ограничены и redacted.

## 7. Source maps

Mobile/compiled JS stack полезен только с source maps/debug files, точно соответствующими release/build.

CI:

```text
production bundle/build
-> create/identify release
-> upload source maps/debug artifacts с CI token
-> verify upload
-> deploy exact bundle
-> удалить/не публиковать maps согласно policy
```

Sentry build token имеет минимальный CI/release scope и не попадает в Expo public env или artifact. Source maps загружаются до появления ошибок release.

## 8. Mobile release identity

Нужны:

- app semantic version;
- iOS build/Android version code;
- EAS runtime/update identity;
- environment/channel;
- release/distribution согласно Sentry SDK setup.

OTA update и native binary должны различаться достаточно, чтобы stack сопоставился с правильным artifact.

## 9. Alerts и ownership

Page только для резкого user-impacting crash/5xx regression. Новый единичный issue может создать triage ticket. Alert указывает release, affected versions, first/last seen, runbook/rollback link.

Issue assignment, regression detection и resolved version входят в release process.

## 10. Проверка

Staging test error:

1. имеет staging environment/release;
2. stack де-минифицирован;
3. request/trace ID помогает найти backend trace;
4. tokens/body отсутствуют;
5. alert идёт тестовому receiver;
6. issue связывается с commit/release;
7. production project не загрязнён.

Официальная документация: [Sentry React Native](https://docs.sentry.io/platforms/react-native/) и [Sentry releases](https://docs.sentry.io/product/releases/).

[Предыдущая глава](04-traces-opentelemetry.md) · [Оглавление](README.md) · [Следующая глава](06-sli-slo-error-budgets.md)
