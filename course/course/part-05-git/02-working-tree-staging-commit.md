# 2. Working tree, staging area, diff и первый commit

## Результат главы

Вы научитесь:

- различать untracked, modified, staged и committed states;
- читать полный и короткий status;
- видеть изменения до и после staging;
- добавлять конкретные файлы;
- проверять будущий commit;
- создавать маленький commit с понятным сообщением;
- читать `log` и `show`;
- безопасно убирать файл из staging area без потери содержимого.

Работа продолжается в `practice/dota-history-git`, созданном в главе 1.

## 1. Три области Git

Для ежедневной работы удобно представлять три области:

```text
working tree
    │ git add
    ▼
staging area (index)
    │ git commit
    ▼
repository history
```

### Working tree

Файлы, которые вы видите и редактируете в VS Code.

### Staging area

Подготовленный снимок следующего commit. Это не отдельная видимая папка с копиями файлов, а внутреннее состояние Git.

### Repository history

Последовательность уже созданных commits в `.git`.

Ключевая мысль: `git commit` сохраняет staged snapshot, а не вообще всё, что сейчас лежит в working tree.

## 2. Состояния файла

```text
untracked
→ staged
→ committed
→ modified
→ staged
→ committed
```

### Untracked

Файл существует, но ещё не входил в history и не staged.

### Staged

Текущая версия файла подготовлена для следующего commit.

### Committed

Версия файла сохранена в последнем commit текущей branch.

### Modified

Tracked file изменён в working tree после staged/committed version.

Один и тот же файл может одновременно иметь staged version и дополнительные unstaged changes. Это важный случай, который мы рассмотрим ниже.

## 3. Short status состоит из двух колонок

```powershell
git status --short
```

Формат:

```text
XY path
```

- `X` — отличие staging area от последнего commit;
- `Y` — отличие working tree от staging area.

Основные варианты:

| Код | Смысл |
|---|---|
| `??` | untracked file |
| `A ` | новый файл staged |
| `M ` | изменение staged |
| ` M` | tracked file изменён, но изменение не staged |
| `MM` | одна версия staged, затем файл изменён ещё раз |
| `D ` | удаление staged |
| ` D` | tracked file удалён в working tree, но удаление не staged |

Пробелы значимы. `M ` и ` M` — разные состояния.

## 4. Что показывает `git diff`

По умолчанию:

```powershell
git diff
```

показывает разницу:

```text
working tree ↔ staging area
```

Staged changes показывает другая команда:

```powershell
git diff --staged
```

Она сравнивает:

```text
staging area ↔ последний commit
```

До первого commit сравнение выполняется с пустой историей.

Запомните:

```text
git diff           → что ещё не staged
git diff --staged  → что попадёт в следующий commit
```

## 5. Anatomy diff

Пример:

```diff
diff --git a/README.md b/README.md
index 25d8a10..70cbe91 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,5 @@
 # Dota History CLI

+Проект использует strict TypeScript.
+
 Учебный анализатор истории матчей.
```

Разбор:

- `a/README.md` — старая сторона сравнения;
- `b/README.md` — новая;
- строки с `-` удалены;
- строки с `+` добавлены;
- строки без знака дают surrounding context;
- `@@` описывает диапазоны строк.

Красный и зелёный цвет помогают, но смысл определяют знаки, а не цвет терминала.

## 6. Не начинаем с бездумного `git add .`

Команда:

```powershell
git add .
```

добавляет все подходящие изменения ниже текущей директории. Она не является неправильной, но новичок часто использует её до проверки status и случайно stages:

- debug file;
- большой fixture;
- временный log;
- secret;
- unrelated change;
- удаление нужного файла.

Сначала используем конкретные paths и проверяем staged diff.

## 7. Подготавливаем initial commit частями

Убедитесь, что находитесь в practice repository:

```powershell
Get-Location
git rev-parse --show-toplevel
git status --short
```

Сначала добавьте configuration и documentation:

```powershell
git add .gitignore package.json pnpm-lock.yaml tsconfig.json README.md
```

Проверьте:

```powershell
git status --short
```

Для добавленных файлов первая колонка содержит `A`:

```text
A  .gitignore
A  README.md
A  package.json
A  pnpm-lock.yaml
A  tsconfig.json
?? data/
?? src/
?? test/
```

Теперь:

```powershell
git diff
```

может ничего не показать для staged files. Это не означает, что изменений нет. Выполните:

```powershell
git diff --staged --stat
git diff --staged
```

`--stat` показывает компактный список файлов и количество changed lines. Полный diff показывает содержимое.

## 8. Добавляем source, tests и fixture

```powershell
git add data src test
```

Проверьте три представления:

```powershell
git status
git status --short
git diff --staged --stat
```

Перед commit ответьте:

- нет ли `node_modules`;
- нет ли `dist`;
- нет ли `.env`;
- нет ли незнакомых больших файлов;
- относятся ли все staged files к одному initial snapshot;
- присутствуют ли source, tests и configuration.

## 9. Проверка ignored files

Посмотреть, почему path игнорируется:

```powershell
git check-ignore -v node_modules
git check-ignore -v dist
```

Если директории физически не существуют, команда может ничего не вывести. Можно проверить path внутри:

```powershell
git check-ignore -v node_modules/example.js
git check-ignore -v dist/src/index.js
```

Результат показывает `.gitignore`, строку правила и проверяемый path.

`.gitignore` не удаляет файл и не защищает secret, который уже committed. Он влияет на untracked matching files.

## 10. Первый commit

Перед командой ещё раз:

```powershell
git diff --staged --stat
```

Создайте commit:

```powershell
git commit -m "Create typed match history analyzer"
```

Разбор:

- `git commit` создаёт новый snapshot из staging area;
- `-m` передаёт короткое message;
- текст описывает результат изменения;
- working tree files, которые не staged, в commit не попадут.

Сообщение лучше формулировать как действие или результат:

```text
Create typed match history analyzer
Add runtime match parser
Fix hero win-rate rounding
Document local setup
```

Слабые сообщения:

```text
changes
fix
work
123
final
```

Через несколько месяцев они не объясняют историю.

## 11. Проверяем результат commit

```powershell
git status
```

Если после commit ничего не менялось:

```text
nothing to commit, working tree clean
```

Это означает:

- tracked working tree совпадает с current commit;
- staging area не содержит следующего snapshot;
- untracked non-ignored files отсутствуют.

`clean` не означает, что тесты проходят. Git status и качество программы — разные проверки.

## 12. Читаем историю

```powershell
git log --oneline --decorate -5
```

Пример:

```text
3e81a2f (HEAD -> main) Create typed match history analyzer
```

Разбор:

- `3e81a2f` — сокращённый commit ID;
- `HEAD` указывает на текущую position;
- `main` — текущая branch;
- справа commit message.

Полный последний commit:

```powershell
git show --stat HEAD
```

Полный patch:

```powershell
git show HEAD
```

`HEAD` — символическое имя текущего commit.

## 13. Создаём второе маленькое изменение

Откройте `README.md` и добавьте раздел:

```markdown
## Учебная граница данных

Внешний JSON имеет тип unknown и становится Match[] только после runtime parser.
```

Сохраните файл и проверьте:

```powershell
git status --short
```

Ожидаемо:

```text
 M README.md
```

Первая колонка пустая, вторая содержит `M`: изменение существует только в working tree.

Посмотрите patch конкретного файла:

```powershell
git diff -- README.md
```

`--` явно отделяет options от paths. Это полезно, если имя path похоже на option.

## 14. Stage и повторная проверка

```powershell
git add README.md
git status --short
```

Теперь:

```text
M  README.md
```

Проверьте staged patch:

```powershell
git diff --staged -- README.md
```

Создайте commit:

```powershell
git commit -m "Document typed data boundary"
```

История:

```powershell
git log --oneline --decorate -5
```

Теперь commits два, и каждое сообщение описывает отдельный результат.

## 15. Stage не замораживает файл

Выполните безопасный эксперимент:

1. добавьте одну строку в `README.md`;
2. `git add README.md`;
3. добавьте ещё одну другую строку в `README.md`;
4. выполните `git status --short`.

Вы увидите:

```text
MM README.md
```

Это означает:

- первая новая версия уже staged;
- working tree содержит дополнительные изменения поверх неё.

Сравните:

```powershell
git diff --staged -- README.md
git diff -- README.md
```

Команды покажут разные patches.

Это доказывает, что staging area хранит конкретную версию, а не просто флажок «включить весь файл навсегда».

## 16. Убираем из staging без потери текста

```powershell
git restore --staged README.md
```

Команда переносит staged difference обратно в unstaged state относительно `HEAD`. Содержимое working file остаётся.

Проверьте:

```powershell
git status --short
git diff -- README.md
```

Теперь изменение должно быть только в working tree.

Чтобы staged снова соответствовал полной текущей версии:

```powershell
git add README.md
```

## 17. Осторожно: discard working changes

Команда:

```powershell
git restore -- README.md
```

заменяет unstaged working version содержимым из staging area или `HEAD`. Несохранённый patch может быть потерян.

Не выполняйте её как универсальное «исправление status». Перед discard:

1. прочитайте `git diff -- README.md`;
2. убедитесь, что изменения точно не нужны;
3. при сомнении сохраните patch или попросите помощи;
4. проверьте, нет ли одновременно staged version.

В наших первых упражнениях достаточно `git restore --staged`, которая не удаляет working content. Discard изучим отдельно в главе о безопасном исправлении ошибок.

## 18. Commit — снимок проекта, а не облачный backup

После local commit:

- history хранится в `.git` на этом компьютере;
- данные не отправлены на GitHub;
- поломка диска может уничтожить и working tree, и local history;
- remote появится в последующих главах.

Тем не менее commit уже даёт точную local history и основу для branches.

## 19. Что не должно попадать в commit

Обычно для нашего Node.js проекта:

- `node_modules` — восстанавливается через lockfile;
- `dist` — восстанавливается build-командой;
- logs — временные;
- `.env` — может содержать secrets;
- API keys, tokens и passwords — никогда;
- editor/system temp files;
- unrelated changes из другой задачи.

Что обычно должно попадать:

- TypeScript source;
- tests;
- fixture без secrets и персональных данных;
- `package.json`;
- единственный lockfile выбранного manager;
- `tsconfig.json`;
- `.gitignore`;
- documentation.

## 20. Маленький осмысленный commit

Хороший commit:

- решает одну понятную задачу;
- проходит доступные проверки;
- не смешивает formatting всего проекта с логическим исправлением;
- не включает случайные файлы;
- имеет message, объясняющее результат;
- достаточно мал, чтобы его diff можно было прочитать.

Перед каждым commit используйте цикл:

```text
status
→ diff
→ tests/typecheck
→ add selected paths
→ diff --staged
→ commit
→ status
```

## 21. Практическая работа

Создайте ещё два отдельных commits.

### Commit A: документация

Добавьте в README инструкцию о `pnpm run typecheck`.

Ожидаемое message:

```text
Document TypeScript check command
```

### Commit B: presentation

В `buildHistoryReportLines` добавьте одну строку отчёта, например:

```ts
"Источник: учебный JSON",
```

Перед commit:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
git diff -- src/presentation/print-history-report.ts
git add src/presentation/print-history-report.ts
git diff --staged
git commit -m "Show report data source"
```

Если dependencies уже установлены, повторный `pnpm install` не обязателен. Никогда не stage `node_modules`.

## 22. Контрольные вопросы

1. Какие три области мы используем в модели Git?
2. Что именно сохраняет `git commit`?
3. Чем `git diff` отличается от `git diff --staged`?
4. Что означает `??` в short status?
5. Чем `M ` отличается от ` M`?
6. Почему файл может иметь status `MM`?
7. Зачем смотреть staged diff перед commit?
8. Удаляет ли `git restore --staged` рабочий текст?
9. Почему `git restore -- file` требует осторожности?
10. Отправляет ли commit изменения на GitHub?
11. Почему `node_modules` не нужен в history?
12. Что делает commit атомарным?

## Definition of Done

- initial project snapshot committed;
- `git log` показывает понятную историю;
- минимум одно последующее изменение оформлено отдельным commit;
- перед commit вы проверяли `git diff --staged`;
- вы умеете различать staged и unstaged changes;
- вы можете безопасно выполнить `git restore --staged`;
- `node_modules`, `dist` и secrets не committed;
- после завершения `git status` понятен вам, даже если working tree не clean;
- вы можете объяснить, что попадёт в следующий commit и почему.

