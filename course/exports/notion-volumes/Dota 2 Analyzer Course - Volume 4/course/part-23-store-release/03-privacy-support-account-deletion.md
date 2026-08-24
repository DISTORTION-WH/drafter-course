# Глава 3. Privacy policy, support и удаление аккаунта

## Результат главы

Вы создадите публичные документы и работающий процесс удаления аккаунта, соответствующий фактическому поведению приложения.

## 1. Privacy policy — не шаблон ради галочки

Документ должен совпадать с кодом. Начните с data inventory:

| Данные | Источник | Зачем | Где | Срок | Передача | Удаление |
|---|---|---|---|---|---|---|
| email | пользователь | login/support | RDS/auth provider | ... | email provider | delete/anonymize |
| Steam/account ID | пользователь/provider | поиск статистики | RDS | ... | approved data provider | unlink/delete rule |
| device push token | OS | уведомления | RDS/push provider | до revoke | push provider | delete |
| purchase token | store | entitlement | RDS | legal/operational term | Apple/Google | retain/anonymize rule |
| crash event | SDK | стабильность | observability | ... | processor | expiry |

Не обещайте «мы ничего не собираем», если есть IP logs, crash SDK или account ID.

## 2. Минимальные публичные страницы

На вашем HTTPS-домене:

```text
/privacy          privacy policy
/terms            terms of use
/support          email, FAQ, response expectations
/delete-account   web instructions/request route
/status           optional service status
```

Укажите дату вступления, контакты издателя, категории данных, цели, providers/processors, retention, права пользователя, международную передачу при применимости и порядок изменений.

Юрист должен проверить текст для рынков запуска. Генератор policy не знает реальную архитектуру.

## 3. Apple App Privacy и Google Data safety

Эти формы заполняются по фактическим данным самого приложения и подключённых SDK. Создайте единый `privacy-manifest.md`, из которого отвечаете обоим магазинам.

Перед каждым релизом проверяйте:

- новый SDK;
- новый event аналитики;
- новый login/provider;
- реклама/tracking;
- purchase data;
- diagnostic data;
- данные, связанные с identity;
- data sharing с third party.

Ответ разработчика не освобождает SDK: если библиотека отправляет данные, это часть поведения приложения.

## 4. Удаление аккаунта в приложении

Если приложение позволяет создать аккаунт, Apple требует инициировать удаление из приложения; Google Play также предъявляет требования к удалению и, в применимых случаях, к web-маршруту. Сверьте текущие правила непосредственно перед submission.

UX:

```text
Settings
  -> Account
  -> Delete account
  -> объяснение последствий
  -> повторная authentication
  -> confirm destructive action
  -> status: scheduled/deleted
```

Не прячьте удаление за письмом в support, если правило требует in-app initiation. Дополнительный web route нужен для Google и полезен пользователю, потерявшему устройство.

## 5. Backend workflow удаления

```text
POST /v1/account/deletion-requests
  authenticate + recent re-auth
  create idempotent request
  revoke sessions
  cancel notifications
  unlink provider identifiers
  delete/anonymize personal rows
  preserve only legally required records with restricted purpose
  emit audit event without unnecessary personal data
  confirm completion
```

Purchase records могут иметь обязательный срок хранения. Это не разрешение сохранять весь профиль бессрочно. Разделите юридически необходимые финансовые записи и product profile.

Определите, что происходит с watchlist, notes, support tickets, notification tokens, linked Steam ID и аналитикой. Агрегат можно считать неперсональным только если он действительно больше не позволяет идентифицировать человека.

## 6. Экспорт и исправление

Даже если магазин прямо не требует кнопку export, применимое право может требовать доступ/исправление/переносимость. Создайте support process:

- подтвердить identity безопасно;
- зарегистрировать request ID;
- соблюсти срок;
- не отправлять данные другому человеку;
- записать исполнение без утечки содержимого.

## 7. Support

Support URL должен работать без login. На странице:

- название приложения и издателя;
- контактный email на вашем домене;
- FAQ: login, data freshness, subscription later, delete account;
- версия приложения и способ приложить request ID;
- ожидаемый срок ответа;
- запрет отправлять пароли/ключи/recovery codes.

Настройте SPF/DKIM/DMARC у домена и MFA для почты.

## Практика

1. Заполните data inventory по коду и AWS.
2. Опубликуйте пять страниц через S3/CloudFront.
3. Реализуйте in-app deletion и web request.
4. Прогоните удаление тестового аккаунта от начала до конца.
5. Проверьте отсутствие push/session после удаления.
6. Обновите store privacy forms по inventory.

## Готово, если

- policy соответствует реальным SDK и данным;
- страницы доступны по HTTPS без login;
- удаление инициируется in-app и реально выполняется;
- retention исключения документированы;
- support email принимает и отвечает;
- формы Apple/Google воспроизводятся из одного manifest.

## Официальные материалы

- [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple: account deletion in apps](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Google Play: account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)

