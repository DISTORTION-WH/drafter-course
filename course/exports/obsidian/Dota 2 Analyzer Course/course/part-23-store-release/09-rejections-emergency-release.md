# Глава 9. Отказы review и экстренные релизы

## Результат главы

Вы научитесь превращать отказ магазина или production-инцидент в конкретный план, не споря вслепую и не создавая ещё больший риск.

## 1. Rejection — это входные данные

Создайте запись:

```md
# Review issue

- store/build/version:
- guideline/policy cited:
- exact reviewer message:
- reproduction steps:
- evidence/screenshots:
- root cause:
- code/metadata/policy fix:
- response text:
- owner/date:
```

Не меняйте десять вещей одновременно. Сначала воспроизведите, сопоставьте с актуальным правилом, затем исправьте причину.

## 2. Типовые классы отказа

- reviewer не может войти;
- app incomplete/crashes/placeholder;
- metadata обещает отсутствующую функцию;
- privacy disclosure не совпадает с SDK;
- нет/спрятано account deletion;
- нарушено правило оплаты digital features;
- нет подтверждения прав на контент/бренд;
- минимальная функциональность/слишком похожий wrapper;
- неправильный age/content rating;
- broken support/privacy URL.

Это не исчерпывающий список. Решение должно ссылаться на конкретное актуальное правило.

## 3. Ответ reviewer

Хороший ответ:

```text
Thank you. We reproduced the issue in build 12.
Root cause: ...
Fixed in build 13: ...
Steps to verify: 1) ... 2) ...
Demo account: ...
The account deletion entry is at Settings > Account > Delete account.
```

Не обвиняйте reviewer и не утверждайте, что правило «глупое». Если вы считаете решение ошибочным, приведите факты, точный guideline и reproduction. Appeal используйте по официальному процессу.

## 4. Policy меняется

Назначьте ежемесячную проверку:

- Apple App Review Guidelines/news;
- Google Play policy deadlines;
- target SDK/OS requirements;
- privacy manifest/SDK deadlines;
- billing library requirements;
- account verification/testing requirements;
- provider/Valve terms.

Дата проверки хранится в compliance register. Отсутствие письма не доказывает отсутствие новых требований.

## 5. Emergency server-side mitigation

Некоторые инциденты можно смягчить без новой binary:

- выключить функцию feature flag;
- остановить ingestion scheduler;
- вернуть backend digest;
- отключить notification campaign;
- скрыть повреждённый dataset с честным status;
- заблокировать устаревшую app version только при необходимости и с upgrade message.

Feature flags должны иметь owner, expiry и safe default. Не создавайте скрытую возможность обходить store review.

## 6. Emergency mobile release

Порядок:

1. подтвердить severity;
2. минимальный fix без unrelated refactor;
3. увеличить build number;
4. targeted tests + core smoke;
5. собрать production artifact;
6. обновить metadata/review notes;
7. запросить expedited review только если условия платформы подходят;
8. мониторить rollout.

Даже срочный релиз нельзя подписывать непроверенным компьютером или обходить account owner.

## 7. Forced update

Forced update оправдан при security/protocol incompatibility, но может запереть пользователя, если store rollout ещё не доступен всем. API должен поддерживать окно версий:

```text
minSupportedVersion
latestVersion
updateMode: optional | required
message
storeUrl
```

Перед `required` проверьте доступность build во всех странах/platforms.

## 8. Postmortem

Без поиска виноватого зафиксируйте:

- impact и duration;
- detection;
- timeline;
- root cause и contributing factors;
- почему tests/monitoring не поймали;
- immediate и systemic actions;
- owners/deadlines;
- доказательство завершения.

«Быть внимательнее» — не системное действие. Пример: добавить contract test, автоматическую проверку URL или release gate.

## Практика

1. Смоделируйте rejection из-за broken demo login.
2. Напишите factual response.
3. Проведите emergency backend rollback.
4. Соберите hotfix mobile build с новым number.
5. Протестируйте optional/required update.
6. Напишите postmortem и одно автоматизированное улучшение.

## Готово, если

- rejection превращается в tracked issue;
- есть календарь policy review;
- server mitigation и mobile hotfix разделены;
- forced update не блокирует регионы без доступного build;
- postmortem приводит к проверяемым изменениям;
- store credentials остаются защищены даже в инциденте.

