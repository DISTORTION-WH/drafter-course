# Глава 5. Google Play Console и Android beta

## Результат главы

Вы создадите Android release, заполните обязательные разделы Play Console и дадите сборку внутренним/закрытым тестировщикам.

## 1. До загрузки

Проверьте актуальные требования вашего developer account: Google может требовать identity verification, testing period/число testers для некоторых новых personal accounts и иные шаги, которые меняются. Console показывает обязательные tasks именно для вашего аккаунта.

Подготовьте:

- production `applicationId`;
- AAB, а не debug APK;
- уникальный `versionCode`;
- Play App Signing;
- privacy/support/delete-account URLs;
- content rating, target audience и ads declaration;
- Data safety answers;
- app access instructions/demo account;
- страны распространения и pricing status.

## 2. Создание приложения

В Play Console:

1. создайте app;
2. выберите основной язык;
3. укажите app/game и free/paid исходный статус осознанно;
4. примите declarations только после чтения;
5. добавьте store listing;
6. заполните policy/app content sections.

Переход free → paid и paid → free имеет платформенные ограничения; subscription внутри free app — отдельная модель. Проверьте текущие правила перед выбором.

## 3. App content

Ответьте по реальному коду:

- privacy policy;
- ads: есть ли рекламный SDK/показы;
- app access: нужен ли login;
- target audience/content;
- content rating questionnaire;
- news declaration, если применимо;
- health/financial/other special categories, если применимо;
- data safety;
- account deletion URL.

Аналитика esports не должна ошибочно становиться gambling product. Не добавляйте ставки, real-money prizes или betting referrals без отдельного глубокого legal/policy проекта.

## 4. Data safety

Сопоставьте с inventory из главы 3. Для каждого data type определите:

- collected;
- shared;
- ephemeral processing;
- required/optional;
- purpose;
- encryption in transit;
- deletion path.

Проверьте SDK через их официальные disclosures, но ответственность за ответ ваша. Сохраните дату и версию SDK в privacy manifest.

## 5. Internal testing

Начните с internal track:

1. создайте release;
2. загрузите AAB;
3. добавьте release notes;
4. сформируйте email list/Google Group testers;
5. сохраните opt-in link;
6. установите приложение через Play, а не sideload;
7. проверьте update поверх предыдущей версии.

Internal test нужен для быстрой технической проверки. Затем closed test даёт более реалистичный цикл и может быть обязательным для доступа к production у некоторых аккаунтов.

## 6. Pre-launch report и device coverage

Изучите:

- crashes/ANR;
- accessibility;
- security warnings;
- screenshots разных размеров;
- Android versions/device architectures;
- login failures автоматических тестов.

Автоматический crawler может не войти без credentials. Это не оправдание игнорировать report — настройте app access instructions.

## 7. Closed test protocol

Не просите «потыкать». Выдайте сценарии:

```text
install -> onboarding -> login
search player/team -> open match
open meta -> inspect freshness
add watchlist -> enable/deny notification
offline/reconnect
delete test account
update from build N to N+1
```

Собирайте device model, Android version, build number, steps, expected/actual, request ID. Не просите тестировщика присылать пароль.

## 8. Production rollout

После eligibility и review:

- начните staged rollout, если доступно;
- следите за crash-free users, ANR, 5xx, login and freshness;
- остановите rollout при критическом regression;
- помните: остановка rollout не удаляет версию у уже обновившихся;
- выпускайте исправление с новым `versionCode`.

## Практика

1. Создайте Play app и internal track.
2. Заполните Data safety из manifest, не по памяти.
3. Установите сборку по opt-in link на физическое устройство.
4. Проверьте обновление N → N+1.
5. Запустите closed test с минимум несколькими реальными пользователями.
6. Разберите Pre-launch report и закройте blockers.

## Готово, если

- release подписан Play App Signing;
- Data safety и deletion URL точны;
- reviewer/tester может войти;
- update не теряет локальные настройки/session неожиданно;
- crashes/ANR triage настроен;
- production доступ открывается только после выполненных требований аккаунта.

## Официальные материалы

- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)

