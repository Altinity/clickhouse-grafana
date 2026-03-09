#!/bin/bash

export PYTHONIOENCODING=utf-8
# selenium logs
mkdir selenium_logs
cp -rvf  tests/testflows/tmp/target/ ./selenium_logs
# testflows logs
mkdir testflows_logs
cp -rfv tests/testflows/raw.log  ./testflows_logs/raw.log
tfs --debug --no-colors transform compact ./testflows_logs/raw.log > ./testflows_logs/compact.log
tfs --debug --no-colors transform nice ./testflows_logs/raw.log   > ./testflows_logs/nice.log.txt
tfs --debug --no-colors report results -a "$CI_JOB_URL/artifacts/browse" ./testflows_logs/raw.log - --confidential --copyright "Altinity Inc" | tfs --debug --no-colors document convert > ./testflows_logs/result.html
tfs --debug --no-colors report coverage - ./testflows_logs/raw.log -  --confidential --copyright "Altinity Inc"  | tfs --debug --no-colors document convert > ./testflows_logs/coverage.html
# code coverage (raw data only - reports are generated in the coverage job)
mkdir -p code_coverage/backend code_coverage/frontend
cp -rfv go_coverage/raw/* code_coverage/backend/ 2>/dev/null || true
cp -rfv tests/testflows/coverage/raw/* code_coverage/frontend/ 2>/dev/null || true
# failure screenshots
if ls tests/testflows/screenshots/*.png 1>/dev/null 2>&1; then
  mkdir -p testflows_logs/screenshots
  cp -rfv tests/testflows/screenshots/*.png testflows_logs/screenshots/ 2>/dev/null || true
fi