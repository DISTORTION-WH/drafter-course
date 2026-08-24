# Глава 7. Цена, налоги и unit economics

## Результат главы

Вы выберете не «красивую цену», а проверяемую гипотезу и поймёте, сколько остаётся после магазина, налогов, данных, AWS и поддержки.

## 1. Цена начинается с ценности и сегмента

Три ориентира:

- alternatives: что человек уже использует и сколько это стоит временем/деньгами;
- willingness evidence: фактические покупки/бюджет, а не комплимент;
- cost floor: переменные расходы и support, ниже которых рост ухудшает бизнес.

Не выбирайте цену только как «на 20% дешевле конкурента»: продукт и права на данные могут отличаться.

## 2. Localized store price

Apple/Google управляют price tiers/base plans, валютами, налоговым отображением и storefront rules. В UI всегда используйте localized price/product details, полученные из store.

Создайте price decision:

```md
- segment/outcome:
- monthly product/base plan:
- annual discount hypothesis:
- trial/intro offer:
- countries/storefronts:
- effective date:
- refund/support assumptions:
- evidence/review date:
```

Trial не бесплатен для бизнеса: он создаёт support/infra cost и может привлекать слабый intent. Не включайте его автоматически.

## 3. Комиссия магазина

Store commission зависит от платформы, программы, типа подписки, срока, страны и действующих соглашений. Не фиксируйте в финансовой модели одно вечное `30%` или `15%`.

Создайте input:

```text
store_fee_rate = текущее применимое значение из договора/финансового отчёта
```

Проверяйте eligibility программ малого бизнеса и альтернативных условий с бухгалтером/юристом. Курс не утверждает, что вы автоматически участвуете.

## 4. Формулы

```text
gross billings = paid transactions × customer price before applicable deductions
store proceeds = фактическая сумма из financial report
net revenue = proceeds - refunds - chargebacks - taxes/withholding not already deducted
gross profit = net revenue - provider variable cost - AWS variable cost - support/payment tooling
gross margin = gross profit / net revenue
ARPPU = net revenue / paying users
conversion = new payers / eligible activated users
subscriber churn = subscriptions ended / subscriptions active at period start
break-even paying users = monthly fixed costs / contribution margin per payer
```

Определение MRR для annual plan должно быть согласовано: распределяйте признанный доход по месяцам для управленческой метрики, но бухгалтерский учёт задаёт специалист.

## 5. Cost model

| Статья | Fixed/variable | Driver | Источник факта |
|---|---|---|---|
| AWS baseline | fixed-ish | RDS/ALB/NAT/минимум tasks | Cost Explorer |
| AWS usage | variable | requests/storage/egress/logs | CUR/Cost Explorer |
| data provider | tier/variable | calls/matches/users | contract/invoice |
| store fee | variable | proceeds/program | store financial report |
| tax/withholding | jurisdiction | entity/storefront | accountant/report |
| support | variable | tickets/payers | tracked time/tool |
| observability/email/push | tier/variable | events/users | invoice |
| legal/accounting | fixed/periodic | countries/entity | invoices |

Ваше бесплатное время не равно нулю. Добавьте owner hours как отдельный управленческий cost.

## 6. Cohort spreadsheet

Для каждой месячной cohort:

```text
signups -> activated -> paywall viewers -> trial -> paid
month 1 retained -> month 2 -> month 3
revenue/refunds
provider/AWS/support cost
```

Не вычисляйте LTV из одной недели как достоверный факт. Используйте диапазоны:

```text
LTV_low / base / high
CAC_low / base / high
```

Пока retention history мала, не масштабируйте paid acquisition по оптимистичному LTV.

## 7. Цена и эксперимент

Цена — чувствительное воздействие. Сегменты должны получать прозрачные условия; не применяйте скрытую дискриминацию. Store offers/eligibility должны соответствовать platform rules.

До изменения:

- hypothesis;
- primary metric;
- guardrails: refund, support, retention, complaint;
- sample/time window;
- no retroactive surprise;
- clear renewal price.

Существующих subscribers нельзя неожиданно перевести без соблюдения store notification/consent rules.

## 8. Налоги и юридическое лицо

До реальных продаж выясните для своей страны и рынков:

- форма деятельности/юридическое лицо;
- право принимать выплаты;
- tax forms и banking agreements магазинов;
- VAT/GST/sales tax handling;
- income/corporate tax;
- withholding;
- consumer cancellation/refund;
- invoices/receipts;
- валютный контроль/санкционные ограничения;
- хранение финансовых записей.

Это зона бухгалтера/юриста. Не принимайте production money, если вы не понимаете, кто продавец и как декларируется доход.

## Практика

1. Постройте model для 100/500/2 000 paying users.
2. Используйте low/base/high churn и provider cost.
3. Вставьте фактический AWS baseline из части 22.
4. Рассчитайте contribution margin/break-even.
5. Получите письменную налоговую консультацию.
6. Сравните прогноз с первым store financial report и исправьте model.

## Готово, если

- цена — hypothesis с датой;
- комиссия не захардкожена как вечный факт;
- учтены refunds/provider/AWS/support/tax uncertainty;
- виден break-even;
- LTV не выдуман без cohort history;
- production payouts готовы юридически/налогово.

## Официальные материалы

- [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Google Play subscriptions](https://developer.android.com/google/play/billing/subscriptions)
- [AWS Pricing Calculator](https://calculator.aws/)

