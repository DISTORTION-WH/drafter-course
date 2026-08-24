# Часть 15. Тестирование и безопасность

Мы уже построили критический путь приложения: ingestion сохраняет матчи, API отдаёт аналитику, mobile показывает данные, пользователь входит через Steam, добавляет команду и получает push. Теперь нужно доказать, что этот путь продолжает работать после каждого изменения и не открывает очевидных способов украсть сессию или чужие данные.

## Результат части

```text
изменение кода
  -> format/lint/typecheck
  -> быстрые unit tests
  -> integration tests с настоящим PostgreSQL/Redis
  -> backend HTTP E2E
  -> mobile component tests
  -> device E2E критического пути
  -> security/dependency checks
  -> проверенный backup restore
```

## Главы

1. [Стратегия тестирования и критические пути](01-testing-strategy-pyramid.md)
2. [Unit-тесты с Vitest](02-vitest-unit-tests.md)
3. [Integration-тесты с Testcontainers](03-integration-testcontainers.md)
4. [Contract fixtures и совместимость API](04-contract-fixtures-api.md)
5. [Backend E2E и критический путь](05-backend-e2e-critical-path.md)
6. [React Native Testing Library](06-mobile-rntl.md)
7. [Device E2E с Maestro](07-maestro-device-e2e.md)
8. [Security controls: ввод, SQL, rate limits и секреты](08-security-controls.md)
9. [Backup/restore и dependency security](09-backup-dependencies-security-ci.md)
10. [Итоговая лабораторная качества и безопасности](10-final-quality-security-lab.md)

## Что не является хорошей целью

- «Получить 100% coverage» без проверки поведения.
- Замокать PostgreSQL в тесте repository и назвать это integration test.
- Запускать настоящий Steam/OpenDota из обычного CI.
- Проверять implementation details React-компонента вместо действий пользователя.
- Полагаться только на mobile-валидацию.
- Считать backup готовым, пока restore ни разу не выполнен.
- Считать dependency scanner автоматическим доказательством безопасности.

## Стек части

- Vitest для быстрых unit/service tests;
- Testcontainers for Node.js для PostgreSQL/Redis integration;
- Nest testing utilities и настоящий HTTP adapter для backend E2E;
- React Native Testing Library для JS/component поведения mobile;
- Maestro для небольшого набора device flows;
- OpenAPI/fixtures для контрактов;
- PostgreSQL constraints как последняя линия целостности;
- CI security checks, secret scanning и проверяемый restore.

Команды и API инструментов меняются. Фиксируйте версии lockfile, храните конфигурацию в репозитории и сверяйте примеры с типами установленной версии.

## Навигация

- [Назад: часть 14 — Steam, watchlist и push](../part-14-auth-steam-notifications/README.md)
- [Дальше: часть 16 — Docker, CI/CD и production](../part-16-docker-cicd-production/README.md)

