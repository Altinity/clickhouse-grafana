#!/bin/bash

export PYTHONIOENCODING=utf-8
cp -r  ~/Videos .
mkdir Reports
cp raw.log  ./Reports/raw.log
tfs --debug --no-colors transform compact raw.log > ./Reports/compact.log
tfs --debug --no-colors transform nice raw.log   > ./Reports/nice.log.txt
tfs --debug --no-colors report results -a "$CI_JOB_URL/artifacts/browse" raw.log - --confidential --copyright "Altinity Inc" | tfs --debug --no-colors document convert > ./Reports/result.html
tfs --debug --no-colors report coverage - raw.log -  --confidential --copyright "Altinity Inc"  | tfs --debug --no-colors document convert > ./Reports/coverage.html