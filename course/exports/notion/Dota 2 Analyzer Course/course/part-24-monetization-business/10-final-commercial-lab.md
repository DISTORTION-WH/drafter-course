# Глава 10. Итоговая лабораторная: первый коммерческий эксперимент

## Цель

Провести ограниченный production-эксперимент с реальной Pro-подпиской для допустимой аудитории, получить технические, продуктовые и экономические доказательства и принять решение. Фактическая покупка желательна как сигнал, но не может быть гарантирована и не заменяет остальные критерии.

## 1. Непреодолимые gates

Перед включением продукта в stores подпишите checklist:

- коммерческие data/media/trademark rights подтверждены;
- издатель, banking, tax и store agreements готовы;
- privacy/terms/support/delete соответствуют коду;
- store payment rule соблюдён;
- sandbox buy/renew/expire/refund/restore пройдены;
- official server verification/notifications/reconciliation работают;
- premium API проверяет server entitlement;
- price/renewal/trial показаны честно;
- support и incident owner доступны;
- AWS/provider budget и quota выдерживают cohort.

Один красный gate = не брать реальные деньги.

## 2. Sandbox acceptance matrix

| Сценарий | Apple | Google | Backend | UI |
|---|---|---|---|---|
| purchase | pass | pass | active | success |
| user cancel | pass | pass | unchanged | neutral |
| pending | n/a/if applicable | pass | no premature access | pending |
| renew | pass | pass | extended once | active |
| billing retry/grace | pass | pass | policy status | explained |
| expire | pass | pass | expired | free/downgrade |
| refund/revoke | pass | pass | revoked | access removed |
| restore/reinstall | pass | pass | relink policy | restored |
| duplicate event | pass | pass | one effect | no duplicate UI |
| missed notification | pass | pass | reconciliation fixes | refresh |

`n/a` объясняется ссылкой на platform behavior, а не оставляется молча.

## 3. Production cohort

Начните с 10–30 релевантных beta users. Для продаж включите только тех, кому доступны production product/storefront и кто получил понятные условия.

Не создавайте фальшивую urgency. Не просите знакомых купить, если они не целевой пользователь, ради красивой conversion.

## 4. Проверяемые hypotheses

```md
Problem: сегмент выполняет задачу минимум X раз/неделю.
Activation: Y% достигают first meaningful analysis.
Retention: Z% возвращаются в week 1/4 (диапазон, не обещание).
Offer: Pro outcome используется после покупки.
Willingness: есть verified purchases/сильные purchase attempts.
Economics: contribution margin неотрицательна в реалистичном сценарии.
Trust: refunds/support/wrong-data не превышают guardrails.
```

Числа задайте до просмотра результата и объясните выбор.

## 5. Наблюдение после включения

Первые 72 часа:

- store purchase started/verified mismatch;
- webhook/PubSub lag/errors;
- reconciliation mismatch;
- entitlement latency;
- premium API denial/allow;
- crash/API/freshness;
- refunds/cancellations;
- billing support;
- provider/AWS cost.

Есть verified charge без entitlement — P0/P1 по вашему масштабу и немедленное исправление/support.

## 6. Финансовая сверка

После доступного отчёта магазина:

```text
store transactions
vs backend verified transactions
vs entitlements
vs financial proceeds/refunds
```

Различия могут быть из-за timing/currency/status, но каждое объясняется. Не считайте mobile `purchase_success` бухгалтерской выручкой.

## 7. Интервью после поведения

Спросите free, paid и отказавшихся:

- какую задачу выполнили;
- использовали ли Pro outcome;
- что было непонятно в цене/данных;
- почему отменили/не начали;
- какой alternative остался;
- что вызвало/подорвало доверие;
- как часто вернутся.

Не предлагайте скидку до понимания проблемы.

## 8. Decision memo

```md
# Commercial experiment decision

- rights/compliance status:
- cohort/time window:
- activation/retention:
- paywall/start/verified:
- Pro feature usage:
- refunds/churn/support:
- revenue and contribution margin range:
- AWS/provider cost:
- qualitative findings:
- incidents/data quality:
- decision: scale | iterate | pivot | pause
- next hypothesis/budget/date:
```

## 9. Evidence

```text
evidence/commercial/rights-signoff.md
evidence/commercial/sandbox-matrix.md
evidence/commercial/store-product-config.md
evidence/commercial/billing-security-review.md
evidence/commercial/reconciliation-report.md
evidence/commercial/cohort-funnel.md
evidence/commercial/unit-economics.md
evidence/commercial/decision-memo.md
```

Маскируйте transaction identifiers, не храните credentials/receipts в учебном evidence.

## Definition of Done

- payment legal/store gates закрыты;
- подписка работает на доступных production platforms;
- client не является источником Pro;
- renewal/refund/restore/reconciliation доказаны;
- реальная cohort увидела честный offer;
- фактический спрос зафиксирован без выдумки;
- costs/margin посчитаны диапазоном;
- принято решение и лимит следующего бюджета;
- масштабирование не начинается автоматически.

## Важно

Если verified purchases равны нулю, лаборатория всё ещё может быть выполнена качественно: вы построили безопасный канал, получили рыночный результат и обязаны изменить segment/problem/offer, а не подделывать успех. Доход — результат рынка, не пункт, который курс может гарантировать.

## Следующий шаг

Соберите все доказательства в [выпускном проекте](../04-commercial-graduation-project.md).

