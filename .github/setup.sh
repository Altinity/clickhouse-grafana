#!/bin/bash

set -x

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
sudo apt-get install -y python3.12-venv

echo "Create and activate Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
echo PATH=$PATH >> $GITHUB_ENV

./retry.sh 60 2 "pip install -r pip_requirements.txt"

sudo apt-get update
sudo apt-get install ffmpeg libsm6 libxext6  -y

echo "Install docker-compose..."
sudo curl -SL https://github.com/docker/compose/releases/download/1.29.2/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

sudo mkdir /tmp/target
sudo chmod 777 /tmp/target

sudo mkdir assets
sudo chmod 777 assets
sudo touch assets/sessions.json
sudo chmod 777 assets/sessions.json
sudo echo '{}' > assets/sessions.json
