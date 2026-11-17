# Manual release from GitHub Actions

Date: 2026-11-17
Status: approved and implemented (`.github/workflows/manual-release.yml`)

Verified: `actionlint` is clean, and the git sequence was replayed locally on a copy of
this repository against a bare remote — bump commit `Bump version: 3.5.0 → 3.5.1`,
annotated tag `v3.5.1`, prepare commit `package-lock.json | 4 ++--`, and
`--follow-tags` pushed both commit and tag. This matches the historical release commits
(`403318896` + `e1fedbd56`).

## Why

`release.sh` can only be run from a local machine: it needs `docker compose`, `sudo` and a
personal token in `.release_env` (an untracked file). We want the same operation behind a
button in GitHub Actions, with a `patch` / `minor` / `major` choice, so that Actions makes
the version commit and the tag while the person who pressed Run stays credited as author.

## What release.sh does today (verified against history)

1. `git config core.eol lf`, `core.autocrlf input`, `user.name`/`user.email` from
   `.release_env`
2. `bump2version <level>` → commit `Bump version: X → Y` + **annotated** tag `vX.Y.Z`
   (verified: `git cat-file -t v3.5.0` → `tag`, message `Bump version: 3.4.12 → 3.5.0`)
3. `docker compose run frontend_builder` / `backend_builder`, `sudo dos2unix ./dist/*`,
   `chmod`
4. `docker compose run plugin_signer` (i.e. `npm run sign`)
5. `git add .` + `git commit -s -m "prepare to new release, current_version = X"`
6. `git push --tags`

Key point: `dist/` is gitignored, so steps 3–4 contribute **only** `package-lock.json` to
git (the historical prepare commit is `package-lock.json | 4 ++--`, the changed `version`
fields). The build in CI therefore acts as a pre-flight check — it proves the release
builds and signs before the tag leaves — not as commit content. The published artifact is
produced by `release.yml` on tag push.

## Goals

- `workflow_dispatch` with a `patch` / `minor` / `major` dropdown
- version commit + annotated tag + push performed by CI
- the commit author is whoever started the workflow
- `release.yml` runs for the new tag (build, sign, draft GitHub release)

## Non-goals

- changing `release.sh` (it stays the working local copy, untouched)
- changing `release.yml` logic (one trigger added)
- publishing to grafana.com, maintaining CHANGELOG

## Constraints

- **GITHUB_TOKEN does not cascade**: a tag pushed with the repository token does not start
  `release.yml`, so the workflow dispatches it explicitly at the end.
- The old `bump2version` no longer imports on Python ≥ 3.12 (`sre_constants` was removed,
  reproduced locally). `bump-my-version` reads the current `.bumpversion.cfg` unchanged and
  produces an identical commit and tag (verified locally on a copy of the config).
- `master` has no branch protection (checked over the API), so `contents: write` suffices.
- The only secret present in the repository is `GRAFANA_ACCESS_POLICY_TOKEN` — enough to
  sign.

## Approaches and what was chosen

**1. Whose credentials push.** Options: (A) a per-user PAT in
`RELEASE_TOKEN_<actor>` (full attribution, the tag itself triggers `release.yml`, but every
releaser has to store a PAT); (B) a GitHub App token via `create-github-app-token` (author
= actor, pusher = bot, no PAT expiry, but the app has to be installed); (C) the repository
`GITHUB_TOKEN`.
→ **Chosen: C.** Author/committer is the actor, pusher is `github-actions[bot]`,
`release.yml` is started explicitly. Cost: the commit reads as Unverified and the release
run needs an explicit dispatch.

**2. How literal the build copy should be.** (A) bump + push only; (B) 1:1 through
`docker compose`; (C) the same steps as native runner steps.
→ **Chosen: C:** `npm` + `mage` + `sign-plugin`, the way `release.yml` already does it.

## Design

New file `.github/workflows/manual-release.yml`, one job on `ubuntu-latest`,
`permissions: contents: write` + `actions: write`,
`concurrency.group: manual-release` so releases cannot overlap.

| Step | release.sh counterpart |
|------|------------------------|
| `actions/checkout` with `fetch-depth: 0`, `persist-credentials: false`; `gh auth setup-git` | pushing to `origin` with a token |
| `git config core.eol lf` + `core.autocrlf input` | the same two lines |
| `user.name`/`user.email` from `gh api users/<actor>` (fallback `<id>+<actor>@users.noreply.github.com`) | `GITHUB_LOGIN`/`GITHUB_EMAIL` from `.release_env`, taken from the actor |
| `bump-my-version bump <level>` | `bump2version <level>` |
| `npm install --package-lock-only` → `npm ci` → `npm run build` → `npm run test:ci` | `docker compose run --rm frontend_builder` |
| `go install mage` → `mage buildAll` → `chmod +rx ./dist/altinity-clickhouse-plugin*` | `docker compose run --rm backend_builder` |
| `apt-get install dos2unix`, `dos2unix ./dist/*` | `sudo dos2unix ./dist/*` |
| `npx --yes @grafana/sign-plugin@latest` | `docker compose run --rm plugin_signer` |
| `git add .` + `git diff-index --quiet HEAD \|\| git commit -s -m "prepare to new release, …"` | the same line |
| `git push origin HEAD:<branch> --follow-tags` | `git push --tags` (an explicit refspec instead of "every tag", the tag is annotated so it still travels) |

Pre-flight before pushing: `dist/plugin.json` version must equal `v$NEW_VERSION` (copied
from `release.yml`), so we never push a tag the release pipeline would reject.

Finally: `gh workflow run release.yml --ref vX.Y.Z`, plus a link to the created run.

In `.github/workflows/release.yml`: `workflow_dispatch: {}` is added to `on:` — one entry,
without it the explicit start is impossible.

## Risks / what to be aware of

- `workflow_dispatch` appears in the picker only once the file is on the default branch.
- The tag points at the bump commit rather than the prepare commit — exactly like
  `release.sh`.
- Double click on Run: `concurrency` serializes the second run behind the first.
- If `GRAFANA_ACCESS_POLICY_TOKEN` ever disappears, signing is skipped with a warning (as
  in `release.yml`) and the tag is still pushed.

## Follow-ups found while implementing

- `bump2version` is pinned in `overrides` through `js-yaml@3` / `js-yaml@4`; both were
  pinned to vulnerable releases (3.15.0 / 4.3.0) and are now 3.15.2 / 4.3.2.
- `release.yml` triggers on `v*.*.*`; `manual-release.yml` enforces the same shape before
  pushing.
