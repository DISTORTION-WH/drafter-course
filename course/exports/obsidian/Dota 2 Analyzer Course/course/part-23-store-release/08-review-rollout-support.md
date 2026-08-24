# Глава 8. Review, rollout и первые пользователи

## Результат главы

Вы проведёте релиз как управляемое изменение: с freeze, checklist, наблюдением, поддержкой и критериями остановки.

## 1. Release candidate

После выбора RC не добавляйте «маленькие функции». Разрешены только исправления blockers, каждое из которых снова проходит targeted regression.

Классификация:

```text
Blocker: невозможно войти/удалить аккаунт/открыть core data; crash; утечка; неверная покупка
Critical: ключевой flow серьёзно нарушен, workaround плохой
Major: функция работает частично, есть безопасный workaround
Minor: косметика/редкий edge case
```

В public release нельзя идти с blocker/critical. Major — только с письменным risk acceptance и поддержкой.

## 2. Pre-submit checklist

- production backend healthy;
- provider quota/rights действуют;
- данные свежие и freshness видна;
- privacy/support/terms/delete URLs доступны;
- demo reviewer account работает;
- screenshots/metadata соответствуют binary;
- crash symbols/source maps загружаются;
- alarms идут дежурному;
- support имеет шаблоны ответов;
- rollback/hotfix owner доступен;
- нет planned AWS maintenance в launch window.

## 3. Review

Пока build на review:

- не ломайте backend contract;
- не удаляйте demo data/account;
- отвечайте reviewer кратко и по фактам;
- сохраняйте rejection/сообщения в release record;
- не отправляйте новый build без понимания, сбросит ли это процесс;
- проверяйте статус agreements и forms.

Review duration не контролируется вами; не обещайте пользователям точную дату.

## 4. Phased/staged rollout

Если платформа позволяет, выпускайте долями. Перед увеличением доли смотрите:

- crash-free users/sessions;
- ANR на Android;
- API 5xx и p95;
- login success;
- ingestion freshness;
- delete-account failures;
- support tickets per active user;
- subscription verification позже.

Заранее задайте stop criteria, например:

```text
любая подтверждённая утечка/security issue
невозможность login/delete у значимой доли
crash-free users ниже принятого порога
критически неверная статистика
provider rights/quota revoked
```

Числовые пороги привяжите к реальному baseline beta.

## 5. Support loop

Для каждого обращения:

1. ticket ID;
2. app version/build/platform;
3. request ID/timezone;
4. expected/actual;
5. privacy-safe diagnostics;
6. severity;
7. ответ и status;
8. связь с issue/root cause.

Не просите пароль, refresh token, полный purchase credential. Скриншот может содержать email/account ID — предупредите пользователя.

## 6. Отзывы и рейтинги

Не покупайте reviews и не блокируйте функции за оценку. Просите rating после полученной ценности — например, нескольких успешных анализов — но не после ошибки или в начале onboarding.

На негативный отзыв отвечайте:

- без публикации персональных данных;
- признайте конкретную проблему;
- укажите исправленную версию, если она уже доступна;
- предложите support route;
- не спорьте о чувствах пользователя.

## 7. Первые 72 часа

```text
T-1h: health, freshness, alarms, support, release manifest
T+0: start rollout
T+30m: crash/API/login/freshness
T+2h: store feedback/support/provider quota
T+24h: retention leading signals, errors by build
T+72h: increase/hold/stop decision
```

Если вы один, не запускайтесь перед сном/поездкой. Availability владельца — часть launch plan.

## 8. После релиза

Проведите review:

- что пользователи действительно открыли;
- где ушли из onboarding;
- какие запросы медленные;
- какие данные непонятны;
- сколько стоит один active user;
- какие обещания listing не подтверждаются поведением;
- что удалить из roadmap.

## Практика

1. Выберите RC и проведите regression.
2. Запишите stop criteria.
3. Проведите tabletop «crash после 20% rollout».
4. Организуйте support labels/SLA.
5. Выпустите ограниченную beta cohort.
6. Примите решение increase/hold/stop на данных.

## Готово, если

- существует подписанный release checklist;
- rollout можно остановить;
- метрики разделяются по app build;
- support знает severity и privacy boundaries;
- review communications сохранены;
- увеличение аудитории основано на заранее заданных критериях.

