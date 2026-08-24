# Глава 9. Графики, доступность и тестирование устройств

[← Глава 8](08-storage-and-offline.md) · [Оглавление](README.md) · [Глава 10 →](10-final-mobile-lab.md)

## Первый график без тяжёлой библиотеки

Для top hero contest rate достаточно accessible bar:

```tsx
type RateBarProps = {
  label: string;
  rate: number;
  sample: number;
};

export function RateBar({ label, rate, sample }: RateBarProps) {
  const clampedRate = Math.max(0, Math.min(1, rate));
  const percent = Math.round(clampedRate * 1000) / 10;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: contest rate ${percent} процентов, выборка ${sample}`}
      style={styles.chartRow}
    >
      <Text>{label}</Text>
      <View style={styles.track} accessibilityElementsHidden>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text>{percent}% · n={sample}</Text>
    </View>
  );
}
```

В зависимости от текущих typings percentage width может требовать literal/type helper. Validate finite rate до component. Bar имеет text equivalent; цвет не единственный носитель.

## Когда chart library

Нужна для axes, interactions, zoom, many series. Перед выбором проверьте:

- совместимость с текущим Expo/new architecture;
- maintenance/licence;
- accessibility;
- bundle/native dependencies;
- performance на реальном устройстве;
- screenshots/export.

Не добавляйте library ради пяти bars.

## Accessibility

- `accessibilityRole`, label, hint/state там, где native текст недостаточен;
- buttons/links имеют понятные names;
- selected tab/filter сообщает state;
- dynamic type/font scale;
- contrast light/dark;
- touch target около platform guideline, `hitSlop` при необходимости;
- reduced motion;
- screen reader order логичен;
- loading/error changes объявляются уместно, без спама.

Не группируйте всю сложную карточку в один inaccessible blob, если внутри отдельные actions.

## Platform testing matrix

Минимум:

- Android emulator и физическое устройство;
- iOS simulator/device, когда доступен;
- маленький/большой экран;
- portrait и поддерживаемая orientation;
- light/dark;
- font scale 100/200%;
- TalkBack/VoiceOver;
- slow/offline network;
- cold start/background/resume;
- reduced motion.

## Component tests

Используйте React Native Testing Library по актуальной Expo setup. Ищите role/label/text, нажимайте через user event. Не тестируйте StyleSheet object implementation, если product behavior не зависит от него.

```tsx
expect(screen.getByRole('button', { name: /открыть матч/i })).toBeTruthy();
```

## Navigation tests

Route component можно тестировать с mocked params/router boundary. Critical paths позже E2E через Maestro: открыть app → выбрать match → увидеть detail → back → filter meta.

## Performance

Измеряйте release/development build правильно: dev logging/StrictMode отличаются. Проверяйте JS/UI frames, slow renders, image memory, list blank areas, startup. `memo/useMemo/useCallback` добавляйте по profiler.

## Crash/error

Mobile error boundary показывает fallback/restart action и отправляет safe report. Native crash не ловится React boundary — нужен native-aware crash reporting в production-части.

## Практика

Создайте 5 rate bars с `n`. Пройдите TalkBack/VoiceOver: каждая строка должна сообщать hero, metric, percent и sample. Отключите цветное заполнение — смысл должен сохраниться.

## Самопроверка

- [ ] Chart имеет текстовый эквивалент/sample.
- [ ] Цвет не единственный код.
- [ ] Font scale/screen reader/темы проверены.
- [ ] Tests проверяют пользовательское поведение.
- [ ] Performance измеряется на native target.
