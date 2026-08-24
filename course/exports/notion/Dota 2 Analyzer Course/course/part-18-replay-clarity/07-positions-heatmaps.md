# Глава 7. Позиции и heatmap

## 1. Позиция находится в entity state

Clarity восстанавливает networked entities из replay messages. Hero position берётся из подходящих entity properties/coordinate components, имена и representation которых зависят от engine/build/send tables.

Нельзя зашить property path после проверки одного replay и считать вечным. Extractor выбирается по engine/build и проходит golden tests.

## 2. Position sample

```ts
type HeroPositionSample = {
  matchId: string;
  tick: number;
  gameTimeSeconds: number;
  playerSlot: number;
  heroId: string;
  team: 'radiant' | 'dire';
  xWorld: number;
  yWorld: number;
  alive: boolean;
  isIllusion: boolean;
  extractorVersion: number;
  mapTransformVersion: number;
};
```

Для первой версии сохраняем только реальных героев с подтверждённым player slot. Illusions можно учитывать отдельным artifact позже.

## 3. Sampling

Entity updates приходят не через строго одинаковые интервалы. Для аналитики создаём sample в регулярной game-time/tick сетке, например раз в 1 секунду — это config, а не вечная константа.

Правило:

```text
на target sample time
-> взять последнее известное valid position не старше max staleness
-> если данных нет/stale/dead по policy -> missing или отдельный state
-> не записывать (0,0)
```

Interpolation разрешается только с documented max gap и не пересекает смерть/teleport без специальной логики.

## 4. Coordinate systems

- world coordinates из replay;
- map-normalized coordinates `[0,1]`;
- heatmap grid coordinates;
- screen pixels.

Transform version содержит bounds/origin/axis direction/map version:

```ts
type MapTransform = {
  version: number;
  mapId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  invertY: boolean;
};
```

```ts
normalizedX = (xWorld - minX) / (maxX - minX)
normalizedY = (yWorld - minY) / (maxY - minY)
```

Clamp только для tiny floating error; большая координата за bounds — quality warning, а не молчаливое прилипание к краю.

## 5. Проверяем transform

Golden landmarks:

- Radiant/Dire fountain;
- rune locations;
- lane points;
- Roshan pit/major map landmarks с patch version;
- known hero movement segment.

Визуально наложите trajectory на licensed/versioned map asset. Ошибка inversion/offset сразу видна.

## 6. Heatmap grid

```ts
cellX = floor(normalizedX * columns)
cellY = floor(normalizedY * rows)
```

Для normalized `1.0` выберите boundary rule, например cap `columns - 1` только после validation.

Aggregate:

```text
samples_count
exposure_seconds
unique_matches
unique_player-match units
```

Heatmap только counts вводит в заблуждение при разной длительности/числе матчей. Показывайте denominator и sample size.

## 7. Фильтры

- patch/map transform;
- team side;
- role/hero/player;
- game phase/time window;
- wins/losses;
- tournament tier;
- alive/dead policy.

Каждый filter снижает sample. UI показывает период, match count и freshness.

## 8. Smoothing

Gaussian/kernel smoothing улучшает визуал, но меняет representation:

- raw grid сохраняется;
- kernel/radius versioned;
- mass normalization проверяется;
- края обрабатываются явно;
- accessible table/top zones доступна без цвета.

Не выдавайте сглаженный цвет как точное местоположение.

## 9. Storage/API

Raw samples могут быть большими. Первая версия:

- compressed artifact в object storage;
- per-match small summary PostgreSQL;
- pre-aggregated heatmap по ограниченным dimensions;
- API отдаёт grid/bounds/denominator/version, не миллионы positions.

ClickHouse появится в части 19 при реальном объёме.

## 10. Практика

Извлеките trajectories одного golden replay, проверьте landmarks, постройте 32×32 grid и accessible summary. Смените transform/sampling config и убедитесь, что config hash/output version меняются.

[Предыдущая глава](06-combat-log.md) · [Оглавление](README.md) · [Следующая глава](08-corrupted-replays-security.md)

