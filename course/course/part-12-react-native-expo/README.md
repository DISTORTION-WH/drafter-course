# Часть 12. React Native и Expo

[← Часть 11. React](../part-11-react/README.md) · [Карта курса](../01-course-map.md)

## Что мы строим

Первую мобильную оболочку Dota Analyzer для Android и iOS:

- tabs «Матчи», «Мета», «Избранное»;
- stack-переход к деталям матча/героя/команды;
- виртуализированные списки;
- native loading/error/empty states;
- mock-данные через тот же API interface;
- TanStack Query для server state;
- Zustand только для client/UI state;
- безопасные границы хранения;
- доступная диаграмма меты.

Полное подключение production-like mobile к backend, generated OpenAPI client и environment URLs выполняется в части 13. Здесь важны native UI, navigation и state boundaries.

## Главы

1. [React Native, native UI и роль Expo](01-react-native-and-expo.md)
2. [Создание и запуск Expo-проекта](02-create-and-run-expo-project.md)
3. [Core components, StyleSheet, Flexbox и safe area](03-components-styles-layout.md)
4. [Expo Router: Stack, Tabs, параметры и links](04-expo-router-navigation.md)
5. [`FlatList`, refresh и производительность списков](05-flatlist-and-performance.md)
6. [TanStack Query: server state, focus и сеть](06-tanstack-query.md)
7. [Zustand и границы client state](07-zustand-client-state.md)
8. [SecureStore, persistence и offline](08-storage-and-offline.md)
9. [Графики, доступность и тестирование устройств](09-charts-accessibility-testing.md)
10. [Итоговая лабораторная: мобильная оболочка](10-final-mobile-lab.md)

## Стек части

- React Native, совместимый с текущим Expo SDK;
- Expo framework и Expo Router;
- strict TypeScript;
- TanStack Query;
- Zustand;
- Expo SecureStore только для небольших чувствительных значений;
- `FlatList` для длинных коллекций.

## Официальные справочники

- [React Native](https://reactnative.dev/docs/getting-started)
- [Создание Expo-проекта](https://docs.expo.dev/get-started/create-a-project/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [TanStack Query для React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

На 16 июля 2026 года текущая документация React Native показывает 0.86, а Expo SDK и совместимые native packages развиваются отдельно. Всегда устанавливайте Expo-модули через `expo install`, чтобы CLI выбрал совместимую версию.

[Перейти к части 13](../part-13-mobile-backend/README.md)
