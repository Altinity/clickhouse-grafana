# Frontend builder stage with Node.js
FROM ubuntu:latest AS frontend-builder
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=24

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common dirmngr && \
    curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION}.x | bash - && \
    apt update && apt install -y nodejs && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Backend builder stage with Go
FROM ubuntu:latest AS backend-builder
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=24
ARG GOLANG_VERSION=1.26

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common dirmngr && \
    mkdir -p /etc/apt/keyrings && \
    gpg --no-default-keyring \
      --keyring /etc/apt/keyrings/golang-keyring.gpg \
      --keyserver keyserver.ubuntu.com \
      --recv-keys 52B59B1571A79DBC054901C0F6BC817356A3D45E && \
    chmod 644 /etc/apt/keyrings/golang-keyring.gpg && \
    add-apt-repository -y ppa:longsleep/golang-backports && \
    apt update && apt install -y golang-${GOLANG_VERSION} && \
    ln -nsfv "/usr/lib/go-${GOLANG_VERSION}/bin/go" /usr/bin/go && \
    go install -v github.com/magefile/mage@latest && go env > $HOME/go_env && . $HOME/go_env && ln -nsfv "$GOPATH/bin/mage" /usr/bin/mage && \
    apt clean && rm -rf /var/lib/apt/lists/*
