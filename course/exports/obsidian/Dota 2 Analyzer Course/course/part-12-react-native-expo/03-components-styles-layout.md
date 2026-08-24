# Глава 3. Core components, StyleSheet, Flexbox и safe area

[← Глава 2](02-create-and-run-expo-project.md) · [Оглавление](README.md) · [Глава 4 →](04-expo-router-navigation.md)

## Первая карточка

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MatchCardProps = {
  match: MatchSummary;
  onPress: (id: string) => void;
};

export function MatchCard({ match, onPress }: MatchCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть матч ${match.radiantName} против ${match.direName}`}
      onPress={() => onPress(match.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.row}>
        <Text style={styles.teamName}>{match.radiantName}</Text>
        <Text style={styles.versus}>—</Text>
        <Text style={styles.teamName}>{match.direName}</Text>
      </View>
      <Text style={styles.meta}>Patch {match.patch ?? 'неизвестен'}</Text>
    </Pressable>
  );
}
```

`style` может быть object, array или callback для Pressable state. `pressed && styles.cardPressed` добавляет стиль только при true.

## StyleSheet

```tsx
const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#171a22',
  },
  cardPressed: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { flex: 1, color: '#ffffff', fontSize: 16 },
  versus: { color: '#aab0bf' },
  meta: { marginTop: 8, color: '#aab0bf' },
});
```

Числа — density-independent units, не строки `16px`. Некоторые CSS свойства отсутствуют/различаются. Проверяйте React Native style reference.

## Flexbox отличается defaults

`View` по умолчанию располагает детей колонкой (`flexDirection: 'column'`). Основные:

- `flexDirection` — главная ось;
- `justifyContent` — размещение по главной оси;
- `alignItems` — по поперечной;
- `flex: 1` — занять доступное место;
- `gap`, padding, margin.

Не задавайте фиксированную ширину экрана. Поддерживайте маленькие/большие устройства и split view/tablet.

## Safe area

Root/provider устанавливается по template. Screen content использует safe area context/insets или router-compatible container, чтобы не залезать под notch/status/home indicator. Не добавляйте hardcoded `paddingTop: 44`.

## ScrollView или FlatList

- `ScrollView` рендерит всех children — короткие формы/detail.
- `FlatList` виртуализирует длинные однотипные коллекции.

Нельзя оборачивать длинный FlatList в ScrollView той же ориентации: virtualization ломается.

## Theme tokens

```ts
export const colors = {
  background: '#0d0f14',
  surface: '#171a22',
  text: '#ffffff',
  muted: '#aab0bf',
  radiant: '#5fcf80',
  dire: '#ef6a6a',
} as const;
```

Сначала tokens, затем dark/light variants через `useColorScheme`. Не кодируйте winner только цветом.

## Images

Указывайте dimensions/aspect ratio, placeholder/error fallback и accessible label. Remote hero assets должны иметь разрешённый источник/cache policy. В учебной части используйте local placeholders.

## Практика

Соберите карточку на узком/широком экране, с длинными team names и системным font scale 200%. Текст не должен пропадать; при необходимости разрешите перенос, а не фиксированную высоту.

## Самопроверка

- [ ] Весь текст внутри `Text`.
- [ ] Layout не использует CSS px/className.
- [ ] Pressable имеет роль/label/pressed feedback.
- [ ] Safe area не hardcoded.
- [ ] Большой font scale не ломает карточку.
