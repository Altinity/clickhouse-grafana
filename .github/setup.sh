#!/bin/bash

set -x

export RUNNER_IP=$(hostname -I | cut -d ' ' -f 1)
export RUNNER_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$RUNNER_IP"
env
uname -i

sudo rm -rf /var/lib/apt/lists/*
sudo rm -rf /var/cache/debconf
sudo rm -rf /tmp/*

sudo apt-get clean

echo "Install docker-compose..."
sudo curl -SL https://github.com/docker/compose/releases/download/v1.29.2/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "Install required packages..."
./retry.sh 60 2 "sudo pip install -r pip_requirements.txt"
sudo apt-get update
