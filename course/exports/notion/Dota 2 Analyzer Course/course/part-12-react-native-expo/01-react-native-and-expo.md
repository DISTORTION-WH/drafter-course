# Глава 1. React Native, native UI и роль Expo

[← Оглавление](README.md) · [Глава 2 →](02-create-and-run-expo-project.md)

## Что переносится из React

Без изменений по смыслу:

- function components;
- JSX;
- props;
- state и render snapshot;
- hooks;
- one-way data flow;
- immutable updates;
- component composition.

Меняется renderer и platform APIs.

## DOM здесь нет

Web:

```tsx
<div><h1>Матчи</h1><button>Открыть</button></div>
```

React Native:

```tsx
import { Pressable, Text, View } from 'react-native';

<View>
  <Text accessibilityRole="header">Матчи</Text>
  <Pressable accessibilityRole="button" onPress={handlePress}>
    <Text>Открыть</Text>
  </Pressable>
</View>
```

Нельзя использовать `div`, `className`, browser DOM events или обычный CSS file. Весь текст должен находиться внутри `Text`.

## Native components

`View`, `Text`, `Image`, `TextInput`, `ScrollView`, `FlatList`, `Pressable` описывают native views на Android/iOS. React Native bridge/new architecture управляет связью JavaScript и native runtime; прикладному коду не нужно вручную создавать Android View/iOS UIView.

## Platform differences

Один JSX не гарантирует одинаковый экран:

- fonts и text metrics;
- back gesture/button;
- keyboard behavior;
- permissions;
- safe areas/notches;
- shadows;
- date pickers;
- accessibility APIs;
- network address emulator/device.

Тестируйте обе платформы, а не только web preview.

## Зачем Expo

Официальная React Native документация рекомендует framework для нового приложения. Expo предоставляет:

- project tooling;
- совместимый набор native libraries;
- file-based routing;
- development builds;
- configuration plugins;
- build/update services как отдельные возможности.

Expo не означает «игрушка без native кода». Если понадобится Clarity/replay parser, он всё равно останется server-side; mobile не должен выполнять Java parser.

## Expo Go и development build

- Expo Go быстро запускает код, но содержит фиксированный набор native modules и имеет ограничения.
- Development build — собственная debug-версия приложения с вашими native dependencies/config plugins.

Начать можно с Expo Go, но production-подобную разработку переводите на development build, когда появляются native modules/config.

## JavaScript bundle не хранит секрет

Любое значение, встроенное в bundle или `EXPO_PUBLIC_*`, извлекается пользователем. Provider API key остаётся на backend. SecureStore хранит user token после выдачи server, но не скрывает общий application secret от владельца устройства.

## Архитектура mobile

```text
routes/screens
→ feature components
→ hooks/use cases
→ API interface + query cache
→ backend

client UI state → Zustand
tokens → SecureStore
large non-secret cache → AsyncStorage/SQLite policy
```

## Практика

Возьмите web components части 11 и для каждого найдите native analog. Отметьте то, чего нет: DOM focus, CSS hover, URL browser history. Выпишите platform alternative.

## Самопроверка

- [ ] React и React Native — не одно и то же, но используют общую component model.
- [ ] HTML/CSS/DOM API не копируются в native.
- [ ] Expo Go отличается от development build.
- [ ] Bundle/public env не считается secret.
- [ ] Тестирование охватывает Android и iOS.
