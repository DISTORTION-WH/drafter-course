# Файл `package.json`

Исходный путь в учебном комплекте: `course/part-04-typescript/examples/dota-history-cli-ts/package.json`.

```json
{
  "name": "dota-history-cli-ts",
  "version": "1.0.0",
  "description": "Учебный TypeScript CLI-анализатор истории профессиональных матчей Dota 2",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.7.0",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "start": "pnpm run build && node dist/src/index.js",
    "test": "pnpm run build && node --test dist/test/*.test.js"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "7.0.2"
  }
}

```