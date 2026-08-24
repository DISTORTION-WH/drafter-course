# Часть 23. Выпуск React Native приложения в Google Play и App Store

## Для кого эта часть

Для ученика, у которого уже есть MVP из части 21 и production backend из части 22, но ещё нет опыта подписи приложений, TestFlight, Play Console и review.

Правила магазинов меняются. В этой части зафиксирован безопасный процесс, а перед каждой отправкой вы обязаны перечитать актуальные формы и официальные правила.

## Результат

Вы:

- закрепите package/bundle identifiers и владельцев signing-ключей;
- создадите development, preview и production builds;
- подготовите privacy policy, support page и удаление аккаунта;
- заполните Google Play Data safety и Apple App Privacy;
- выпустите Android во внутренний/закрытый тест;
- выпустите iOS через TestFlight;
- проведёте staged public rollout или осознанно останетесь в beta;
- получите runbook повторной отправки, отката и экстренного обновления.

## Главная граница

Публикация не доказывает право использовать данные, изображения, логотипы или названия. До review должны быть пройдены data/IP gates из blueprint и части 21. Не заявляйте официальное партнёрство с Valve, Dota 2, турниром или командой без письменного основания.

## Главы

1. [Аккаунты, идентичность приложения и владение](01-accounts-identity-ownership.md)
2. [Production-конфигурация и native builds](02-production-config-native-builds.md)
3. [Privacy, support и удаление аккаунта](03-privacy-support-account-deletion.md)
4. [Карточка магазина, графика и интеллектуальные права](04-store-listing-assets-ip.md)
5. [Google Play Console и Android beta](05-google-play-android-beta.md)
6. [App Store Connect и TestFlight](06-app-store-testflight.md)
7. [EAS Build и Submit](07-eas-build-submit.md)
8. [Review, rollout и первые пользователи](08-review-rollout-support.md)
9. [Отказы review и экстренные релизы](09-rejections-emergency-release.md)
10. [Итоговая лабораторная: опубликованная beta](10-final-store-lab.md)

## Предварительные условия

- AWS production/staging работают по HTTPS;
- есть реальные тесты на физических устройствах;
- auth, account deletion и privacy data map реализованы;
- data rights register не содержит блокирующих `unknown`;
- crash reporting и support inbox проверены;
- вы можете законно открыть developer accounts в своей стране/организации.

## Официальные точки проверки

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play Developer Policy: payments](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Expo: submit to stores](https://docs.expo.dev/deploy/submit-to-app-stores/)

## После части

Переходите к [части 24 — монетизации и проверке бизнеса](../part-24-monetization-business/README.md).

