# 5. Branches и безопасное переключение

## Результат главы

Вы создадите feature branch, сделаете в ней commit, сравните её с `main` и безопасно переключитесь между линиями истории.

## 1. Branch — movable name commit

Branch не является отдельной копией всей папки. Это lightweight name, указывающее на commit.

До feature:

```text
A──B──C  main, HEAD
```

После создания branch:

```text
A──B──C  main, feature/report-label, HEAD
```

После commit в feature:

```text
A──B──C  main
       \
        D  feature/report-label, HEAD
```

`main` остался на C, feature передвинулась на D.

## 2. HEAD

`HEAD` обычно указывает на current branch, а branch — на current commit.

```text
HEAD → feature/report-label → commit D
```

Новый commit двигает только current branch.

Проверка:

```powershell
git branch --show-current
git log -1 --oneline --decorate
```

## 3. Сначала clean state

Перед переключением:

```powershell
git status
```

Git иногда способен перенести local modifications между branches, а иногда отказывается из-за риска overwrite. Для новичка безопасное правило:

> Создавайте и переключайте branches при понятном clean working tree.

Если есть unfinished changes:

- завершите и commit, если изменение действительно готово;
- отмените только после чтения diff;
- временно сохраните через stash, если уже понимаете stash;
- не делайте фиктивный commit в `main` только ради переключения.

## 4. Создание и switch одной командой

```powershell
git switch -c feature/report-label
```

Разбор:

- `switch` меняет current branch;
- `-c` создаёт новую branch;
- start point по умолчанию — current `HEAD`;
- working tree обновляется под выбранный commit.

Проверка:

```powershell
git branch --show-current
git branch
```

Звёздочка в `git branch` отмечает current branch.

## 5. Naming

Понятные примеры:

```text
feature/configurable-top-heroes
fix/dire-winner-calculation
docs/local-setup
test/invalid-match-history
```

Рекомендации:

- lower-case;
- слова через hyphen;
- короткий category prefix;
- отражает задачу;
- без пробелов;
- без имени вроде `new-branch-final`.

Convention команды важнее конкретного prefix.

## 6. Работа внутри feature

Откройте `README.md` и добавьте:

```markdown
## Report label experiment

Изменение разрабатывается в отдельной feature branch.
```

Проверьте current branch до commit:

```powershell
git branch --show-current
git diff -- README.md
```

Commit:

```powershell
git add README.md
git diff --staged
git commit -m "Document feature branch experiment"
```

## 7. Graph после divergence

```powershell
git log --graph --decorate --oneline --all
```

`main` всё ещё указывает на прежний commit, feature — на новый.

Показать commits, доступные из feature, но не из main:

```powershell
git log --oneline main..feature/report-label
```

## 8. Сравнение branches

Patch от общего предка до feature:

```powershell
git diff main...feature/report-label
```

Три точки удобны для review feature: показывают изменение branch относительно merge base.

Две точки:

```powershell
git diff main..feature/report-label
```

сравнивают tips двух branches напрямую. Пока main не двигалась, результаты одинаковы. После divergence смысл может отличаться.

Summary:

```powershell
git diff --stat main...feature/report-label
```

## 9. Переключение на main

Убедитесь, что tree clean:

```powershell
git status --short
```

Затем:

```powershell
git switch main
```

Откройте README: feature-section исчезла из working tree, потому что current snapshot — main. Она не потеряна; она хранится в feature commit.

Вернуться:

```powershell
git switch feature/report-label
```

Быстро перейти на предыдущую branch:

```powershell
git switch -
```

В первых упражнениях лучше называть branch явно, чтобы не ошибиться.

## 10. Что происходит с untracked files

Untracked file не принадлежит commit и часто остаётся при switch. Если target branch содержит tracked file с тем же path, Git может отказать, чтобы не перезаписать data.

Не используйте branch switch как средство управления untracked files. Сначала проверьте status и определите, нужно ли file commit, ignore или сохранить вне repository.

## 11. Branch не является backup

Local branch хранится в `.git` того же компьютера. Она помогает организовать history, но не защищает от потери диска. Remote branch появится после push.

## 12. Создание branch от неправильного места

Перед `git switch -c` проверяйте:

```powershell
git branch --show-current
git log -1 --oneline
```

Если feature должна начинаться от `main`:

```powershell
git switch main
git switch -c feature/name
```

Не используйте force-create `-C` в учебном workflow: она может передвинуть существующую branch и сделать commits unreachable по прежнему имени.

## 13. Удаление branch

После merge и проверки:

```powershell
git branch -d feature/report-label
```

Lowercase `-d` обычно отказывается удалять branch, если её commits не merged в current upstream context.

Force delete:

```text
git branch -D ...
```

может удалить единственное удобное имя незамерженной работы. В курсе не используем его без отдельного recovery plan.

Нельзя удалить current branch. Сначала switch на main.

## 14. Branch list с последними commits

```powershell
git branch -vv
```

Показывает branches, tips и позднее upstream relationships.

Только merged в current branch:

```powershell
git branch --merged
```

Только не merged:

```powershell
git branch --no-merged
```

Перед удалением всё равно прочитайте graph и убедитесь, что branch действительно больше не нужна.

## 15. Практика: независимые branches

От main создайте две branches по очереди:

```text
docs/git-commands
feature/report-subtitle
```

В первой измените только README и commit. Вернитесь на main. Во второй измените только presentation string и commit.

Посмотрите:

```powershell
git log --graph --decorate --oneline --all
git diff main...docs/git-commands
git diff main...feature/report-subtitle
```

Не merge их в этой главе.

## 16. Контрольные вопросы

1. Branch копирует project directory?
2. Куда указывает HEAD?
3. Какая branch двигается при commit?
4. Что делает `git switch -c`?
5. Почему перед switch полезен clean state?
6. Как увидеть commits только feature branch?
7. Для чего `main...feature` при diff?
8. Исчезло ли изменение после switch на main?
9. Защищает ли local branch от поломки диска?
10. Почему `-D` опаснее `-d`?

## Definition of Done

- feature branch создана от осознанного commit main;
- branch имеет понятное name;
- изменение committed только в feature;
- main не содержит feature commit;
- graph показывает branch pointers;
- вы сравнили feature с main;
- switch выполнялся при понятном status;
- branch пока не удалена до merge.

Официальный справочник: [git switch](https://git-scm.com/docs/git-switch).

