# Глава 9. Инциденты, runbooks и восстановление

## 1. Incident declaration

Инцидент объявляется при значимом user/data/security impact или реальном риске. Лучше объявить рано и закрыть, чем два часа хаотично расследовать без ролей.

Severity example:

| Уровень | Impact | Response |
|---|---|---|
| SEV-1 | массовая недоступность/потеря/компрометация | немедленно, формальные роли |
| SEV-2 | существенная деградация/freshness | срочно |
| SEV-3 | ограниченное влияние/нет срочности | рабочий процесс |

Определения адаптируются размеру команды.

## 2. Роли

- Incident Commander — координация/решения, не обязательно главный debugger.
- Operations Lead — техническая диагностика/mitigation.
- Communications Lead — status/update/stakeholders.
- Scribe — timeline/решения/evidence.

В одиночной команде роли совмещаются, но checklist всё равно полезен. При росте инцидента IC делегирует.

## 3. Mitigation first

```text
detect -> declare -> assess impact
-> stop rollout / flag off / failover / scale / rollback
-> verify user recovery
-> deeper root cause
-> permanent fix
```

Не задерживайте безопасный rollback ради идеального root cause. Но сохраняйте evidence и не выполняйте разрушительное действие без понимания.

## 4. Incident timeline

```text
14:02 alert fired
14:05 SEV-2 declared, IC assigned
14:08 correlated with worker release abc123
14:12 parserV2 flag disabled
14:18 queue age stopped growing
14:30 freshness recovered
```

Записывайте UTC/явную timezone, автора и факт/гипотезу отдельно.

## 5. Runbook structure

```text
Title/owner/last tested
Symptoms and user impact
Prerequisites/access
Dashboards/log queries/traces
Safe diagnostic steps
Mitigations ordered by risk
Rollback/restore steps
Verification
Escalation/providers
Do not do
Related architecture
```

Runbook содержит команды с placeholders и проверками target environment. Production credentials в документе нет.

## 6. Runbook: stuck ingestion queue

1. подтвердить oldest age и freshness impact;
2. проверить enqueue/completion, worker heartbeat, release;
3. посмотреть error outcome/provider status/DB saturation;
4. остановить bad producer или rollout;
5. scale workers только если DB/provider имеют capacity;
6. retry безопасных jobs с idempotency;
7. quarantine poison job;
8. проверить backlog drain и canonical freshness;
9. не очищать очередь целиком без inventory/recovery.

## 7. Backup restore incident

При повреждении/потере:

- ограничить writes;
- определить recovery point/RPO impact;
- сохранить текущие artifacts/logs;
- выбрать PITR/snapshot/logical restore;
- восстановить в новую среду;
- integrity/API smoke;
- переключить traffic по change plan;
- rotate credentials при security incident;
- reconcile provider/raw data после точки;
- communicate data loss window честно.

Нельзя импровизировать первый restore во время SEV-1 — часть 15 уже потребовала drill.

## 8. Status communication

Update содержит:

- подтверждённое влияние;
- время начала;
- что работает/не работает;
- текущую mitigation;
- следующую точку обновления;
- без неподтверждённой причины/секретов.

После восстановления сообщается время и остаточные ограничения.

## 9. Postmortem

Blameless не означает без ответственности. Документ:

- impact и SLO/error budget;
- timeline;
- root/contributing factors;
- detection/response/recovery analysis;
- что сработало;
- конкретные actions с owner/deadline;
- тест/alert/runbook changes;
- follow-up review.

Причина «человек ошибся» недостаточна: почему система позволила и не обнаружила.

## 10. Game day

В staging проведите сценарии:

- provider timeout;
- worker остановлен;
- DB connections exhausted;
- bad deploy error rate;
- stale meta;
- restore из backup;
- replay parser poison file в части 18.

Измеряйте time to detect/declare/mitigate/recover и обновляйте runbooks.

Официальный материал: [Google SRE Incident Response](https://sre.google/workbook/incident-response/).

[Предыдущая глава](08-alerts-dashboards.md) · [Оглавление](README.md) · [Следующая глава](10-final-observability-lab.md)

