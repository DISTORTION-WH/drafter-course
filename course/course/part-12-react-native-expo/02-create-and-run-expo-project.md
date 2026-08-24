# Глава 2. Создание и запуск Expo-проекта

[← Глава 1](01-react-native-and-expo.md) · [Оглавление](README.md) · [Глава 3 →](03-components-styles-layout.md)

## Создание

Из корня repository:

```powershell
pnpm dlx create-expo-app@latest apps/mobile
Set-Location apps/mobile
pnpm install
pnpm expo start
```

Если generator предлагает template, выберите текущий default с Expo Router и TypeScript. Не запускайте второй `git init` внутри monorepo.

## Способы запуска

После `expo start`:

- Android emulator;
- iOS Simulator на macOS;
- Expo Go на физическом устройстве для совместимых функций;
- web как вспомогательная проверка, но не замена native;
- development build позже.

Windows не запускает локальный iOS Simulator/Xcode. iOS build можно делать через macOS или облачный EAS в production-части.

## Сеть устройства

`127.0.0.1` внутри телефона — сам телефон, не компьютер. Варианты:

- Android emulator обычно имеет специальный host alias;
- iOS simulator часто видит host иначе;
- physical device использует LAN IP компьютера;
- tunnel помогает Metro, но не автоматически вашему private backend.

В части 13 создадим environment-specific resolver. Пока fixture API не зависит от LAN.

## Структура Router-проекта

```text
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  └─ index.tsx
├─ assets/
├─ src/
│  ├─ features/
│  ├─ shared/
│  ├─ api/
│  └─ state/
├─ app.json или app.config.ts
├─ package.json
└─ tsconfig.json
```

Папка `app` содержит routes/layouts. Большую business logic держите в `src`, иначе routing tree превратится в свалку.

## Проверка TypeScript

Добавьте script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

Expo config extends совместимую базу. Не меняйте target/module на backend-настройки NodeNext.

## Установка packages

Expo/native module:

```powershell
pnpm expo install expo-secure-store expo-network
```

Pure JS library:

```powershell
pnpm add @tanstack/react-query zustand
```

`expo install` проверяет совместимость с SDK. После native config/plugin иногда нужен новый development build, одного Metro restart мало.

## Cache troubleshooting

Если module resolution странный:

```powershell
pnpm expo start --clear
```

Не очищайте всё подряд первым действием. Сначала прочитайте первую error, проверьте package и import.

## Configuration

`app.json/app.config.ts` задаёт name, slug, schemes, icons, bundle identifiers и plugins. Изменения native configuration требуют rebuild. Не меняйте application ID после публикации как обычное имя: stores считают это другим app.

## Практика

Запустите default app минимум на одном native target и web. Измените heading. Выполните `pnpm typecheck`. Запишите OS/device/Expo mode в журнал курса.

## Самопроверка

- [ ] Проект создан внутри общего repository без nested Git.
- [ ] Typecheck проходит.
- [ ] Я понимаю адрес `localhost` на устройстве.
- [ ] Native modules ставятся через `expo install`.
- [ ] Router files отделены от feature logic.
