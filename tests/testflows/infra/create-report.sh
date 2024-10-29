#!/bin/bash

export PYTHONIOENCODING=utf-8
# selenium logs
mkdir Assets
cp -rvf  tests/testflows/tmp/target/ ./Assets
# testflows logs
mkdir Reports
cp -rfv tests/testflows/raw.log  ./Reports/raw.log
tfs --debug --no-colors transform compact ./Reports/raw.log > ./Reports/compact.log
tfs --debug --no-colors transform nice ./Reports/raw.log   > ./Reports/nice.log.txt
tfs --debug --no-colors report results -a "$CI_JOB_URL/artifacts/browse" ./Reports/raw.log - --confidential --copyright "Altinity Inc" | tfs --debug --no-colors document convert > ./Reports/result.html
tfs --debug --no-colors report coverage - ./Reports/raw.log -  --confidential --copyright "Altinity Inc"  | tfs --debug --no-colors document convert > ./Reports/coverage.html
# code coverage
mkdir Code_coverage
mkdir Code_coverage/backend
mkdir Code_coverage/frontend
cp -rfv cover/* Code_coverage/backend
cp -rfv tests/testflows/coverage* Code_coverage/frontend