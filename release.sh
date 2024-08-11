#!/usr/bin/env bash
set -xeuo pipefail
if [[ $# -lt 1 ]]; then
    echo "release.sh [major|minor|patch]"
    exit 1
fi
source .release_env
git config core.eol lf
git config core.autocrlf input
git config user.name "$GITHUB_LOGIN"
git config user.email "$GITHUB_EMAIL"
bump2version --verbose $1
docker compose stop
docker compose run --rm frontend_builder
docker compose run --rm backend_builder
sudo dos2unix ./dist/*
sudo chmod +rx ./dist
sudo chmod +rx -R ./dist/altinity-clickhouse-plugin*
docker compose run --rm plugin_signer
git add .
git diff-index --quiet HEAD || git commit -s -m "prepare to new release, $(grep current_version .bumpversion.cfg)"
git push --tags
