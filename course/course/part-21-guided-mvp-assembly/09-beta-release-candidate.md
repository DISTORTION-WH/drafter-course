# Глава 9. Beta-тестирование и release candidate

## Цель

Заморозить функциональность, дать приложение реальным представителям аудитории и исправлять critical path, а не продолжать добавлять функции.

## 1. Feature freeze

RC scope:

- matches/history/details;
- teams/players;
- draft;
- hero meta;
- search;
- guest/auth;
- watchlist;
- test notifications;
- settings/privacy/support/account deletion entry;
- freshness/error/offline states.

Replay/ClickHouse/ML/premium purchase пока off.

## 2. RC manifest

```json
{
  "release": "mvp-rc.1",
  "commit": "...",
  "apiImageDigest": "...",
  "databaseSchema": "...",
  "openApiSha256": "...",
  "mobileBuildId": "...",
  "runtimeVersion": "...",
  "providerContracts": ["..."],
  "dataRightsRegisterVersion": "...",
  "knownIssues": []
}
```

RC нельзя пересобрать под тем же ID с другим кодом.

## 3. Tester recruitment

Наберите 10–30 человек из выбранного segment, а не только друзей-разработчиков. Перед тестом:

- consent/что собирается;
- тестовая цель;
- support/contact;
- запрет публикации private link при необходимости;
- ожидаемый период;
- способ сообщить об удалении данных;
- компенсация/подарок согласно store beta rules и местным требованиям.

## 4. Task-based test

Не спрашивайте только «нравится?». Дайте задачи:

1. найти ближайший матч команды;
2. объяснить, кто играет и когда;
3. найти последний драфт;
4. сравнить форму команд;
5. найти meta hero на текущем patch;
6. добавить команду и включить reminder;
7. найти freshness/источник;
8. удалить account/test data.

Наблюдайте completion/time/confusion, не подсказывая преждевременно.

## 5. Feedback record

```text
tester segment
task
expected
observed
severity
evidence
privacy-safe device/app version
decision
issue link
```

Не записывайте экран/голос без согласия.

## 6. Severity

```text
P0 security/data loss/wrong billing -> stop
P1 critical path impossible/wrong stats -> block RC
P2 significant friction -> fix/explicit decision
P3 polish -> backlog
```

Новая feature request не автоматически P1.

## 7. Product signals

В beta измерьте с минимальным privacy event set:

```text
install/open
critical path completion
match detail viewed
meta viewed with filter
watchlist created
notification preference enabled
D1/D7 return
error/empty/stale exposure
```

Не измеряйте каждое касание/текст без цели.

## 8. Interview after use

Вопросы:

- когда вы в последний раз искали такую информацию;
- чем пользовались вместо приложения;
- что было самым медленным/неясным;
- какой результат был полезен;
- что вы ожидали увидеть и не нашли;
- за какую конкретную экономию времени/возможность могли бы платить;
- что должно быть бесплатным;
- почему удалили бы приложение.

Не спрашивайте «заплатили бы 5 долларов?» как единственное доказательство.

## 9. RC exit gate

- P0/P1 = 0;
- critical task completion target достигнут;
- stats golden tests проходят;
- crash-free target;
- freshness/SLO выдержаны;
- rights register no blockers for beta scope;
- privacy/support/deletion accessible;
- device matrix checked;
- old/new API compatibility;
- rollback rehearsed;
- known P2/P3 documented.

## 10. Не монетизировать слишком рано

Сначала подтвердите повторное использование/ценность. Paywall до working activation мешает узнать, полезен ли core. Можно тестировать описание premium/waitlist без списания денег, если это честно обозначено.

## Definition of Done

- feature freeze/RC manifest;
- representative testers;
- task tests and interviews;
- privacy-safe feedback/events;
- severity triage;
- critical issues closed;
- user value hypothesis уточнена;
- premium candidate сформулирован из наблюдений;
- release gate evidence сохранено;
- repository готов к AWS deployment.

[Предыдущая глава](08-quality-security-operations.md) · [Оглавление](README.md) · [Следующая глава](10-complete-mvp-lab.md)

