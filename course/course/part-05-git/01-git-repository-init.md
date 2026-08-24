# 1. Git, repository и безопасная инициализация

## Результат главы

После главы вы сможете:

- отличать Git от GitHub;
- объяснить, что такое repository;
- проверить директорию до выполнения команды;
- создать отдельную учебную копию TypeScript-проекта;
- инициализировать local repository с веткой `main`;
- настроить имя автора только для этого repository;
- прочитать базовый вывод `git status`;
- не создать случайный вложенный repository.

В этой главе мы пока не создаём commit. Сначала нужно понять место, в котором Git работает, и состояние, которое он видит.

## 1. Какую проблему решает Git

Без version control разработчик часто создаёт такие файлы:

```text
project-final/
project-final-2/
project-final-really-final/
project-final-fixed/
```

У такого подхода нет ответов на вопросы:

- что изменилось между копиями;
- почему это было изменено;
- какая версия рабочая;
- кто внёс изменение;
- можно ли безопасно объединить две параллельные работы;
- как вернуть конкретное исправление, не теряя остальной код.

Git хранит последовательность снимков проекта и связи между ними.

Упрощённо:

```text
commit A → commit B → commit C
```

Каждый commit содержит:

- снимок отслеживаемых файлов;
- автора;
- дату;
- сообщение;
- ссылку на предыдущий commit;
- уникальный identifier.

## 2. Git и GitHub — не одно и то же

Git — программа version control, которая работает локально:

```text
ваша папка
→ local Git repository
```

GitHub — внешний сервис, на котором можно хранить remote repository, обсуждать изменения и проводить code review.

```text
local repository
↕ push / fetch / pull
GitHub repository
```

Для первых глав интернет и GitHub не нужны. Мы изучаем local Git.

Аналогично существуют GitLab, Bitbucket и собственные Git-серверы. Git не принадлежит одному hosting service.

## 3. Что такое repository

Repository — рабочая директория проекта вместе с Git metadata.

После инициализации структура выглядит так:

```text
dota-history-git/
├── .git/          ← внутренняя база Git
├── data/
├── src/
├── test/
├── package.json
└── tsconfig.json
```

Обычные файлы проекта называются working tree. Скрытая директория `.git` хранит историю, настройки repository, branches и другую служебную информацию.

Если скопировать только исходники без `.git`, получится проект без прежней local history. Если потерять `.git` до отправки в remote, local history также будет потеряна.

Не редактируйте содержимое `.git` вручную.

## 4. Git работает относительно текущей директории

Перед любой Git-командой проверяйте:

```powershell
Get-Location
Get-ChildItem
```

Затем:

```powershell
git status
```

Git ищет `.git`:

1. в текущей директории;
2. затем в родительской;
3. продолжает вверх, пока не найдёт repository или корень диска.

Поэтому команда из вложенной `src/domain` всё равно может относиться ко всему project repository.

Узнать корень найденного repository:

```powershell
git rev-parse --show-toplevel
```

Если Git отвечает, что текущая директория не является repository, это не поломка. Это означает, что `.git` не найден.

## 5. Сначала проверяем Git

```powershell
git --version
```

Пример результата:

```text
git version 2.53.0.windows.3
```

Точная patch-версия может отличаться. Важно, чтобы команда завершилась успешно.

Устройство Git-команды:

```text
git <command> <options> <arguments>
```

Примеры:

```powershell
git status
git log --oneline
git diff -- README.md
```

## 6. Почему нельзя инициализировать случайную папку

Опасные места:

- домашняя директория пользователя;
- `Documents` целиком;
- корень диска;
- папка, уже находящаяся внутри другого repository;
- исходный комплект курса вместо отдельной practice-копии.

Если выполнить `git init` слишком высоко, `git status` может показать тысячи посторонних файлов.

Перед `git init` задайте себе два вопроса:

1. `Get-Location` показывает конкретный project directory?
2. `Get-ChildItem` показывает только файлы этого проекта?

Если ответ неочевиден, команду не выполняйте.

## 7. Создаём безопасную practice-копию

Откройте терминал в корне `dota2-analyzer-course`. Проверьте, что видите папки `blueprint` и `course`.

Создайте директорию практики:

```powershell
New-Item -ItemType Directory -Path .\practice -Force
```

До копирования проверьте, что destination ещё не существует:

```powershell
Test-Path .\practice\dota-history-git
```

Ожидаемый результат первого запуска:

```text
False
```

Если результат `True`, не удаляйте папку вслепую. Выберите другое имя, например `dota-history-git-2`, или сначала вручную проверьте существующую работу.

Скопируйте TypeScript-проект:

```powershell
Copy-Item `
  -Recurse `
  .\course\part-04-typescript\examples\dota-history-cli-ts `
  .\practice\dota-history-git
```

В PowerShell обратный апостроф в конце строки означает продолжение команды. После него не должно быть пробелов. Если неудобно, напишите команду одной строкой.

Перейдите в копию:

```powershell
Set-Location .\practice\dota-history-git
Get-Location
Get-ChildItem
```

Вы должны видеть `src`, `test`, `data`, `package.json`, `tsconfig.json` и `pnpm-lock.yaml`.

## 8. Проверяем отсутствие вложенного repository

Перед инициализацией:

```powershell
git rev-parse --show-toplevel
```

Возможны два результата.

### Git сообщает «not a git repository»

Это ожидаемо: practice-копия ещё не инициализирована.

### Git показывает какой-то родительский путь

Значит practice-копия уже находится внутри другого repository. Не выполняйте `git init` автоматически. Вложенные repositories требуют отдельного осознанного решения и сейчас нам не нужны.

Для учебной работы выберите место вне родительского repository или используйте уже найденный repository только если понимаете его границы.

## 9. Инициализация

Находясь именно в `practice/dota-history-git`:

```powershell
git init -b main
```

Разбор:

- `git init` создаёт local repository;
- `-b main` называет первую branch `main`;
- исходники не загружаются в интернет;
- commit ещё не создаётся;
- существующие файлы не становятся автоматически tracked.

Проверьте скрытую директорию:

```powershell
Get-ChildItem -Force .\.git
```

Не изменяйте эти файлы.

## 10. Имя и email автора

Commit должен иметь автора. Для учебного repository безопасно настроить данные локально:

```powershell
git config --local user.name "Ваше имя"
git config --local user.email "you@example.com"
```

Замените значения своими. `--local` записывает настройку только в `.git/config` текущего repository.

Проверка:

```powershell
git config --local --list
```

Глобальная настройка:

```powershell
git config --global user.name "Ваше имя"
```

действует на все repositories пользователя. Не выполняйте её без осознанного желания изменить общую конфигурацию компьютера.

Показать происхождение активных настроек:

```powershell
git config --list --show-origin
```

## 11. Первый `git status`

```powershell
git status
```

Вы увидите смысл, похожий на:

```text
On branch main

No commits yet

Untracked files:
  README.md
  data/
  package.json
  pnpm-lock.yaml
  src/
  test/
  tsconfig.json
```

Разбор:

- `On branch main` — текущая branch называется main;
- `No commits yet` — история пока пуста;
- `Untracked files` — Git видит файлы, но не включал их ни в один commit;
- `.gitignore` может не отображаться отдельно в сокращённом примере, но его тоже нужно проверить.

`Untracked` не означает «плохой» или «удалённый». Это состояние нового файла.

## 12. Краткий статус

```powershell
git status --short
```

Для новых файлов:

```text
?? README.md
?? data/
?? package.json
?? pnpm-lock.yaml
?? src/
?? test/
?? tsconfig.json
```

`??` означает untracked.

Краткий формат станет особенно полезен, когда одновременно появятся staged и unstaged changes.

## 13. Git пока ничего не сохранил

После `git init`:

- repository существует;
- branch существует как имя будущей линии истории;
- файлы остаются untracked;
- commit history пуста;
- remote отсутствует;
- GitHub repository не создавался.

Проверка remotes:

```powershell
git remote -v
```

Пустой вывод сейчас ожидаем.

## 14. Типичные ошибки

### `git init` выполнен не там

Не продолжайте `git add`. Сначала определите корень:

```powershell
git rev-parse --show-toplevel
```

Если repository создан в неправильной папке, не удаляйте `.git` по инструкции из интернета, пока не проверили точный абсолютный путь и наличие важной истории. На учебном этапе проще остановиться и попросить помощи.

### Внутри проекта появился ещё один `.git`

Это nested repository. Родительский Git будет воспринимать его не как обычную папку. Не создавайте nested repository для наших упражнений.

### `git status` показывает `node_modules`

Проверьте `.gitignore`. В эталоне есть:

```text
node_modules/
dist/
*.log
```

Пока ничего не добавляйте, если status выглядит неожиданно.

### Скопировался `dist`

Если он существовал, `.gitignore` должен скрыть его из untracked list. Мы отслеживаем TypeScript source, а build output создаём повторно.

## 15. Контрольные вопросы

1. Чем Git отличается от GitHub?
2. Где хранится local history?
3. Что такое working tree?
4. Почему `git init` ещё не создаёт commit?
5. Что означает untracked?
6. Почему перед Git-командой важно знать текущую директорию?
7. Чем `--local` configuration отличается от `--global`?
8. Почему nested repository сейчас нежелателен?
9. Как узнать корень repository?
10. Отправлял ли `git init` данные в интернет?

## Практическое задание

Не переходя к `git add`:

1. покажите текущий путь;
2. покажите корень repository;
3. покажите branch;
4. покажите полный status;
5. покажите short status;
6. покажите local author configuration;
7. убедитесь, что remote list пуст.

Команды:

```powershell
Get-Location
git rev-parse --show-toplevel
git branch --show-current
git status
git status --short
git config --local --list
git remote -v
```

## Definition of Done

- practice-копия существует отдельно от эталона;
- `.git` находится именно в корне practice-проекта;
- current branch — `main`;
- author настроен локально;
- `git status` показывает ожидаемые project files;
- `node_modules` и `dist` не предлагаются для commit;
- commits и remotes пока отсутствуют;
- вы можете объяснить каждую выполненную команду.

Следующая глава добавит staging area и первый commit.

