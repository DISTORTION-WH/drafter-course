# Глава 9. Rollout, rollback и feature flags

## 1. Deployment не равен release

- Deployment: код запущен в production.
- Release: функция доступна пользователям.

Feature flag позволяет сначала deploy hidden code, проверить его и постепенно release. Но новая code path всё равно должна быть протестирована до production.

## 2. Rolling, canary, blue/green

### Rolling

Новые replicas постепенно заменяют старые. Просто и дёшево, требует совместимой schema/contract.

### Canary

Малый процент traffic или internal users получает новую версию. Сравниваются errors, latency, data correctness. Затем доля растёт или rollout останавливается.

### Blue/green

Два полных environment sets, traffic переключается. Быстрый compute rollback, но дороже; DB/schema часто всё равно общая и требует compatibility.

Выбор зависит от platform/риска. Для MVP достаточно managed rolling deploy с health gates и feature flag; auth/ingestion change можно canary.

## 3. Rollback backend

Runbook:

```text
1. остановить дальнейший rollout
2. зафиксировать симптомы/release/digest
3. выключить рискованную функцию kill switch, если есть
4. вернуть предыдущий image digest
5. не откатывать compatible expanded schema автоматически
6. проверить readiness/smoke/metrics/data integrity
7. обработать jobs/events, созданные новой версией
8. incident review/forward fix
```

Если новая версия записала payload v2, старый worker должен его понимать или producer rollout должен был быть после compatible consumer.

## 4. Rollback migration

При expand-only migration старый code обычно работает с новой schema — это основная страховка. Если migration повредила данные, rollback image недостаточен: нужен restore/repair/reconciliation plan.

Перед destructive change:

- backup/PITR point;
- dry run;
- validation query;
- stop criteria;
- owner;
- recovery time estimate.

## 5. Mobile rollback

Установленный store binary нельзя мгновенно заменить у всех пользователей. Защиты:

- staged/phased store rollout;
- server-side feature flag/kill switch;
- backwards-compatible API;
- compatible EAS Update rollback/republish strategy;
- runtime version separation;
- предыдущая app version остаётся поддерживаемой;
- критический native crash требует нового expedited binary и серверной mitigation.

EAS Update rollback применяется только внутри совместимого runtime и по актуальной процедуре Expo. Не используйте OTA, чтобы обойти store/native permission requirements.

## 6. Feature flag model

```ts
type FeatureFlags = {
  newMetaChart: boolean;
  steamLinkingEnabled: boolean;
  matchReminderPushEnabled: boolean;
  replayParserV2Percentage: number;
};
```

Flags имеют:

- owner;
- purpose;
- default safe value;
- environments;
- targeting policy;
- created/expiry date;
- metric/rollback condition;
- removal task.

## 7. Server и client flags

Server flag контролирует реальное выполнение/запись. Client flag только меняет UI. Скрытая кнопка не является authorization: endpoint всё равно проверяет permission.

Mobile получает подписанный/HTTPS configuration от backend/flag service с safe defaults и cache. Если flag service недоступен, security-sensitive функция fail closed, public cosmetic feature — documented default.

## 8. Deterministic percentage

Не используйте `Math.random()` на каждый запрос: пользователь будет прыгать между variants. Stable bucket:

```text
hash(flagKey + stableInternalUserOrInstallationId) mod 100
```

Не используйте SteamID в third-party flag analytics без privacy review. Anonymous guest targeting требует ограниченного installation ID и понятной retention policy.

## 9. Data/analytics correctness

При parser/metric canary новая версия пишет shadow result в отдельное поле/table и сравнивается:

- counts;
- mismatch rate;
- processing duration;
- failure/quarantine rate;
- sample manual review.

Только затем переключается canonical read/write. Performance success не заменяет data correctness.

## 10. Rollback drill

В staging:

1. deploy release N;
2. deploy N+1 с harmless injected error/flag;
3. alert/smoke обнаруживает;
4. остановить rollout;
5. выключить flag;
6. вернуть digest N;
7. проверить jobs/schema/data;
8. измерить recovery time;
9. улучшить runbook.

[Предыдущая глава](08-cd-eas-builds.md) · [Оглавление](README.md) · [Следующая глава](10-final-staging-production-lab.md)

