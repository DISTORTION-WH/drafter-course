# Глава 4. Sample size, Wilson interval и shrinkage

[← Глава 3](03-patch-windows-and-filters.md) · [Оглавление](README.md) · [Глава 5 →](05-sql-aggregations.md)

## Почему `100%` может ничего не значить

Герой с 1 победой из 1 имеет raw win rate 100%, но данных мало. Герой с 90/100 имеет 90% и намного более устойчивую оценку. Всегда показывайте `wins`, `games` и uncertainty.

## Минимальный sample

`minPicks` скрывает/помечает строки с малым sample, но threshold не делает оставшиеся значения истинными. Выберите default как product policy, возвращайте его в filters и разрешайте исследовательскому UI менять в безопасном диапазоне.

Лучше `insufficientSample: true`, чем молча удалить всё: пользователь понимает причину.

## Wilson score interval

Для бинарных wins/losses нормальная формула `p ± 1.96*sqrt(...)` плохо ведёт себя при малом n/около 0/1. Wilson interval лучше для описательного UI.

Пусть:

```text
n = games
p = wins / n
z = 1.96 для приблизительного 95% interval
denominator = 1 + z²/n
center = (p + z²/(2n)) / denominator
margin = z * sqrt(p(1-p)/n + z²/(4n²)) / denominator
lower = center - margin
upper = center + margin
```

При `n=0` rate и interval — `null`, не 0.

## TypeScript implementation

```ts
export function wilsonInterval(
  successes: number,
  trials: number,
  z = 1.96,
): { lower: number; upper: number } | null {
  if (!Number.isInteger(successes) || !Number.isInteger(trials)) {
    throw new Error('successes and trials must be integers');
  }
  if (trials < 0 || successes < 0 || successes > trials) {
    throw new Error('expected 0 <= successes <= trials');
  }
  if (trials === 0) return null;

  const p = successes / trials;
  const zSquared = z * z;
  const denominator = 1 + zSquared / trials;
  const center = (p + zSquared / (2 * trials)) / denominator;
  const margin =
    (z * Math.sqrt(
      (p * (1 - p)) / trials + zSquared / (4 * trials * trials),
    )) / denominator;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}
```

Проверка input обязательна, иначе `successes > trials` создаёт бессмысленный корень/результат.

## Что interval не доказывает

Matches не являются идеально независимой случайной выборкой: команды, opponents, tournament и patch day связаны. Wilson отражает binomial sampling approximation, но не исправляет selection bias/confounding.

## Bayesian shrinkage, опционально

Для ranking можно использовать отдельную оценку:

```text
shrunkWinRate = (wins + priorStrength × priorMean)
                / (games + priorStrength)
```

`priorMean`/`priorStrength` должны быть versioned и объяснены. Не называйте shrunk estimate обычным raw win rate. Raw `wins/games` всегда доступен.

## Sorting

Сортировать по raw win rate при малом sample опасно. Варианты:

- minimum sample + raw rate;
- Wilson lower bound;
- shrunk estimate;
- contest rate для meta prominence.

Endpoint sort key явно говорит, что используется.

## Практика

Напишите tests Wilson для `0/0`, `0/1`, `1/1`, `50/100`, invalid inputs. Сравните ширину interval `1/1`, `10/10`, `90/100` и объясните результат.

## Самопроверка

- [ ] Rate сопровождается numerator/denominator.
- [ ] `n=0` возвращает `null`.
- [ ] Interval не объявлен causal guarantee.
- [ ] Shrinkage отделён от raw rate и versioned.
- [ ] Ranking policy документирована.
