# Глава 1. Права, спрос и отсутствие гарантий

## Результат главы

Вы отделите три независимых риска: можем ли мы построить, имеем ли право продавать и хочет ли рынок платить.

## 1. Три доказательства

```text
Technical feasibility: приложение получает и объясняет корректные данные.
Legal/commercial permission: вы имеете право хранить, перерабатывать, показывать и монетизировать.
Market demand: конкретные люди возвращаются и готовы платить за конкретный результат.
```

Успех в одном не доказывает остальные. Бесплатный API key не означает право перепродавать данные. Десять комплиментов не означают willingness to pay.

## 2. Data rights register

Для каждого источника:

| Поле | Вопрос |
|---|---|
| provider/endpoint | что именно используется? |
| owner | кому принадлежат API, данные и media? |
| terms URL/version/date | какие условия действовали при проверке? |
| commercial use | явно разрешено, запрещено или неизвестно? |
| caching/redistribution | можно ли хранить и показывать производные данные? |
| attribution | какой текст/ссылка обязательны? |
| personal/nonpublic data | какое основание/согласие/удаление? |
| rate limit/cost | выдержит ли модель? |
| termination/export | что делать при отзыве доступа? |
| evidence | договор, письмо, лицензия, legal memo |

Статусы:

```text
green  — письменное разрешение/лицензия покрывает сценарий
yellow — допустимо только ограниченное beta/нужна проверка
red    — запрещено или нет основания; функция не запускается
```

## 3. Steam/Valve и сторонние источники

Steam Web API Terms требуют защищать key, соблюдать privacy и не создают автоматического впечатления affiliation. Условия могут меняться или доступ прекращаться. Коммерческий продукт должен получить актуальную письменную оценку конкретных endpoints и производных данных.

Open source лицензия кода OpenDota/парсера не обязательно лицензирует их API, dataset, images или инфраструктуру. То же разделение применяйте к Liquipedia, турнирным feeds, broadcasts и hero/team assets.

Replay, доступный технически, не обязательно разрешён для массовой загрузки и коммерческой переработки. Не начинайте расходы на парсер до rights gate.

## 4. Trademark и независимость

Проверьте:

- можно ли использовать название игры описательно;
- нельзя ли принять icon/name за официальный продукт;
- право на hero/team/tournament logos;
- required notices;
- домен/social handle;
- рынки товарного знака.

Фраза «неофициальное приложение» полезна для ясности, но не выдаёт лицензию.

## 5. Privacy и профессиональные игроки

Публичность игрового аккаунта не отменяет privacy obligations. Классифицируйте:

- публичные match facts;
- profile identifiers;
- linked user account;
- email/push/payment data;
- inference/profile building;
- retention и deletion.

Избегайте вредных персональных рейтингов и заявлений о здоровье, характере, мошенничестве или гарантированном результате. Аналитика должна показывать метод, выборку и ограничения.

## 6. Business kill criteria

Остановите monetization feature, если:

- коммерческие права не подтверждены;
- provider запрещает paywall/redistribution;
- recurring provider cost превышает реалистичную выручку;
- пользователи хотят лишь данные, которые уже бесплатно лучше доступны;
- premium value основана на misleading prediction;
- store/legal restriction делает model невозможной.

Остановка — экономия времени, не поражение.

## 7. Risk-reduction порядок

Самый дешёвый путь:

```text
terms/licence check
  -> 15 problem interviews
  -> clickable/working free MVP
  -> behavior beta
  -> price smoke test without charging
  -> store sandbox purchases
  -> limited real offer
  -> scale only after retention/unit economics
```

Не создавайте годовую ML-систему до подтверждения, что пользователь платит за решение.

## Практика

1. Заполните register для каждого API, replay, image и brand element.
2. Получите письменный ответ provider там, где terms неясны.
3. Составьте список функций, которые исчезнут при потере источника.
4. Сделайте neutral-asset fallback.
5. Запишите kill criteria и владельца решения.
6. Проведите privacy/IP review перед production payments.

## Готово, если

- нет `unknown` у коммерчески критичных данных;
- лицензия кода не подменяет data license;
- существует plan при отзыве API;
- продукт не выдаёт affiliation;
- kill criteria записаны до расходов;
- legal/accounting вопросы переданы специалистам, а не замолчаны.

## Официальные материалы

- [Steam Web API Terms of Use](https://steamcommunity.com/dev/apiterms)
- [Valve legal information](https://store.steampowered.com/legal/)
- [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/)

