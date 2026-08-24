# 9. Pull request и базовый code review

## Результат главы

Вы научитесь подготавливать change к review, создавать понятное описание pull request и проверять чужой diff как инженер, а не только как читатель syntax.

## 1. Что такое pull request

Pull request, или PR, — предложение интегрировать commits compare branch в base branch.

```text
base:    main
compare: feature/configurable-top-heroes
```

PR не заменяет Git commit. Он объединяет:

- branch diff;
- commits;
- discussion;
- automated checks;
- reviews;
- merge decision.

## 2. Workflow автора

```text
обновить main
→ создать feature branch
→ небольшие commits
→ tests/typecheck
→ self-review diff
→ push branch
→ открыть PR
→ получить feedback
→ добавить fixes
→ green CI + approval
→ merge
```

## 3. Подготовка branch

```powershell
git switch main
git pull --ff-only
git switch -c feature/configurable-top-heroes
```

После работы:

```powershell
git status
pnpm run typecheck
pnpm test
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff main...HEAD
```

Последние две команды имитируют основной Files changed view PR.

## 4. Push branch

```powershell
git push -u origin feature/configurable-top-heroes
```

После этого GitHub обычно предлагает открыть PR.

Проверьте base и compare. Ошибка направления может показать огромный unrelated diff.

## 5. Хороший title

Title описывает user-visible или engineering result:

```text
Allow CLI users to choose the number of displayed heroes
```

Слабые варианты:

```text
Update files
My changes
Fix stuff
Final version
```

## 6. Структура description

```markdown
## Зачем

CLI всегда показывает пять героев и не позволяет сократить отчёт.

## Что изменено

- добавлен `--top=N`;
- допустимый диапазон ограничен 1..20;
- presentation использует выбранный limit;
- добавлены tests invalid values.

## Как проверить

1. `pnpm run typecheck`
2. `pnpm test`
3. `node dist/src/index.js --top=3`

## Риски

- parser аргументов теперь отклоняет неизвестные options;
- default behavior должно остаться top-5.
```

Description объясняет motivation, scope, verification и risks. Не заставляйте reviewer восстанавливать цель только из code.

## 7. Draft PR

Draft показывает, что change ещё не готов к final approval, но уже доступен для раннего feedback.

Используйте draft, если:

- нужна проверка architecture;
- feature большая и выбран vertical slice;
- CI ещё красный по известной причине;
- вы хотите обсудить API до polishing.

Draft не оправдывает committed secrets или заведомо опасный code.

## 8. Self-review

Перед запросом review откройте Files changed и прочитайте каждый файл сверху вниз.

Checklist:

- diff соответствует title;
- нет unrelated formatting;
- нет commented-out code;
- нет debug `console.log`;
- нет secrets или personal data;
- new behavior имеет tests;
- error messages полезны;
- types не скрыты через `any`/assertion;
- runtime data всё ещё проходит validation;
- documentation соответствует commands;
- lockfile change ожидаем;
- names отражают domain.

Очень многие дефекты автор находит именно при self-review.

## 9. Что проверяет reviewer

### Correctness

- result соответствует requirement;
- edge cases учтены;
- старое behavior не сломано;
- ошибки handled.

### Data safety

- внешние данные считаются untrusted;
- secrets отсутствуют;
- IDs не перепутаны;
- mutation не повреждает shared data.

### Architecture

- I/O не смешан с domain;
- module responsibilities ясны;
- dependency direction сохранено;
- новый abstraction действительно нужен.

### Tests

- test падает без change;
- проверяется behavior, а не implementation detail;
- есть success и invalid cases;
- fixture понятен.

### Operations

- logging не раскрывает secrets;
- configuration documented;
- migration/deployment risk указан;
- heavy operation ограничена.

## 10. Виды review outcome на GitHub

- `Comment` — feedback без approval decision;
- `Approve` — change готов с точки зрения reviewer;
- `Request changes` — есть блокирующие проблемы.

Сам статус Request changes блокирует merge только если repository rules требуют соответствующий approval workflow. Не полагайтесь на UI без branch protection.

## 11. Как писать feedback

Хороший comment:

```text
Если `--top=0`, slice вернёт пустой список и команда завершится успешно.
Нужно ли отклонять значения вне 1..20 в parser и добавить test для нуля?
```

Он содержит:

- наблюдение;
- consequence;
- вопрос или конкретное предложение.

Слабый comment:

```text
Плохо. Переделай.
```

Разделяйте:

- blocking correctness/security issue;
- suggestion;
- personal style preference;
- question.

Можно ставить labels в тексте: `blocking:`, `suggestion:`, `question:`.

## 12. Ответ автора

На feedback:

1. подтвердите понимание;
2. задайте вопрос, если requirement неясен;
3. внесите change отдельным commit или логичным update;
4. push branch;
5. укажите, что именно исправлено;
6. не закрывайте discussion без ответа;
7. re-request review после значительных изменений.

Не отвечайте автоматически «исправлено» без ссылки на behavior/test.

## 13. Новые commits в PR

После open PR branch остаётся обычной branch:

```powershell
git add src/cli/parse-arguments.ts test/parse-arguments.test.ts
git commit -m "Reject out-of-range top hero limits"
git push
```

PR обновится.

Для beginner/shared workflow не переписывайте published commits force push. Дополнительные commits прозрачнее. Merge strategy может squash их позднее.

## 14. Automated checks

CI должен независимо выполнить минимум:

```text
install frozen dependencies
→ typecheck
→ tests
→ lint/format check
```

Green CI не доказывает отсутствие ошибок. Он доказывает только успешность configured checks.

Не merge красный CI только потому, что «локально работало». Найдите различие environment или настоящий failure.

## 15. Merge strategies

GitHub обычно предлагает:

### Merge commit

Сохраняет feature commits и создаёт merge commit.

### Squash and merge

Создаёт один итоговый commit в base из PR changes. Удобно, если feature history содержит много review-fix commits.

### Rebase and merge

Переносит commits линейно на base с новыми IDs.

Выбор — policy repository. Для курса:

- local conflict chapter использует merge commit;
- учебный GitHub PR можно squash merge;
- не нажимайте strategy, не понимая resulting history.

## 16. После merge

Если merge выполнен на GitHub:

```powershell
git switch main
git pull --ff-only
git log --graph --decorate --oneline --all -15
pnpm run typecheck
pnpm test
```

Удалить local merged branch:

```powershell
git branch -d feature/configurable-top-heroes
```

Remote branch можно удалить через GitHub UI или:

```powershell
git push origin --delete feature/configurable-top-heroes
```

Это внешнее изменение: убедитесь, что PR merged и branch больше не нужна.

После fetch убрать stale remote-tracking names:

```powershell
git fetch --prune origin
```

## 17. Branch protection и rulesets

Для main полезны rules:

- changes только через PR;
- required status checks;
- required reviews;
- conversation resolution;
- запрет force push;
- запрет deletion;
- при необходимости code owners.

Rules снижают вероятность случайной ошибки, но не заменяют review quality.

## 18. Review lockfile

Если меняются `package.json` или `pnpm-lock.yaml`:

- проверьте declared dependency;
- убедитесь, что lockfile создан выбранным pnpm;
- посмотрите version и integrity changes;
- проверьте unexpected transitive packages;
- прочитайте release/security notes;
- запустите install из clean/frozen state в CI.

Не одобряйте огромный lockfile diff, не понимая причины.

## 19. Практика: self-review без GitHub

Даже без remote создайте feature branch и выполните:

```powershell
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff main...HEAD
```

Напишите `PR-DRAFT.md` вне repository или в temporary notes с sections:

- Why;
- Changes;
- Verification;
- Risks.

Не commit этот temporary file, если project не использует его как template.

## 20. Контрольные вопросы

1. Чем PR отличается от commit?
2. Что такое base и compare branch?
3. Зачем нужен self-review?
4. Когда useful draft PR?
5. Какие три review outcomes предлагает GitHub?
6. Всегда ли Request changes технически блокирует merge?
7. Почему green CI не доказывает correctness полностью?
8. Чем merge, squash и rebase strategies отличаются?
9. Почему feedback должен описывать consequence?
10. Что сделать локально после merge на GitHub?

## Definition of Done

- feature diff прочитан целиком;
- PR title описывает result;
- description содержит why/changes/verification/risks;
- self-review checklist выполнен;
- typecheck и tests green;
- feedback разделён на blocking/suggestion/question;
- fixes добавлены прозрачно;
- merge strategy выбрана осознанно;
- main обновлена после merge;
- merged branch удалена только после проверки.

Официальные материалы: [GitHub pull requests](https://docs.github.com/en/pull-requests), [о PR reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews), [review changed files](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request).

