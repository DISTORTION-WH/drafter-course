# Глава 2. Проект React + TypeScript через Vite

[← Глава 1](01-ui-as-component-tree.md) · [Оглавление](README.md) · [Глава 3 →](03-jsx-components-props.md)

## Создание проекта

Из корня учебного repository:

```powershell
pnpm create vite apps/web-lab --template react-ts
Set-Location apps/web-lab
pnpm install
pnpm dev
```

Откройте адрес, который напечатал Vite. Не угадывайте port, если он занят.

`create vite` создаёт файлы и зависимости. Template `react-ts` выбирает React + TypeScript. Реально установленные версии фиксируются `pnpm-lock.yaml`.

## Что находится в проекте

```text
apps/web-lab/
├─ index.html
├─ package.json
├─ tsconfig*.json
├─ vite.config.ts
├─ public/
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ App.css
   └─ assets/
```

- `index.html` содержит DOM root.
- `main.tsx` создаёт React root и помещает `App`.
- `.tsx` разрешает JSX внутри TypeScript.
- Vite dev server преобразует modules и обновляет страницу через HMR.

## Entry point

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Почему проверяем `null`: `getElementById` не гарантирует существование элемента. `StrictMode` в development помогает обнаруживать нечистый render/неправильный cleanup и может намеренно повторять некоторые действия.

## Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

`dev` не является production server. `build` создаёт статические assets. `preview` только локально проверяет build.

## Environment variables

Vite публикует в browser переменные с разрешённым prefix, обычно `VITE_`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:3000
```

Всё, что доступно frontend bundle, не секрет. Нельзя помещать provider API key или database password.

Parser:

```ts
function readApiBaseUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('VITE_API_BASE_URL is required');
  }
  return new URL(value);
}
```

## Структура feature

```text
src/
├─ app/
├─ api/
├─ features/matches/
├─ shared/components/
├─ shared/styles/
└─ test/
```

Не создавайте папку для каждого файла заранее. Начните с feature `matches`.

## Практика

Удалите demo logo/counter. Создайте `App`, который выводит heading «Dota Analyzer». Запустите `pnpm build`, а не только dev. Проверьте `git status`: `node_modules` и `dist` должны игнорироваться.

## Самопроверка

- [ ] Проект strict TypeScript собирается.
- [ ] Я понимаю роли `index.html`, `main.tsx`, `App.tsx`.
- [ ] Frontend environment не содержит secrets.
- [ ] `node_modules` и `dist` не коммитятся.
