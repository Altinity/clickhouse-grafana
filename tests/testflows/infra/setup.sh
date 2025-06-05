#!/bin/bash

set -xe

export RUNNER_IP=$(hostname -I | cut -d ' ' -f 1)
export RUNNER_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$RUNNER_IP"
env
uname -i

sudo rm -rf /var/lib/apt/lists/*
sudo rm -rf /var/cache/debconf
sudo rm -rf /tmp/*

echo "Install Python modules..."
sudo apt-get clean
sudo apt-get update
sudo apt-get install -y python3-venv

echo "Create and activate Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
echo PATH=$PATH >> $GITHUB_ENV

./tests/testflows/infra/retry.sh 60 2 "pip install -r tests/testflows/requirements.txt"

sudo apt-get update
sudo apt-get install ffmpeg libsm6 libxext6  -y

sudo mkdir tests/testflows/tmp/
sudo mkdir tests/testflows/tmp/target
sudo chmod 777 -R tests/testflows/tmp/

sudo mkdir tests/testflows/assets
sudo chmod 777 tests/testflows/assets
sudo touch tests/testflows/assets/sessions.json
sudo chmod 777 tests/testflows/assets/sessions.json
sudo echo '{}' > tests/testflows/assets/sessions.json
sudo mkdir  ./node_modules
