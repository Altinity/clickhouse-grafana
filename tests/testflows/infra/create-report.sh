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
# code coverage
mkdir code_coverage
mkdir code_coverage/backend
mkdir code_coverage/frontend
mkdir ./testflows_logs/frontend
mkdir ./testflows_logs/backend
cp -rfv go_coverage/* code_coverage/backend
cp -rfv tests/testflows/coverage/* code_coverage/frontend
cp -rfv tests/testflows/frontend_coverage_testflows/* ./testflows_logs/frontend/
cp -rfv tests/testflows/backend_coverage_testflows/* ./testflows_logs/backend/