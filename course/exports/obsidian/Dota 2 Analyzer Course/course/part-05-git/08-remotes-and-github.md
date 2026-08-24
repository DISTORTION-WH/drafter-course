# 8. Remote repositories, GitHub, fetch, pull и push

## Результат главы

Вы поймёте связь local и remote history и подготовите repository к GitHub без публикации secrets и force operations.

Создание remote и push меняют внешнее состояние. Выполняйте соответствующие шаги только в собственном учебном repository.

## 1. Local и remote repository

```text
ваш компьютер                         GitHub
local main ───── push ──────────────► origin/main
local view ◄──── fetch ───────────── remote history
```

Remote — не «главный Git», а другое repository, доступное по URL.

Git работает локально и без remote. GitHub добавляет:

- совместный доступ;
- backup копию опубликованных commits;
- pull requests;
- reviews;
- issues;
- CI;
- branch protection/rulesets.

## 2. Имя `origin`

`origin` — convention для основного remote, а не специальное обязательное слово.

Посмотреть:

```powershell
git remote -v
```

До настройки output пуст.

Добавление:

```powershell
git remote add origin https://github.com/YOUR-NAME/dota-history-git.git
```

Замените URL на реально созданный repository. Не выполняйте example буквально.

Проверка:

```powershell
git remote -v
git remote get-url origin
```

Если `origin` уже существует, не добавляйте второй вслепую. Сначала прочитайте current URL. Изменение:

```powershell
git remote set-url origin <new-url>
```

## 3. Создание GitHub repository

В GitHub UI:

1. создайте новый repository;
2. выберите ясное name, например `dota-history-git-course`;
3. для учебного code можно выбрать private visibility;
4. не добавляйте GitHub-generated README, `.gitignore` и license, если local repository уже имеет initial commits;
5. скопируйте HTTPS или SSH URL.

Если remote сразу инициализировать отдельным README, local и remote получат разные root commits. Это решаемо, но усложняет первую публикацию.

Private repository не является secret manager. Credentials не commit даже туда.

## 4. HTTPS и SSH

HTTPS URL:

```text
https://github.com/OWNER/REPOSITORY.git
```

SSH URL:

```text
git@github.com:OWNER/REPOSITORY.git
```

HTTPS обычно использует credential manager, personal access token или browser-based authentication. GitHub не принимает обычный account password как Git password.

SSH требует key pair и добавления public key в account.

Не вставляйте token прямо в remote URL, command history, README или screenshot.

Для Windows удобен Git Credential Manager, входящий во многие Git for Windows installations.

## 5. Первый push

Перед публикацией:

```powershell
git status
git log --graph --decorate --oneline --all
git ls-files
```

Убедитесь, что нет secrets, personal data и generated files.

Push main и настройка upstream:

```powershell
git push --set-upstream origin main
```

Короткий вариант:

```powershell
git push -u origin main
```

Upstream связывает local `main` с `origin/main`. После этого status может показывать ahead/behind.

## 6. Remote-tracking branch

`origin/main` — local reference на последнее известное Git состояние remote main.

Она обновляется после fetch/pull, но не обязана мгновенно отражать server:

```text
local main        → ваши local commits
origin/main       → последняя fetched позиция remote main
remote main       → фактическое состояние server сейчас
```

Показать branches:

```powershell
git branch -vv
git branch --remotes
git branch --all
```

## 7. Fetch

```powershell
git fetch origin
```

Fetch загружает objects и обновляет remote-tracking references. Он не merge changes в current working branch.

После fetch исследуйте:

```powershell
git log --oneline HEAD..origin/main
git diff --stat HEAD...origin/main
```

Fetch — хороший первый шаг, потому что разделяет получение информации и integration decision.

## 8. Pull

`git pull` обычно выполняет fetch и затем интеграцию в current branch согласно configuration.

Для начального workflow удобно требовать только fast-forward:

```powershell
git pull --ff-only
```

Если histories diverged, команда откажется вместо автоматического merge commit. Тогда:

1. прочитайте status и graph;
2. fetch;
3. сравните branches;
4. решите merge или rebase согласно team policy.

Не выполняйте повторные pull с разными случайными flags, пока не понимаете graph.

## 9. Push feature branch

```powershell
git switch feature/configurable-top-heroes
git push -u origin feature/configurable-top-heroes
```

Remote branch нужна для pull request и backup опубликованной feature history.

Новый local commit после upstream:

```powershell
git push
```

## 10. Rejected push

Если remote содержит commits, которых нет локально, обычный push может быть rejected как non-fast-forward.

Не отвечайте автоматически `--force`.

Безопасное исследование:

```powershell
git fetch origin
git status
git log --graph --decorate --oneline --all -20
git log --oneline HEAD..origin/main
git log --oneline origin/main..HEAD
```

Затем интегрируйте remote work через согласованный workflow и снова test.

## 11. Почему force push опасен

Force push может передвинуть remote branch назад или на другую history, делая commits коллег недоступными по прежнему branch name.

Для `main` в этом курсе force push запрещён.

Даже `--force-with-lease` требует понимания expected remote tip и team policy. Мы рассмотрим его только если позднее сознательно введём rebased feature workflow.

## 12. Clone против init

Если remote repository уже существует:

```powershell
git clone <url>
```

Clone:

- создаёт directory;
- загружает history;
- настраивает origin;
- создаёт local default branch с upstream.

Если project начат локально:

```text
git init
→ local commits
→ remote add
→ push -u
```

Не выполняйте `git init` внутри уже cloned repository.

## 13. Несколько remotes

В open-source fork workflow часто:

```text
origin   → ваш fork
upstream → original repository
```

Добавление:

```powershell
git remote add upstream <original-url>
```

Но для собственного учебного repository одного origin достаточно.

## 14. Проверка перед каждым push

```powershell
git status
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
pnpm run typecheck
pnpm test
```

Для feature branch сравнивайте с актуальным `origin/main` после fetch.

Проверьте:

- правильный remote URL;
- правильная current branch;
- commits не содержат secrets;
- commit messages понятны;
- tests green;
- push не отправляет unrelated history.

## 15. Практика без обязательного remote mutation

Даже без GitHub выполните read-only проверки:

```powershell
git remote -v
git branch -vv
git log --graph --decorate --oneline --all
```

Если вы создали собственный GitHub repository, затем:

```powershell
git remote add origin <your-url>
git remote -v
git push -u origin main
```

После push откройте GitHub и сравните latest commit ID с local:

```powershell
git log -1 --oneline
```

## 16. Контрольные вопросы

1. Что такое remote?
2. Является ли origin обязательным именем?
3. Чем local main отличается от origin/main?
4. Что делает fetch с working tree?
5. Из каких операций обычно состоит pull?
6. Что означает upstream branch?
7. Почему rejected push не следует лечить force?
8. Чем clone отличается от init?
9. Можно ли хранить secrets в private repository?
10. Какие проверки нужны перед push?

## Definition of Done

- вы можете объяснить local/remote graph;
- remote list проверен до изменения;
- при создании GitHub repository не появилось независимого README commit;
- origin URL не содержит credential;
- main pushed с upstream только в собственный repository;
- fetch и pull различаются в вашем объяснении;
- feature branch можно опубликовать отдельно;
- force push не используется;
- private visibility не считается защитой secrets.

Официальные материалы: [git fetch](https://git-scm.com/docs/git-fetch.html), [git pull](https://git-scm.com/docs/git-pull), [GitHub remote repositories](https://docs.github.com/en/get-started/git-basics/about-remote-repositories), [управление remotes](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories).

