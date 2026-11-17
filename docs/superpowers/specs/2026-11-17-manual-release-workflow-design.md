# Ручной релиз по кнопке из GitHub Actions

Дата: 2026-11-17
Статус: согласовано и реализовано (`manual-release.yml`)

Реализация проверена: `actionlint` чисто; git-последовательность прогнана локально на копии
репы с bare-remote — bump-коммит `Bump version: 3.5.0 → 3.5.1`, аннотированный тег
`v3.5.1`, prepare-коммит `package-lock.json | 4 ++--`, `--follow-tags` уронил и коммит, и тег.
То же самое, что делают исторические релизные коммиты (`e1fedbd56` + `403318896`).

## Зачем

`release.sh` сегодня можно запустить только с локальной машины: он требует `docker compose`,
`sudo`, и личный PAT в `.release_env` (файл не в гите). Хочется ту же операцию по кнопке
в GitHub Actions с выбором `patch` / `minor` / `major`, чтобы Actions сам коммитил версию и
ставил тег, а автором коммита считался тот, кто нажал Run.

## Что release.sh делает сегодня (проверено по истории)

1. `git config core.eol lf`, `core.autocrlf input`, `user.name`/`user.email` из `.release_env`
2. `bump2version <level>` → коммит `Bump version: X → Y` + **аннотированный** тег `vX.Y.Z`
   (проверено: `git cat-file -t v3.5.0` → `tag`, `tag contents:subject` → `Bump version: 3.4.12 → 3.5.0`)
3. `docker compose run frontend_builder` / `backend_builder`, `sudo dos2unix ./dist/*`, `chmod`
4. `docker compose run plugin_signer` (=> `npm run sign`)
5. `git add .` + `git commit -s -m "prepare to new release, current_version = X"`
6. `git push --tags`

Важно: `dist/` в `.gitignore`, поэтому в git из шага 3–4 попадает **только** `package-lock.json`
(исторический prepare-коммит = `package-lock.json | 4 ++--`, изменившиеся поля `version`).
Сборка в CI нужна как pre-flight проверка («релиз собирается и подписывается до того, как тег
улечит»), а не как содержимое коммита. Публичный релизный артефакт делает `release.yml` по тегу.

## Goals

- `workflow_dispatch` с dropdown `patch` / `minor` / `major`
- коммит версии + аннотированный тег + пуш выполняются из CI
- автор коммита = тот, кто запустил workflow
- `release.yml` отрабатывает по новому тегу (сборка, подпись, draft GitHub release)

## Non-goals

- править `release.sh` (остаётся локальной копией, без изменений)
- менять логику `release.yml` (только добавить триггер)
- автовыкладка в Grafana.com, ведение CHANGELOG

## Constraints

- **GITHUB_TOKEN не каскадирует**: тег, запушенный встроенным токеном, не запускает `release.yml`.
  Поэтому в конце явно дёргаем `gh workflow run release.yml --ref vX.Y.Z`.
- Старый `bump2version` не запускается на Python ≥ 3.12 (`ModuleNotFoundError: sre_constants`,
  проверено локально). `bump-my-version` читает текущий `.bumpversion.cfg` как есть и даёт
  идентичный результат (проверено локально на копии конфига: тот же `Bump version: X → Y`
  и аннотированный `vX.Y.Z`).
- `master` без branch protection (проверено через API), `contents: write` достаточно.
- Из секретов в репозитории есть только `GRAFANA_ACCESS_POLICY_TOKEN` — его хватает на подпись.

## Approaches и что выбрано

**1. Чьими правами пушить.** Варианты: (A) PAT актора в секрете `RELEASE_TOKEN_<actor>`
(полная атрибуция, тег сам триггерит `release.yml`, но каждому релизеру нужно класть PAT);
(B) GitHub App (`create-github-app-token`; author = актор, pusher = бот, без PAT, но нужна
установка приложения); (C) встроенный `GITHUB_TOKEN`.
→ **Выбрано C**: author/committer = актор, пушер = `github-actions[bot]`, `release.yml`
запускается явно в конце. Цена: коммит помечен Unverified (ключа актора в CI нет) и требует
явного запуска релиза.

**2. Насколько буквальная копия сборки.** (A) только bump + push; (B) 1-в-1 через
`docker compose`; (C) те же шаги нативными средствами раннера.
→ **Выбрано C**: `npm` + `mage` + `sign-plugin`, как это уже делает `release.yml`.

## Как устроено

Новый файл `.github/workflows/manual-release.yml`, один job на `ubuntu-latest`,
`permissions: contents: write` + `actions: write`, `concurrency.group: manual-release`
(релизы не должны идти параллельно).

| Шаг                                                                                                                                  | Соответствие release.sh                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `actions/checkout` c `fetch-depth: 0`, `persist-credentials: false`; `gh auth setup-git`                                             | эквивалент пуша по `origin` с токеном                                             |
| `git config core.eol lf` + `core.autocrlf input`                                                                                     | те же две строки                                                                  |
| `git config user.name/user.email` из `gh api users/<actor>` (фолбэк `<id>+<actor>@users.noreply.github.com`)                         | `GITHUB_LOGIN`/`GITHUB_EMAIL` из `.release_env`, но от актора                     |
| `bump-my-version bump <input>`                                                                                                       | `bump2version <level>`                                                            |
| `apt-get install dos2unix` + `dos2unix ./dist/*` + `chmod +rx ./dist/altinity-clickhouse-plugin*`                                    | те же команды без `sudo` (раннер-юзер админ)                                      |
| `npx --yes @grafana/sign-plugin@latest`                                                                                              | `docker compose run plugin_signer`                                                |
| `git add .` + `git diff-index --quiet HEAD \|\| git commit -s -m "prepare to new release, $(grep current_version .bumpversion.cfg)"` | дословно та же строка                                                             |
| `git push origin HEAD:<branch> --follow-tags`                                                                                        | `git push --tags` (явный refspec вместо «всё подряд», тег аннотированный — уйдёт) |

Сборка перед коммитом: `npm install --package-lock-only` (даёт ровно те же две строки в
`package-lock.json`, что и `npm install` внутри `frontend_builder`; проверено локально) →
`npm ci` → `npm run build` → `npm run test:ci` → `mage buildAll`.

Pre-flight перед пушем: `dist/plugin.json` version == `v$NEW_VERSION` (копия проверки из
`release.yml`), чтобы не запушить тег, который релиз-пайплайн отвергнет.

В конце: `gh workflow run release.yml --ref vX.Y.Z` + ссылка на созданный ран.

В `.github/workflows/release.yml`: в `on:` добавляется `workflow_dispatch: {}` — одна строка,
иначе явный запуск невозможен.

## Риски / что надо знать

- `workflow_dispatch` появится в меню только после мержа в `master`.
- Тег указывает на bump-коммит, а не на prepare-коммит — в точности как у `release.sh`.
- Двойной клик по Run: `concurrency` не даст пересечься, второй ран подождёт первый.
- Если `GRAFANA_ACCESS_POLICY_TOKEN` вдруг не задан — подписка skip'нется с warning'ом
  (как в `release.yml`), тег всё равно уйдёт.

## На откуп реализующему

- имя workflow и отображаемое `run-name`
- порядок шагов Node/Go вокруг bump
- формулировки warning'ов
