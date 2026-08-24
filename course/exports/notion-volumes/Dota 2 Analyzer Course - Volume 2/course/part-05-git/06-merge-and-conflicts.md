# 6. Merge и разрешение conflicts

## Результат главы

Вы объедините feature с `main`, поймёте fast-forward и merge commit, затем намеренно создадите и разрешите conflict.

## 1. Что делает merge

Merge интегрирует history указанной branch в current branch.

Критически важно направление:

```powershell
git switch main
git merge feature/report-label
```

означает: находясь на main, включить history `feature/report-label` в main.

Перед merge всегда проверяйте current branch:

```powershell
git branch --show-current
git status
```

## 2. Fast-forward

Если main не двигалась после создания feature:

```text
A──B  main
    \
     C──D  feature
```

Git может просто передвинуть main на D:

```text
A──B──C──D  main, feature
```

Это fast-forward. Отдельный merge commit не нужен.

Команды:

```powershell
git switch main
git merge feature/report-label
```

После:

```powershell
git log --graph --decorate --oneline --all
git status
```

## 3. Merge commit

Если обе branches имеют новые commits:

```text
      C──D  feature
     /    \
A──B──E────M  main
```

Commit M имеет двух parents и соединяет линии.

Создать merge commit даже при возможности fast-forward:

```powershell
git merge --no-ff feature/report-label
```

Нужен ли `--no-ff`, определяет team policy. Он сохраняет явную границу feature, но добавляет commits. В лаборатории local merge можно делать обычным способом; GitHub strategy обсудим позднее.

## 4. Preconditions

Перед merge:

```powershell
git status --short
pnpm run typecheck
pnpm test
```

Начинать merge с существенными uncommitted changes рискованно: abort может не восстановить их идеально во всех сложных случаях.

Безопасное правило:

- working tree clean;
- current branch проверена;
- feature tests green;
- staged area empty;
- graph понятен.

## 5. Почему возникает conflict

Git автоматически объединяет изменения, если они не противоречат. Conflict возникает, когда Git не может уверенно выбрать итог, например обе branches по-разному изменили одну область файла.

Conflict не означает, что кто-то сделал ошибку. Это запрос решения от человека.

## 6. Conflict markers

Файл может содержать:

```text
<<<<<<< HEAD
Основная версия main
=======
Версия feature branch
>>>>>>> practice/conflict
```

Разбор:

- между `<<<<<<< HEAD` и `=======` — current side;
- между `=======` и `>>>>>>>` — incoming side;
- marker names не являются частью желаемого content.

Нельзя просто удалить markers, не понимая обе версии. Итог может использовать current, incoming или новую комбинацию.

## 7. Создаём учебный conflict

Начните с clean main:

```powershell
git switch main
git status --short
```

Найдите одну существующую строку README, которую безопасно менять, например description проекта.

Создайте branch:

```powershell
git switch -c practice/readme-conflict
```

Измените выбранную строку на:

```text
Учебный анализатор с feature-описанием.
```

Commit:

```powershell
git add README.md
git commit -m "Change project description in conflict branch"
```

Вернитесь на main:

```powershell
git switch main
```

Измените ту же исходную строку иначе:

```text
Учебный анализатор с основным описанием.
```

Commit:

```powershell
git add README.md
git commit -m "Change project description on main"
```

Теперь merge:

```powershell
git merge practice/readme-conflict
```

Ожидайте сообщение conflict и ненулевое завершение команды.

## 8. Исследуем conflict до исправления

```powershell
git status
git status --short
git diff
```

Short status может показать:

```text
UU README.md
```

`UU` означает, что обе стороны изменили path, и он unresolved.

Список unresolved:

```powershell
git diff --name-only --diff-filter=U
```

Не запускайте обычный commit, пока не прочитали все conflicted files.

## 9. Разрешаем content

Откройте README и замените весь marked block на осмысленный итог:

```text
Учебный анализатор с типизированными моделями и Git-историей.
```

Убедитесь, что markers отсутствуют:

```powershell
git diff --check
```

Можно также искать markers:

```powershell
rg -n "^(<<<<<<<|=======|>>>>>>>)" .
```

Stage означает «этот conflict разрешён выбранной версией»:

```powershell
git add README.md
```

Проверка:

```powershell
git status
git diff --staged
```

## 10. Проверяем результат целиком

После resolution:

```powershell
pnpm run typecheck
pnpm test
```

Conflict мог быть syntactically resolved, но логически неверен. Git не знает TypeScript business rules.

Завершите merge:

```powershell
git commit
```

Git предложит merge message. Для учебного repository default message обычно достаточно; при необходимости добавьте body с причиной нетривиального решения.

## 11. Merge abort

Если вы ещё не хотите решать conflict:

```powershell
git merge --abort
```

Git пытается вернуть state до merge.

Используйте abort только во время текущего merge. После сложных edits поверх conflicted state сначала сохраните важную работу отдельно и разберитесь, что будет потеряно.

Для чистого учебного repository:

1. запомните conflict state;
2. выполните abort;
3. проверьте status и graph;
4. снова запустите merge;
5. на этот раз resolve и commit.

Так вы увидите оба пути.

## 12. Не используем случайные команды из интернета

Во время conflict опасно без понимания выполнять:

- `git reset --hard`;
- `git clean -fd`;
- force checkout;
- удаление `.git/MERGE_HEAD` вручную;
- массовое «accept all incoming».

Они могут уничтожить unrelated local work или выбрать неправильную логику.

Основной безопасный набор:

```text
git status
git diff
редактирование conflict
tests
git add selected file
git diff --staged
git commit
```

или `git merge --abort` при чистом pre-merge state.

## 13. Проверка merge history

```powershell
git log --graph --decorate --oneline --all
git show --stat HEAD
```

У merge commit два parents. Посмотреть их:

```powershell
git show --no-patch --pretty=raw HEAD
```

Для обычной работы raw view не нужен, но он доказывает структуру graph.

## 14. Удаление merged branch

После tests и проверки main:

```powershell
git branch --merged
git branch -d practice/readme-conflict
```

Удаляется name branch, но commits остаются частью history main.

## 15. Конфликт lockfile

`pnpm-lock.yaml` генерируется package manager. Не редактируйте большой lockfile conflict наугад.

Обычно нужно:

1. понять изменения `package.json` обеих branches;
2. корректно объединить manifests;
3. восстановить lockfile выбранным package manager;
4. проверить lockfile diff;
5. установить dependencies и запустить tests.

Конкретная процедура зависит от package manager и team policy.

## 16. Конфликт domain logic

Если одна branch меняет `Match`, а другая parser:

- compile success ещё не доказывает корректную модель;
- перечитайте оба commits;
- обновите runtime validation;
- обновите fixtures;
- добавьте regression test;
- проверьте consumers.

Resolution — новое изменение, за качество которого отвечает человек.

## 17. Контрольные вопросы

1. В какую branch merge добавляет history?
2. Что такое fast-forward?
3. Когда появляется merge commit?
4. Почему conflict не равен ошибке разработчика?
5. Что означают markers?
6. Как увидеть unresolved files?
7. Почему после удаления markers нужны tests?
8. Что делает `git merge --abort`?
9. Почему merge лучше начинать с clean tree?
10. Исчезают ли commits после удаления merged branch name?

## Definition of Done

- простая feature merged в main;
- намеренный README conflict создан;
- обе стороны conflict прочитаны;
- resolution не содержит markers;
- typecheck и tests прошли после resolution;
- merge commit создан;
- graph понятен;
- merged practice branch удалена через `-d`;
- destructive reset/clean не использовались.

Официальный справочник: [git merge](https://git-scm.com/docs/git-merge).

