# Глава 10. Итоговая лабораторная: staging и production в AWS

## Задача

Развернуть один и тот же release приложения из части 21 сначала в staging, затем в production. Результат должен воспроизводиться из CDK и CI/CD, а не существовать только как набор кликов в Console.

## 1. Входные условия

Перед началом:

- локальные тесты зелёные;
- MVP работает на физическом телефоне;
- data rights register допускает beta/production использование;
- secrets не лежат в репозитории;
- выбран регион и рассчитан месячный бюджет;
- есть домен или управляемый subdomain;
- существует runbook rollback.

Если права на коммерческое использование данных не подтверждены, лабораторную можно завершить на закрытом staging с synthetic/permitted data, но публичный запуск запрещён.

## 2. Этап A — staging

Создайте CDK stacks:

```text
foundation/network
data
compute
edge/observability
```

Разверните:

- VPC и Security Groups;
- private RDS;
- ECR;
- ECS API за HTTPS ALB;
- ECS worker;
- EventBridge schedule;
- Secrets Manager;
- S3/CloudFront для public legal/support site;
- CloudWatch dashboard и alarms.

Сохраните `cdk synth` как CI artifact и проверьте `cdk diff` перед deploy.

## 3. Этап B — данные и отказоустойчивость

1. Выполните migration task.
2. Импортируйте маленький разрешённый набор.
3. Повторите импорт и подтвердите отсутствие дубликатов.
4. Остановите worker во время job и проверьте повтор.
5. Очистите кэш и подтвердите восстановление ответа.
6. Выполните backup/point-in-time restore в новый RDS.
7. Зафиксируйте реальные RPO/RTO.

## 4. Этап C — pipeline

Настройте GitHub OIDC и выполните:

```text
verify -> build once -> ECR digest -> staging deploy
       -> migrate -> smoke -> production approval
       -> same digest -> production deploy -> smoke
```

В release evidence запишите:

- commit SHA;
- image digest;
- CDK diff approval;
- migration task ARN и exit code;
- smoke test result;
- имя approver;
- timestamp deployment.

## 5. Этап D — production

Production отличается не случайными ручными настройками, а typed config:

- отдельные secrets и database;
- deletion protection;
- согласованный backup retention;
- production domain/certificate;
- alarms на реальных получателей;
- GitHub Environment approval;
- ограничения IAM;
- budget/anomaly alerts;
- подходящая Multi-AZ/desired count политика.

Выпустите тот же digest. После deploy проверьте mobile production build на физическом iOS/Android-устройстве, доступном вам.

## 6. Этап E — аварийная проверка

В безопасное окно:

1. выпустите версию с искусственно нездоровым health check в staging;
2. проверьте circuit breaker;
3. в production используйте безопасный feature flag или заранее подготовленный тестовый rollback;
4. верните last known good digest;
5. измерьте время восстановления;
6. заполните incident timeline.

Не ломайте production с реальными пользователями ради демонстрации.

## 7. Отчёт о стоимости

Сделайте таблицу:

| Ресурс | Месячный прогноз | Фактический run rate | Как уменьшить | Риск уменьшения |
|---|---:|---:|---|---|
| ALB | ... | ... | общий ALB/другой профиль | blast radius |
| Fargate API | ... | ... | CPU/memory/right-sizing | latency |
| RDS | ... | ... | меньший класс/резервация позже | capacity |
| NAT/data transfer | ... | ... | endpoints/архитектура | сложность |
| Logs/S3 | ... | ... | retention/lifecycle | меньше истории |

Цены меняются по региону и времени: приложите дату и ссылку на расчёт, не фиксируйте сумму как вечную истину.

## 8. Итоговые доказательства

Положите в `evidence/aws-launch/`:

```text
architecture.png
security-groups.md
release-manifest.json
smoke-results.md
restore-drill.md
rollback-drill.md
cost-estimate.md
alarm-screenshot-or-export.md
data-rights-reference.md
```

Не сохраняйте секреты и персональные данные в evidence.

## Definition of Done

- staging и production создаются CDK;
- API работает по HTTPS на вашем домене;
- RDS/S3/secrets закрыты правильно;
- API/worker/scheduler/migrate разделены;
- CI/CD использует OIDC и один digest;
- smoke, rollback и restore реально выполнены;
- свежесть данных видна на dashboard;
- месячный бюджет и alarms включены;
- mobile production build работает с production API;
- все ресурсы имеют owner и план удаления/retention.

## Следующий шаг

Теперь infrastructure готова к контролируемой публикации: переходите к [части 23 — выпуску приложения](../part-23-store-release/README.md).

