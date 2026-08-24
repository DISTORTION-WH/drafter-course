# Глава 10. Итоговая лабораторная: опубликованная beta

## Цель

Доставить production-connected приложение реальным тестировщикам через официальные каналы обеих доступных вам платформ, пройти policy/privacy checks и подготовить контролируемый public rollout.

Если у вас нет физического iPhone/Mac/доступного Apple developer enrollment, Android beta может быть первым завершённым каналом. iOS нельзя объявлять завершённым без реального TestFlight и соответствующих аккаунтов.

## 1. Release packet

```text
release manifest
data/IP rights register
privacy data inventory
privacy/terms/support/delete URLs
store listing text
screenshots and asset proofs
review notes + demo account
Android AAB/build ID
iOS build ID
QA report
rollout/rollback plan
support plan
```

## 2. Android acceptance

- production AAB загружен;
- Play App Signing включён;
- app content/Data safety/account deletion заполнены;
- internal install выполнен через Play;
- closed testers прошли сценарии;
- Pre-launch findings triaged;
- обновление N → N+1 проверено;
- production eligibility/status документирован.

## 3. iOS acceptance

- App Store Connect record создан;
- production build обработан;
- App Privacy/account deletion/review info заполнены;
- internal TestFlight пройден;
- external TestFlight/Beta App Review пройден, если выбран;
- upgrade и notifications проверены;
- signing/recovery владелец определён.

## 4. Тестовая когорта

Найдите 10–30 релевантных людей, а не случайные установки. Согласуйте:

- что это beta;
- какие данные/diagnostics собираются;
- куда сообщать ошибки;
- что нельзя присылать секреты;
- время теста;
- consent на интервью отдельно от согласия с terms.

Выберите минимум пять задач:

```text
найти профессиональный матч
объяснить draft/result по экрану
сравнить hero trend за patch/time window
добавить watchlist
понять freshness и источник данных
```

## 5. Критерии готовности к public

Не только «магазин одобрил»:

- нет blocker/critical;
- core task completion подтверждён пользователями;
- crash/API/login/freshness стабильны;
- права на данные/активы действуют;
- support выдерживает объём;
- AWS/provider cost forecast приемлем;
- account deletion и privacy requests выполняются;
- rollback/incident owner доступен;
- listing promises соответствуют факту.

## 6. Решение go/hold/stop

```md
# Launch decision

- date/builds:
- cohort and evidence:
- technical metrics:
- product findings:
- policy/rights status:
- cost forecast:
- known risks:
- decision: go | hold | stop
- owner:
- next review date:
```

`hold` — нормальный результат, если есть исправимый риск. `stop` правильнее, чем публично выпускать продукт без прав или с утечкой.

## 7. Evidence

Сохраните без секретов:

```text
evidence/store-release/android-console-status.md
evidence/store-release/ios-connect-status.md
evidence/store-release/privacy-manifest.md
evidence/store-release/qa-report.md
evidence/store-release/beta-feedback.md
evidence/store-release/launch-decision.md
```

Не публикуйте скриншоты consoles с email, financial data или credentials.

## Definition of Done

- минимум один официальный beta channel реально доступен testers;
- второй канал либо завершён, либо имеет честно описанный внешний blocker;
- store forms совпадают с data inventory;
- deletion/support URLs и backend workflow работают;
- testers используют production-like permitted data;
- review/rejection evidence сохранено;
- public rollout имеет stop criteria;
- ни один asset/data source не имеет неизвестного commercial status.

## Следующий шаг

Приложение доставлено, но бизнес ещё не доказан. Переходите к [части 24 — подписке, unit economics и первым платящим пользователям](../part-24-monetization-business/README.md).

