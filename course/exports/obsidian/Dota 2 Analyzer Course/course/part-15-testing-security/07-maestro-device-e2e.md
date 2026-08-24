# Глава 7. Device E2E с Maestro

## 1. Что добавляет device E2E

Maestro управляет собранным приложением на emulator/simulator/device. Он проверяет то, чего нет в component test:

- приложение установилось и запускается;
- native navigation/layout доступны;
- deep link попадает в правильный route;
- keyboard и system back не ломают flow;
- development/preview build подключён к нужному API;
- permission/cold start ведут себя ожидаемо;
- JavaScript bundle совместим с native runtime.

Не переносите в Maestro все edge cases: device suite станет медленной и flaky.

## 2. Стабильная среда

Используйте отдельное E2E/staging окружение:

- deterministic seed dataset;
- тестовые accounts/identity adapter;
- отключённые реальные массовые push;
- clock/test event control;
- отдельные DB/Redis/object storage;
- быстрый reset конкретного test tenant/namespace;
- build с явным banner `E2E`.

Никогда не очищайте production из test endpoint.

## 3. Flow file

Maestro flows — YAML. Структура:

```yaml
appId: com.example.dotaanalyzer.e2e
name: Guest opens match details
---
- launchApp:
    clearState: true
- assertVisible: "Матчи"
- tapOn:
    id: "match-card-8173564281"
- assertVisible: "8173564281"
- assertVisible: "Team Spirit"
```

Точные команды и селекторы сверяйте с установленной Maestro CLI. `appId` E2E-сборки отличается от production.

## 4. testID и доступность

Стабильный `testID`:

```tsx
<Pressable
  testID={`match-card-${match.id}`}
  accessibilityRole="button"
  accessibilityLabel={`Открыть матч ${radiantName} против ${direName}`}
>
```

Не привязывайтесь к координатам. Текстовый selector хорош для ключевого UX, но локализация может потребовать testID. Селектор не должен содержать секрет или нестабильный index списка.

## 5. Subflows

```text
.maestro/
  config.yaml
  flows/
    guest-match.yaml
    auth-watchlist.yaml
    notification-deeplink.yaml
  subflows/
    reset-seed.yaml
    login-test-user.yaml
```

Повторяемые действия выносятся в subflow, но не создавайте скрытую программу из сотен conditional YAML-команд. Сложную подготовку лучше выполнить через контролируемый test API/admin job.

## 6. Auth без автоматизации чужого пароля

Не храните Steam password и не автоматизируйте production Steam UI. В E2E environment backend использует отдельный test identity adapter, доступный только внутри тестовой инфраструктуры, который возвращает фиксированную identity через тот же exchange/session code.

Отдельный редкий manual staging test подтверждает настоящий Steam OpenID flow.

## 7. Deep link flow

```yaml
appId: com.example.dotaanalyzer.e2e
---
- launchApp:
    clearState: false
- openLink: "https://e2e-app.example.com/matches/8173564281"
- assertVisible: "Team Spirit"
```

Отдельно проверьте malformed/unknown link: приложение открывает безопасный fallback и не падает.

## 8. Push flow

Полный внешний push не нужен для каждого PR. Разделите:

1. backend integration тестирует event → ticket/receipt adapter;
2. device flow открывает notification/deep link payload;
3. scheduled staging smoke один раз проверяет реальный Expo/FCM/APNs delivery на physical test device.

Так сбой APNs не блокирует каждое изменение domain code.

## 9. Борьба с flaky tests

- ждать видимый state, не sleep;
- deterministic seed;
- один flow — одна цель;
- reset состояния до flow;
- видео/screenshot/log artifact при ошибке;
- rerun использовать для диагностики, не скрытия стабильного дефекта;
- измерять flaky rate;
- quarantined test имеет владельца и срок исправления;
- emulator/device/OS image фиксированы.

## 10. CI tiers

```text
PR:       1–3 Android smoke flows
main:     полный критический Android suite + выбранный iOS simulator suite
nightly:  больше OS/device variants, real staging integrations
release:  production-like build, store beta, manual checklist
```

Это пример. Бюджет и платформы определяют фактическую матрицу.

## 11. Практика

Создайте flows:

- guest открывает матч;
- применяет team filter;
- test user входит и добавляет команду;
- app restart восстанавливает session;
- notification link открывает матч;
- logout очищает private data;
- invalid deep link не вызывает crash.

Официальный справочник: [Maestro Flows](https://docs.maestro.dev/maestro-flows).

[Предыдущая глава](06-mobile-rntl.md) · [Оглавление](README.md) · [Следующая глава](08-security-controls.md)

