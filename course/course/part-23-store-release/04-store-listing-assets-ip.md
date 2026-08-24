# Глава 4. Карточка магазина, графика и интеллектуальные права

## Результат главы

Вы подготовите честную, понятную карточку приложения и пакет графики без неподтверждённых обещаний и чужих активов.

## 1. Позиционирование одной строкой

Формула:

```text
Для [конкретного пользователя], который [проблема],
приложение помогает [результат] благодаря [ключевой механизм].
```

Пример без ложной официальности:

```text
Для зрителей и аналитиков профессиональной Dota 2 приложение помогает
быстро сравнивать матчи и текущие hero trends по данным с указанной свежестью.
```

Не обещайте «точный прогноз победы», «официальные данные» или «полную историю», если это не доказано.

## 2. Название и trademark gate

До покупки рекламы проверьте:

- поиск в App Store/Google Play;
- домены и social handles;
- реестры товарных знаков в рынках запуска;
- Valve trademark/legal guidance;
- письменные лицензии на логотипы, hero art, league/team assets.

Упоминание игры для описания совместимости и использование чужого логотипа — разные вещи. Добавьте независимый disclaimer, но помните: disclaimer не исправляет нарушение прав.

Окончательный name/logo review требует юриста по IP, если продукт коммерческий.

## 3. Источник каждого визуального актива

Создайте `assets/rights-register.csv`:

```csv
asset,path,owner,license,commercial_use,attribution,proof,expiry
app_icon,assets/icon.png,Your Company,owned,yes,no,design-contract.pdf,
hero_portrait,...,...,...,...,...,...,...
```

Репозиторий Open Source может разрешать код, но не изображения/данные. Лицензия сайта также может отличаться для media assets.

Если права на Dota-графику не подтверждены, используйте собственную нейтральную визуальную систему: графики, геометрические role icons, текстовые названия в допустимой форме.

## 4. Screenshots как рассказ

Каждый screenshot отвечает на один вопрос:

1. Что я узнаю прямо сейчас?
2. Как найти матч/игрока?
3. Как сравнить пики и результат?
4. Насколько свежа мета?
5. Зачем watchlist/уведомления?

Используйте реальный интерфейс с разрешёнными/synthetic данными. Не показывайте персональные email, tokens, debug banners или чужие copyrighted broadcast screenshots.

Текст на screenshot должен быть крупным, кратким и локализованным. Проверьте safe areas и требуемые текущие размеры в каждой store console — они меняются.

## 5. Metadata

Подготовьте:

- app name/subtitle/short description;
- full description;
- keywords/category;
- privacy URL;
- support URL;
- marketing URL при наличии;
- release notes;
- reviewer contact и demo credentials;
- copyright owner;
- content/age rating answers.

Описание функции должно совпадать с текущей binary. Не рекламируйте premium-функцию, которой ещё нет.

## 6. Accessibility и локализация

Перед снимками:

- screen reader labels у кнопок и графиков;
- sufficient contrast;
- dynamic text без обрезки;
- цвет не единственный носитель результата;
- даты/timezone объяснимы;
- пустые/error/loading states понятны.

Если listing на русском, а интерфейс только английский, укажите это честно. Начните с одного качественного locale, затем добавляйте языки по спросу.

## 7. Review notes

Review note — инструкция человеку, который впервые видит продукт:

```text
- цель приложения;
- как войти в demo account;
- где увидеть матч/meta/watchlist;
- почему запрашиваются notifications;
- откуда данные и как показана freshness;
- как удалить аккаунт;
- как открыть premium sandbox, если он есть.
```

Не заставляйте reviewer ждать реальный будущий матч. Подготовьте стабильные permitted demo data.

## Практика

1. Напишите positioning и три проверяемых promises.
2. Заполните asset rights register.
3. Создайте icon без мелкого текста и чужого logo.
4. Сделайте screenshot story для Android/iOS.
5. Подготовьте reviewer notes и demo account.
6. Проведите accessibility smoke-test.

## Готово, если

- каждое обещание подтверждается приложением;
- у каждого asset есть право на коммерческое использование;
- screenshots не раскрывают private data;
- reviewer проходит core flow без вашей помощи;
- listing и интерфейс согласованы;
- accessibility blockers устранены.

## Официальные материалы

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Valve legal information](https://store.steampowered.com/legal/)

