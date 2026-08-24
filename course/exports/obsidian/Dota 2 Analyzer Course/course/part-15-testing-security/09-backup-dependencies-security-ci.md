# Глава 9. Backup/restore и dependency security

## 1. Backup без restore — надежда, а не защита

Определите:

- RPO — сколько последних данных допустимо потерять;
- RTO — сколько времени допустимо восстанавливаться;
- retention — сколько точек/копий хранится;
- scope — PostgreSQL, object storage, secrets/config metadata;
- owner — кто запускает restore и принимает решение;
- evidence — как доказать успешную тренировку.

Пример гипотезы, не универсальное обещание:

```text
RPO PostgreSQL: 15 минут через managed PITR
RTO API read path: 2 часа
ежедневный logical backup: 30 дней
ежемесячный restore drill в изолированном account/project
```

Числа зависят от бюджета и требований.

## 2. Слои восстановления

```text
managed snapshots/PITR -> быстрое восстановление whole DB
logical pg_dump         -> portable/table-level дополнительная копия
raw object storage      -> повторная нормализация provider data
IaC/config              -> восстановление инфраструктуры
secret manager          -> controlled recovery/rotation
```

Redis cache обычно восстанавливать не нужно; очередь/outbox — зависит от семантики. Если Redis является единственной копией незавершённой работы, архитектура уже рискованна.

## 3. Logical backup

Команды выполняются automation account и никогда не вставляют пароль в shell history:

```bash
pg_dump --format=custom --file=dota.dump "$DATABASE_URL"
pg_restore --list dota.dump
```

Для больших managed databases предпочтительны provider-native backups/PITR, а logical dump — дополнительная возможность. Версии client tools совместимы с server major согласно документации PostgreSQL.

Backup шифруется, имеет checksum, ограниченный доступ, lifecycle и копию в отдельной failure domain/account, если threat model требует.

## 4. Restore drill

```text
1. создать новую изолированную БД
2. восстановить snapshot/dump
3. применить только необходимые recovery steps
4. запустить integrity SQL
5. запустить read-only API smoke tests
6. сверить counts/freshness/critical IDs
7. измерить время
8. уничтожить временную среду безопасно
9. записать результат и улучшить runbook
```

Нельзя проверять restore поверх production. Credentials restored environment не должны позволять отправлять реальные push или provider mutations.

## 5. Integrity checks

- migrations/schema version ожидаемая;
- foreign key violations отсутствуют;
- counts ключевых таблиц правдоподобны;
- последний canonical match/raw object существует;
- SteamID/watchlist unique constraints на месте;
- object checksum читается;
- API отдаёт известный матч;
- secrets не попали в dump artifact/log.

## 6. Dependency graph

У нас есть:

- Node/pnpm dependencies;
- base container images;
- GitHub Actions;
- Expo/React Native native modules;
- Android/iOS dependencies;
- OS packages;
- CLI Testcontainers/Maestro/EAS;
- hosted services.

Lockfile делает сборку воспроизводимой, но не делает версии безопасными навечно.

## 7. Automated checks

CI включает:

- lockfile frozen install;
- package vulnerability audit/advisory source;
- dependency review в pull request;
- secret scanning;
- code/static analysis по выбранным правилам;
- container image/OS package scan;
- SBOM/provenance, если поддерживает registry/build pipeline;
- licenses/policy checks;
- action references pinned по принятой политике.

Scanner result triage:

```text
уязвимая версия реально присутствует?
уязвимый code path достижим?
есть обновление?
ломает ли оно runtime/native compatibility?
нужна временная mitigation?
кто владелец и deadline?
```

Нельзя молча игнорировать high finding или автоматически обновлять major прямо в production.

## 8. Обновления

```text
bot создаёт небольшой PR
-> lockfile diff review
-> unit/integration/E2E
-> preview build
-> staging
-> controlled production rollout
```

Expo native module update может потребовать новый binary, а не OTA JavaScript update. Это будет закреплено в части 16.

## 9. Secret incident

Если секрет найден в Git/log/image:

1. считать скомпрометированным;
2. немедленно revoke/rotate у provider;
3. остановить дальнейшее распространение artifacts/logging;
4. оценить использование и blast radius;
5. обновить dependent services;
6. очистить историю/артефакты только как дополнительную меру — rotation главнее;
7. добавить detection/regression test;
8. провести incident review.

Просто удалить строку в новом commit недостаточно.

## 10. Практика

Проведите restore в disposable environment и сохраните отчёт: backup ID/date, checksum, start/end time, schema version, smoke results, проблемы, владелец исправлений. Затем включите dependency/security checks как обязательный, но управляемый CI gate.

Официальный справочник: [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html).

[Предыдущая глава](08-security-controls.md) · [Оглавление](README.md) · [Следующая глава](10-final-quality-security-lab.md)

