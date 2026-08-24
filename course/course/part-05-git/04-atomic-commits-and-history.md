# 4. Атомарные commits и читаемая история

## Результат главы

Вы научитесь превращать набор файловых изменений в последовательность небольших, проверяемых commits.

## 1. Commit отвечает на один вопрос

Хороший commit можно закончить фразой:

> Этот commit делает одно законченное изменение: ...

Примеры:

- добавляет parser CLI option;
- добавляет tests этого parser;
- исправляет округление win rate;
- документирует environment setup.

Плохая смесь:

```text
Добавить option, переименовать 40 файлов, обновить dependency,
переформатировать проект и исправить случайный typo
```

Такой diff трудно review, test и revert.

## 2. Atomic не означает «одна строка»

Commit может изменить несколько файлов, если они образуют один результат:

```text
src/cli/parse-options.ts
test/parse-options.test.ts
README.md
```

Если code без test не завершён, они могут быть одним commit. В другой команде предпочитают отдельный test commit. Важна понятная граница и работоспособное состояние.

## 3. Разделяем изменения по намерению

Перед staging:

```powershell
git status --short
git diff --stat
git diff
```

Составьте список намерений:

```text
1. Document typecheck command.
2. Change report title.
3. Remove accidental debug output.
```

Затем stage paths первого намерения, commit, и переходите к следующему.

## 4. Selective staging по path

```powershell
git add README.md
git diff --staged
git commit -m "Document TypeScript check command"
```

Остальные modified files остаются в working tree.

Проверьте:

```powershell
git status --short
```

## 5. Selective staging внутри одного файла

Иногда в одном файле два несвязанных изменения. Интерактивный режим:

```powershell
git add -p README.md
```

Git показывает hunk и варианты. Основные:

- `y` — stage этот hunk;
- `n` — не stage;
- `s` — попытаться split на меньшие hunks;
- `q` — закончить;
- `?` — показать help.

После interactive staging обязательно:

```powershell
git diff --staged -- README.md
git diff -- README.md
```

Первая команда показывает выбранную часть, вторая — оставшуюся.

Не используйте interactive staging, если не понимаете показанный patch. Иногда безопаснее временно отредактировать файл так, чтобы оставить одно намерение, commit, затем вернуть второе изменение.

## 6. Проверка whitespace ошибок

```powershell
git diff --check
git diff --staged --check
```

Команда помогает найти trailing whitespace и некоторые malformed whitespace changes. Она не заменяет formatter или linter.

## 7. Проверки перед commit

Для TypeScript-проекта:

```powershell
pnpm run typecheck
pnpm test
```

Затем:

```powershell
git diff --staged --stat
git diff --staged
```

Порядок можно выразить так:

```text
прочитать change
→ запустить automated checks
→ stage intended files
→ перечитать staged snapshot
→ commit
```

Если tests создают `dist`, ignore rules не должны добавлять его в status.

## 8. Хорошее commit message

Первая строка:

- короткая;
- конкретная;
- описывает результат;
- не заканчивается бессодержательным «changes»;
- соответствует diff.

Примеры:

```text
Validate top heroes CLI option
Add test coverage for invalid match history
Ignore local environment files
Fix winner calculation for Dire players
```

Если нужен контекст, создайте subject и body:

```powershell
git commit
```

Git откроет configured editor. Структура:

```text
Validate top heroes CLI option

Reject values outside 1..20 so the report cannot print an
unbounded number of rows. Keep the default at five.
```

Body объясняет «почему» и не пересказывает каждую строку code.

Для первых упражнений `git commit -m` достаточно.

## 9. Conventional-style prefixes — optional agreement

Некоторые teams используют:

```text
feat: add configurable hero limit
fix: reject zero hero limit
test: cover invalid CLI arguments
docs: explain report options
chore: update tooling configuration
```

Prefix полезен только при общем convention. Git сам не требует его. Не заменяйте смысл одним словом `fix:`.

## 10. Читаем graph

```powershell
git log --graph --decorate --oneline --all
```

Пока branch одна, graph прямой:

```text
* 41a2c10 Document TypeScript check command
* 7c9b531 Define ignored files and environment template
* 18e2f70 Create typed match history analyzer
```

Позднее линии покажут divergence и merge.

## 11. Исследуем commit

Последний:

```powershell
git show HEAD
```

Предыдущий:

```powershell
git show HEAD~1
```

Конкретный ID:

```powershell
git show 41a2c10
```

Только summary:

```powershell
git show --stat --oneline HEAD
```

Список файлов:

```powershell
git show --name-only --format=short HEAD
```

## 12. Сравниваем points истории

```powershell
git diff HEAD~1..HEAD
```

Показывает patch между двумя commits.

Только summary:

```powershell
git diff --stat HEAD~1..HEAD
```

Сравнивать можно branches и tags, не только relative names.

## 13. `git blame` не назначает виновного

```powershell
git blame -- README.md
```

Команда показывает, какой commit последний изменил каждую строку. Её используют, чтобы найти контекст и связанное решение, а не чтобы обвинять автора.

Правильный следующий шаг:

```powershell
git show <commit-id>
```

## 14. Исправление последнего local commit

Если commit ещё не pushed/shared и вы забыли одну строку:

```powershell
git add README.md
git commit --amend --no-edit
```

Создаётся новый commit вместо прежнего. Его ID изменится.

Изменить message:

```powershell
git commit --amend -m "Better message"
```

Не amend shared commit без согласованного workflow: другим разработчикам уже известен старый ID.

Если не уверены, был ли commit shared, создайте новый исправляющий commit.

## 15. Formatting отдельно от логики

Formatter может изменить много строк. Если смешать это с domain fix, reviewer не увидит важную логику.

Лучше:

```text
commit A: Format presentation module
commit B: Fix top heroes calculation
```

Или сначала format только touched lines в соответствии с project convention.

## 16. Dependency update отдельно

Изменение `package.json` и `pnpm-lock.yaml` может быть большим и security-sensitive. Не прячьте его внутри feature commit.

Проверьте:

- какую package обновили;
- почему;
- version range;
- lockfile diff;
- release notes;
- tests;
- нет ли неожиданного множества transitive changes.

## 17. Практика: разбить mixed working tree

Сделайте два изменения до staging:

1. в `README.md` добавьте команду просмотра graph;
2. в `print-history-report.ts` измените строку title.

Проверьте общий diff:

```powershell
git diff --stat
git diff
```

Первый commit:

```powershell
git add README.md
git diff --staged
git commit -m "Document Git history graph"
```

Проверьте, что TypeScript change остался:

```powershell
git status --short
git diff -- src/presentation/print-history-report.ts
```

Проверьте и commit code:

```powershell
pnpm run typecheck
pnpm test
git add src/presentation/print-history-report.ts
git diff --staged
git commit -m "Clarify match history report title"
```

## 18. Self-review commit

После каждого commit:

```powershell
git show --stat HEAD
git show HEAD
git status --short
```

Спросите:

- message соответствует patch;
- нет debug output;
- нет secret;
- tests соответствуют change;
- не включён unrelated file;
- documentation не обещает несуществующее behavior.

## 19. Контрольные вопросы

1. Что значит atomic commit?
2. Может ли atomic commit менять три файла?
3. Зачем нужен `git add -p`?
4. Чем staged diff отличается от working diff?
5. Почему formatting лучше отделить от logic?
6. Когда безопасен amend?
7. Почему amend меняет commit ID?
8. Зачем запускать `git diff --check`?
9. Что полезного даёт `git show`?
10. Как `git blame` использовать без обвинений?

## Definition of Done

- mixed change разделён минимум на два commits;
- каждый commit имеет одно понятное intention;
- checks запускались до code commit;
- staged snapshot прочитан до commit;
- history читается через graph;
- вы умеете сравнить два commits;
- amend используется только для unshared last commit;
- working tree state после каждого шага понятен.

