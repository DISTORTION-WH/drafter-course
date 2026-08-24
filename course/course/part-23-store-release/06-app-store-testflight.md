# Глава 6. App Store Connect и TestFlight

## Результат главы

Вы загрузите iOS build, заполните App Store Connect и проведёте внутренний/внешний TestFlight-тест.

## 1. Требования до build

Нужны:

- активное Apple Developer membership;
- App Store Connect app record;
- production bundle ID;
- agreements/tax/banking, когда начинается продажа;
- unique build number;
- privacy/support URLs;
- App Privacy answers;
- reviewer contact, notes и demo login;
- export compliance answers;
- age rating/content rights declarations.

Статусы и названия полей могут меняться. App Store Connect показывает фактические blockers.

## 2. App record

Создайте запись до submit:

```text
platform: iOS
name: проверенное название
primary language
bundle ID: точное совпадение build
SKU: ваш внутренний стабильный identifier
user access: только нужные роли
```

SKU не виден пользователю, но не делайте его секретом. Bundle ID после создания надо рассматривать как постоянный.

## 3. Signing

EAS может управлять certificates/profiles, но вы должны:

- войти аккаунтом с минимально достаточной ролью;
- знать, кто Account Holder;
- иметь recovery plan;
- удалить доступ бывших подрядчиков;
- не пересылать `.p12` и пароль в мессенджере;
- понимать, какой distribution certificate подписал build.

Автоматизация не отменяет владение.

## 4. TestFlight internal

После обработки build:

1. добавьте внутреннюю группу;
2. назначьте build;
3. заполните What to Test;
4. установите через TestFlight;
5. проверьте login, deep link, notifications, offline и account deletion;
6. проверьте upgrade со старого TestFlight build.

Internal testers — пользователи App Store Connect. External testing проходит Beta App Review и требует beta information.

## 5. App Privacy и privacy manifests

Ответы должны включать данные, собираемые вашими SDK. Apple также имеет требования к privacy manifests/required reason APIs для применимых SDK и API. Проверяйте build warnings и актуальную документацию каждой зависимости.

Удалите SDK, чья функция не используется. Чем меньше стороннего кода, тем меньше поверхность privacy/security review.

## 6. Reviewer access

Если login обязателен:

- стабильный demo account;
- пароль не истекает во время review;
- MFA не требует ваш личный телефон;
- demo data уже существует;
- backend доступен из сети reviewer;
- geo/rate-limit не блокируют Apple;
- notes объясняют необычный flow и data freshness.

Если часть функций зависит от ещё не начавшегося турнира, предоставьте воспроизводимый demo scenario.

## 7. In-app account deletion

Reviewer должен легко найти удаление. Если deletion завершается не мгновенно, покажите статус и разумный срок. Не заставляйте пользователя звонить. Повторная authentication допустима для защиты аккаунта.

Проверьте после удаления:

- refresh token отозван;
- повторный запрос profile получает 401/404 по вашему контракту;
- push token удалён;
- subscription management доступен через store даже после удаления profile, если подписка ещё требует действий пользователя;
- UI объясняет, что удаление аккаунта и отмена подписки — разные операции, если это так по store lifecycle.

## 8. Submit for review

Перед кнопкой:

- binary соответствует metadata;
- все URLs работают;
- production backend стабилен;
- no placeholder text;
- screenshots соответствуют устройствам;
- rights declarations подтверждены;
- review notes проверены другим человеком;
- support готов отвечать.

Никогда не придумывайте ответ review questionnaire. Неуверенность — сигнал проверить документацию/юриста.

## Практика

1. Создайте App Store Connect record.
2. Загрузите build с уникальным build number.
3. Проведите internal TestFlight.
4. Исправьте минимум один найденный feedback issue и загрузите новый build.
5. Подготовьте external beta information/review notes.
6. Прогоните deletion и upgrade.

## Готово, если

- TestFlight build устанавливается и обновляется;
- privacy answers совпадают с SDK;
- reviewer имеет стабильный доступ;
- deletion видимо и работает;
- signing ownership/recovery документированы;
- metadata не содержит неподтверждённых заявлений.

## Официальные материалы

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple account deletion requirement](https://developer.apple.com/support/offering-account-deletion-in-your-app)

