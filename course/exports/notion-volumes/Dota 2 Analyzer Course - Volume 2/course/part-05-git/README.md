# Часть 5. Git и дисциплина разработки

[← Часть 4. TypeScript и безопасные модели данных](../part-04-typescript/README.md)

## Цель части

Научиться сохранять историю разработки так, чтобы каждое изменение можно было понять, проверить и безопасно продолжить.

Git будет использоваться во всех следующих частях курса. Начиная с HTTP-клиента, мы больше не будем относиться к папке проекта как к набору файлов без истории.

## Главы

1. [Git, repository и безопасная инициализация](01-git-repository-init.md)
2. [Working tree, staging area, diff и первый commit](02-working-tree-staging-commit.md)
3. [`.gitignore`, generated files и защита secrets](03-gitignore-and-secrets.md)
4. [Атомарные commits и читаемая история](04-atomic-commits-and-history.md)
5. [Branches и безопасное переключение](05-branches-and-switch.md)
6. [Merge и разрешение conflicts](06-merge-and-conflicts.md)
7. [Безопасное исправление ошибок и восстановление](07-safe-recovery.md)
8. [Remote repositories, GitHub, fetch, pull и push](08-remotes-and-github.md)
9. [Pull request и базовый code review](09-pull-requests-and-review.md)
10. [Итоговая лабораторная: feature от branch до merge](10-final-git-lab.md)

## Практический проект

Мы не изменяем сохранённый эталон части 4. В первой главе вы создадите отдельную копию TypeScript-анализатора в `practice/dota-history-git` и инициализируете repository уже внутри копии.

Так можно свободно экспериментировать, не повреждая исходные материалы курса.

## Результат части

В итоговой лабораторной вы добавите `--top=N` через отдельную feature branch, три reviewable commits, tests, self-review и local merge либо GitHub pull request.

После части 5 все дальнейшие изменения приложения должны выполняться по циклу:

```text
актуальная main
→ feature branch
→ маленькие commits
→ typecheck/tests
→ self-review
→ pull request
→ review
→ merge
```

## Безопасность

В этой части намеренно не используется `git reset --hard`, forced branch deletion или force push. Эти команды нельзя применять как универсальное исправление непонятного состояния. Сначала сохраняются status, diff, graph и reflog, затем выбирается узкое действие.

## Официальные справочники

- [Git documentation](https://git-scm.com/docs)
- [GitHub pull requests](https://docs.github.com/en/pull-requests)
- [GitHub remote repositories](https://docs.github.com/en/get-started/git-basics/about-remote-repositories)
- [Удаление sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
