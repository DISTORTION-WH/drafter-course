# 3. `.gitignore`, generated files и защита secrets

## Результат главы

Вы научитесь:

- понимать назначение `.gitignore`;
- читать основные ignore patterns;
- проверять правило через `git check-ignore`;
- отличать ignored от уже tracked файла;
- хранить `.env.example`, но не настоящий `.env`;
- правильно действовать при случайной публикации secret;
- создавать отдельный commit с правилами repository hygiene.

Практика продолжается в `practice/dota-history-git`.

## 1. Зачем нужен `.gitignore`

Project directory содержит не только исходники. В ней появляются:

- установленные packages;
- compiled output;
- coverage reports;
- logs;
- local configuration;
- editor metadata;
- operating-system files;
- credentials.

Большинство из них не должно попадать в repository.

Файл `.gitignore` описывает intentionally untracked paths, которые Git не должен постоянно предлагать для добавления.

Для Node.js проекта:

```gitignore
node_modules/
dist/
coverage/
*.log
```

## 2. Ignore не означает удаление

Правило:

```gitignore
dist/
```

не удаляет `dist`, не запрещает программе писать туда и не очищает диск. Оно только влияет на то, как Git рассматривает matching untracked paths.

После build директория продолжает существовать, но `git status` не показывает её как новый content.

## 3. Ignore не влияет на уже tracked файл

Это одно из важнейших правил Git:

> `.gitignore` применяется к intentionally untracked files. Уже tracked path не перестаёт отслеживаться только потому, что появился matching pattern.

Проверить tracked paths:

```powershell
git ls-files
```

Если `dist/report.js` уже committed, добавление `dist/` в `.gitignore` не исключит его из будущих diffs.

Осознанное прекращение tracking выполняют отдельно:

```powershell
git rm --cached -- dist/report.js
```

Команда stages удаление path из repository snapshot, но оставляет working file на диске. После неё нужно проверить status и commit.

Не применяйте рекурсивные варианты к незнакомому path. Сначала выполните:

```powershell
git status
git ls-files -- dist
```

и убедитесь, что понимаете будущий diff.

## 4. Где действуют rules

`.gitignore` в корне repository действует на весь project tree.

Вложенный `.gitignore` может задавать правила для своей директории. Git также поддерживает local exclude в `.git/info/exclude` и global ignore пользователя.

Для командного проекта правила, необходимые всем разработчикам, хранят в committed `.gitignore`. Личные editor-файлы удобнее исключать global rule, если команда не договорилась иначе.

## 5. Основные patterns

### Конкретное имя

```gitignore
.env
```

Игнорирует `.env` на подходящих уровнях.

### Директория

```gitignore
node_modules/
```

Slash в конце подчёркивает, что rule относится к directories.

### Расширение

```gitignore
*.log
```

`*` соответствует любому количеству characters внутри segment.

### Только корень repository

```gitignore
/temp/
```

Leading slash привязывает pattern к директории текущего `.gitignore`. В корневом `.gitignore` это именно root `temp`, а не любой вложенный `temp`.

### Любая глубина

```gitignore
**/generated/
```

`**` может проходить через directory levels.

### Исключение из ignore

```gitignore
.env.*
!.env.example
```

Сначала игнорируются `.env.local`, `.env.production` и подобные paths, затем `.env.example` разрешается отслеживать.

Важно: чтобы вернуть файл из ignored directory, иногда нужно также разрешить его parent directories. Negation rules читаются сверху вниз, и последнее подходящее правило имеет значение внутри одного уровня precedence.

### Comment

```gitignore
# Local environment files
.env
```

Строка с `#` — comment. Если имя действительно начинается с `#`, символ нужно escape, но такие имена лучше не использовать.

## 6. Рекомендуемый `.gitignore` проекта

Откройте существующий `.gitignore` и приведите его к понятной форме:

```gitignore
# Installed dependencies
node_modules/

# Compiled output and test reports
dist/
coverage/

# Local environment and secrets
.env
.env.*
!.env.example

# Logs
*.log

# Operating system files
.DS_Store
Thumbs.db
```

Comments объясняют причину группы rules.

Не копируйте огромный generic template без чтения. Избыточное правило может скрыть важный source file.

## 7. Диагностика `git check-ignore`

Проверить path:

```powershell
git check-ignore -v node_modules/example.js
git check-ignore -v dist/src/index.js
git check-ignore -v .env
```

Пример результата:

```text
.gitignore:9:.env  .env
```

Он сообщает:

- файл с rule;
- номер строки;
- pattern;
- проверяемый path.

Если output пуст:

- path не ignored;
- или path уже tracked и обычный режим его не показывает как ignored;
- или pattern написан не так, как вы предполагаете.

Для подробной диагностики tracked/non-matching paths существует `--no-index`, но в первых упражнениях достаточно сопоставить `git ls-files`, `git status` и обычный `git check-ignore -v`.

## 8. Что такое secret

Secret — значение, дающее доступ к системе или данным:

- API key;
- access token;
- database password;
- private key;
- session secret;
- signing credential;
- production connection string.

Обычный configuration value, например `PORT=3000`, не обязательно secret. Но смешанный `.env` обычно игнорируют целиком.

Пример реального `.env`, который нельзя commit:

```dotenv
DATABASE_URL=postgresql://user:password@host/database
OPENDOTA_API_KEY=real-secret-value
```

В курсе никогда не вставляйте реальные значения даже в упражнение.

## 9. `.env.example`

Команде всё равно нужно знать имена variables. Для этого создают безопасный template:

```dotenv
DATABASE_URL=
OPENDOTA_API_KEY=
```

Или с явно фиктивными local values:

```dotenv
APP_PORT=3000
LOG_LEVEL=debug
```

`.env.example`:

- committed;
- не содержит credentials;
- документирует required variables;
- обновляется вместе с configuration code.

Настоящий `.env`:

- ignored;
- создаётся локально;
- не отправляется в chat, issue или screenshot;
- production secrets хранятся в secret manager platform.

## 10. Практика с заведомо фиктивным значением

Создайте `.env` через VS Code:

```dotenv
TRAINING_ONLY_VALUE=not-a-secret
```

Проверьте:

```powershell
git status --short
git check-ignore -v .env
```

`.env` не должен появиться в status, а `git check-ignore` должен показать rule.

Создайте `.env.example`:

```dotenv
TRAINING_ONLY_VALUE=
```

Проверьте:

```powershell
git status --short
git check-ignore -v .env.example
```

`.env.example` должен появиться как untracked, а check-ignore не должен считать его ignored благодаря negation rule.

## 11. Commit hygiene rules

Проверьте diff:

```powershell
git diff -- .gitignore
```

Stage только public-safe files:

```powershell
git add .gitignore .env.example
git diff --staged
```

Убедитесь, что `.env` отсутствует, затем:

```powershell
git commit -m "Define ignored files and environment template"
```

После commit:

```powershell
git status --short
git ls-files -- .env .env.example
```

В tracked list должен присутствовать `.env.example`, но не `.env`.

## 12. Если secret только staged

Не создавайте commit. Уберите path из staging:

```powershell
git restore --staged .env
```

Добавьте ignore rule и снова проверьте:

```powershell
git status
git diff --staged
git check-ignore -v .env
```

Сам secret не нужно удалять с диска, если он необходим локальному приложению. Нужно исключить его из Git snapshot.

## 13. Если secret уже committed локально

Сначала определите, был ли commit куда-либо pushed или передан другому человеку.

Если точно не был shared, можно исправить local history, но новичку лучше остановиться и проверить ситуацию вместе с наставником. Простое удаление файла в следующем commit оставляет secret в предыдущем snapshot.

Если есть хотя бы вероятность публикации, считайте secret compromised.

## 14. Если secret попал в remote

Правильный порядок:

1. немедленно revoke/rotate credential у provider;
2. проверить logs использования;
3. удалить secret из текущего code;
4. при необходимости очистить history специальной процедурой;
5. уведомить команду;
6. добавить prevention: ignore, secret scanning, review.

Очистка Git history не возвращает доверие старому credential. Копии могли остаться в clones, caches, forks или logs. Поэтому rotation — первый шаг.

Никогда не публикуйте сам secret в сообщении о проблеме.

## 15. `.gitignore` не является security boundary

Developer всё ещё может выполнить forced add:

```powershell
git add -f .env
```

Или вставить key прямо в `.ts`.

Защита состоит из нескольких уровней:

```text
.gitignore
→ pre-commit/secret scanning
→ code review
→ protected branches
→ short-lived credentials
→ provider monitoring and rotation
```

## 16. Контрольные вопросы

1. Удаляет ли `.gitignore` matching files?
2. Почему tracked file продолжает отображаться после добавления rule?
3. Чем `.env` отличается от `.env.example`?
4. Что означает `!` в pattern?
5. Как узнать, какое rule игнорирует path?
6. Почему `node_modules` не commit?
7. Что делать первым после публикации API key?
8. Почему удаления secret новым commit недостаточно?
9. Может ли `.gitignore` гарантировать отсутствие secrets?
10. Зачем comments внутри `.gitignore`?

## Definition of Done

- `.gitignore` разделён на понятные группы;
- `node_modules`, `dist`, coverage, logs и local env ignored;
- `.env.example` tracked и не содержит secrets;
- настоящий `.env` не staged и не tracked;
- `git check-ignore -v` объясняет выбранные rules;
- hygiene change оформлен отдельным commit;
- вы знаете incident-порядок: rotate, investigate, clean history, prevent.

Официальные справочники: [gitignore](https://git-scm.com/docs/gitignore), [git check-ignore](https://git-scm.com/docs/git-check-ignore.html).

