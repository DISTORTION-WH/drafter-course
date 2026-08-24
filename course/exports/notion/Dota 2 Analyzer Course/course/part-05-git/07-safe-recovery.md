# 7. Безопасное исправление ошибок и восстановление работы

## Результат главы

Вы построите decision process для типовых ошибок Git и научитесь сначала сохранять информацию, а потом менять state.

## 1. Главное правило recovery

Перед исправляющей командой зафиксируйте факты:

```powershell
Get-Location
git rev-parse --show-toplevel
git branch --show-current
git status
git log --graph --decorate --oneline --all -10
git diff
git diff --staged
```

Необязательно выполнять всё для простой опечатки, но при непонятном state эти команды read-only и создают карту ситуации.

Не начинайте с `reset --hard`, `clean -fd` или удаления `.git`.

## 2. Сначала классифицируем ошибку

| Ситуация | Безопасное направление |
|---|---|
| Unstaged edit ещё нужен | продолжить edit или commit |
| Unstaged edit точно не нужен | после чтения diff — `git restore` selected path |
| File staged по ошибке | `git restore --staged` |
| Последний local unshared commit неполон | amend или новый commit |
| Shared commit нужно отменить | `git revert` |
| Commit «исчез» после switch/reset | сначала `git reflog`, ничего не чистить |
| Срочно нужно переключиться, работа не готова | temporary branch или stash |
| Secret опубликован | rotate/revoke первым, затем coordinated cleanup |

Слово shared означает: commit pushed, передан коллеге, включён в PR или на него мог кто-то опереться. Если не уверены — считайте shared.

## 3. Снять staging без потери working content

```powershell
git restore --staged README.md
```

Проверьте:

```powershell
git status --short
git diff -- README.md
```

Файл остаётся изменённым на диске, но не попадёт в следующий commit до нового `git add`.

Для нескольких конкретных paths перечислите их явно. Не используйте массовую команду, если staging содержит разные задачи.

## 4. Отменить unstaged edit

Сначала:

```powershell
git diff -- README.md
```

Если patch точно не нужен:

```powershell
git restore -- README.md
```

Команда заменяет working version на staged version, а если staged change нет — на `HEAD`. Unstaged content может быть потерян.

Безопасная альтернатива при сомнении: скопировать нужный текст в отдельный temporary note вне repository или создать временную branch и commit.

## 5. Исправить последний unshared commit

Добавить забытое изменение:

```powershell
git add selected-file.ts
git diff --staged
git commit --amend --no-edit
```

Исправить message:

```powershell
git commit --amend -m "Correct commit message"
```

Amend создаёт новый commit object и передвигает branch. Старый ID больше не является tip.

Если commit shared, предпочтительнее новый исправляющий commit, если team workflow не предусматривает coordinated history rewrite.

## 6. Отмена shared commit через revert

```powershell
git log --oneline -10
git show <commit-id>
git revert <commit-id>
```

`git revert` не стирает старую history. Он создаёт новый commit с обратным patch.

```text
A──B──C──R
      ↑  └─ reverses changes of C
      original commit remains visible
```

Это удобно для shared branches: остальные разработчики видят обе причины.

Перед revert:

- working tree должна быть clean;
- проверьте точный commit;
- поймите, не зависит ли поздний code от отменяемого change;
- подготовьтесь к conflict.

Если revert conflict:

```powershell
git status
```

Resolve files, stage и:

```powershell
git revert --continue
```

Отказаться от текущего revert:

```powershell
git revert --abort
```

## 7. Практика revert

На отдельной practice branch:

```powershell
git switch main
git switch -c practice/revert-docs
```

Добавьте заметную учебную строку в README и commit:

```powershell
git add README.md
git commit -m "Add temporary recovery note"
```

Запомните ID:

```powershell
git log -1 --oneline
```

Revert:

```powershell
git revert HEAD
```

Проверьте:

```powershell
git log --oneline -3
git show HEAD
git status
```

В history два commits: добавление и его явная отмена.

## 8. Reflog как журнал перемещений references

```powershell
git reflog
```

Reflog записывает, где недавно находились local `HEAD` и branch tips:

```text
8ab12cd HEAD@{0}: switch: moving from feature/a to main
31f987a HEAD@{1}: commit: Add parser test
```

Это помогает найти commit после ошибочного branch movement или detached work.

Reflog локальный: другой clone имеет другой reflog. Entries со временем expire, поэтому это rescue mechanism, а не permanent backup.

При recovery новичку безопасно:

1. найти candidate ID через reflog;
2. изучить `git show <id>`;
3. создать branch name на нужном commit:

```powershell
git branch recovery/saved-work <commit-id>
```

4. проверить graph;
5. только потом решать merge/cherry-pick.

Создание branch name сохраняет удобную reachable reference и ничего не удаляет.

## 9. Detached HEAD

Если switch выполнен на конкретный commit:

```powershell
git switch --detach <commit-id>
```

HEAD не привязан к branch. Это удобно для inspection, но новые commits могут остаться без branch name.

Если эксперимент оказался нужен:

```powershell
git switch -c recovery/useful-experiment
```

До ухода с detached state проверьте status и log.

## 10. Temporary branch вместо рискованного stash

Если work уже логически целостна, но не готова для main:

```powershell
git switch -c wip/report-options
git add selected-files
git commit -m "WIP: preserve report option work"
```

WIP commit допустим в private temporary branch. Перед PR history можно привести к team convention, но не переписывайте shared work без согласования.

Branch делает сохранённую работу видимой в graph и проще для новичка, чем скрытый stash.

## 11. Stash

Stash временно сохраняет working changes:

```powershell
git stash push -u -m "report option draft"
```

- `-u` включает untracked files;
- ignored files не включаются;
- staged и unstaged state преобразуются в stash records.

Посмотреть:

```powershell
git stash list
git stash show -p stash@{0}
```

Применить, сохранив stash для проверки:

```powershell
git stash apply stash@{0}
```

После проверки можно удалить конкретный stash:

```powershell
git stash drop stash@{0}
```

`pop` совмещает apply и попытку удаления. Для обучения `apply`, проверка, затем `drop` прозрачнее.

Stash может конфликтовать и не является backup. Не храните важную работу месяцами только в stash.

## 12. Почему не используем `git reset --hard`

`reset --hard` двигает branch/HEAD и заменяет index и working tree. Uncommitted tracked changes могут быть уничтожены.

Команда полезна в определённых recovery workflows, но цена ошибки высока. В базовом курсе:

- для unstaging используем `git restore --staged`;
- для shared rollback — `git revert`;
- для lost commit — reflog + recovery branch;
- для conflict — operation-specific `--abort`;
- destructive reset выполняется только с точным пониманием target и backup/recovery plan.

## 13. Почему опасен `git clean`

`git clean` удаляет untracked files. Они могут не находиться ни в commit, ни в reflog.

Особенно опасны force и directory flags. Не используйте clean как способ «сделать status красивым».

Сначала классифицируйте untracked files:

- source → stage/commit;
- local config → ignore;
- temporary, но важный → перенести;
- действительно disposable → удалить обычным осознанным файловым действием после проверки path.

## 14. Published secret

Если credential попал в remote:

1. revoke/rotate secret;
2. не публикуйте его повторно в issue;
3. определите затронутые commits, branches, PRs, forks и clones;
4. следуйте coordinated history-cleaning procedure;
5. включите secret scanning/push protection;
6. обновите `.gitignore` и team process.

GitHub отдельно предупреждает, что history rewrite требует координации и не очищает чужие clones автоматически.

## 15. Recovery checklist

```text
STOP
→ не выполнять destructive command
→ записать current path/branch/status
→ прочитать working и staged diff
→ посмотреть graph/reflog
→ определить shared или local history
→ создать safety branch при необходимости
→ выбрать narrow operation
→ проверить status, code и tests
```

## 16. Контрольные вопросы

1. Как unstage файл без потери working content?
2. Когда `git restore -- file` опасен?
3. Почему amend нельзя бездумно применять к shared commit?
4. Что создаёт revert?
5. Чем revert отличается от reset?
6. Что хранит reflog?
7. Как сохранить найденный commit безопасным branch name?
8. Когда temporary branch проще stash?
9. Почему `stash apply` прозрачнее `pop` для новичка?
10. Какой первый шаг после утечки secret?

## Definition of Done

- вы классифицируете state до исправления;
- staged file снят через restore без потери text;
- учебный commit отменён через revert;
- reflog просмотрен и понятен;
- recovery branch умеете создать по commit ID;
- stash применён только в отдельном упражнении;
- `reset --hard` и `clean -fd` не использовались;
- incident с secret начинается с rotation.

Официальные справочники: [git revert](https://git-scm.com/docs/git-revert.html), [git reflog](https://git-scm.com/docs/git-reflog.html), [удаление sensitive data на GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

