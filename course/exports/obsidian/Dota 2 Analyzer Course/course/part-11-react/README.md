# Часть 11. Основы React и web-песочница

[← Часть 10. Аналитика](../part-10-analytics/README.md) · [Карта курса](../01-course-map.md) · [Часть 12. React Native/Expo →](../part-12-react-native-expo/README.md)

## Зачем web-песочница перед mobile

React и React Native используют одну модель компонентов, props, state и hooks. В браузере быстрее увидеть ошибку, изучить render и проверить логику интерфейса. После этой части мы заменим HTML-элементы на native-компоненты, но не будем заново учить React.

## Что мы строим

TypeScript-приложение со списком профессиональных матчей:

- карточки матчей;
- фильтр по patch;
- состояния loading/error/empty/success;
- выбор матча и панель деталей;
- ручное получение данных из нашего `/v1` API либо локального mock;
- component и integration tests.

## Главы

1. [Интерфейс как дерево компонентов](01-ui-as-component-tree.md)
2. [Проект React + TypeScript через Vite](02-vite-react-project.md)
3. [JSX, компоненты и props](03-jsx-components-props.md)
4. [Условия, списки и стабильные keys](04-conditions-lists-keys.md)
5. [События, state и render snapshot](05-events-state-render.md)
6. [Формы, структура state и lifting state up](06-forms-and-state-design.md)
7. [`useEffect`, внешние системы и cleanup](07-effects-and-cleanup.md)
8. [Загрузка API и custom hooks](08-api-and-custom-hooks.md)
9. [Доступность, тестирование и отладка](09-accessibility-and-testing.md)
10. [Итоговая лабораторная: web-список матчей](10-final-react-lab.md)

## Главное правило React

Компонент — функция, которая по текущим props и state вычисляет JSX. Render должен оставаться чистым: сеть, timers, DOM и другие внешние системы не запускаются прямо в теле вычисления.

## Официальные справочники

- [React Learn](https://react.dev/learn)
- [React с TypeScript](https://react.dev/learn/typescript)
- [Vite](https://vite.dev/guide/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

На 16 июля 2026 года официальная документация React показывает ветку 19.2, а Vite — 8.x. Проект создаётся через `latest` и фиксирует совместимые версии lockfile; номера не копируются вручную.
