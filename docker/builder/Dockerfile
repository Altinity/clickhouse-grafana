# Frontend builder stage with Go 1.19 and Node.js
FROM ubuntu:latest AS frontend-builder
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=22
ARG GOLANG_VERSION=1.19
ARG GOPHERJS_VERSION=1.19.0-beta1

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common && \
    curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION}.x | bash - && \
    apt update && apt install -y nodejs && \
    # Install Go 1.19 for gopherjs compatibility
    curl -fsSL https://go.dev/dl/go${GOLANG_VERSION}.linux-$(dpkg --print-architecture).tar.gz | tar -C /usr/local -xzf - && \
    ln -sf /usr/local/go/bin/go /usr/bin/go && \
    # Install gopherjs (requires Go 1.19)
    go install -v github.com/gopherjs/gopherjs@v${GOPHERJS_VERSION} && \
    go env > $HOME/go_env && . $HOME/go_env && \
    ln -sf "$GOPATH/bin/gopherjs" /usr/bin/gopherjs && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Backend builder stage with Go 1.24
FROM ubuntu:latest AS backend-builder
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=22
ARG GOLANG_VERSION=1.24
ARG TINYGO_VERSION=0.36.0

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common && \
    ( curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION}.x | bash - ) && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 52B59B1571A79DBC054901C0F6BC817356A3D45E && \
    add-apt-repository -y ppa:longsleep/golang-backports && \
    apt update && apt install -y nodejs golang-${GOLANG_VERSION} && \
    ln -nsfv "/usr/lib/go-${GOLANG_VERSION}/bin/go" /usr/bin/go && \
    curl -sL -o "/tmp/tinygo_${TINYGO_VERSION}_amd64.deb" "https://github.com/tinygo-org/tinygo/releases/download/v${TINYGO_VERSION}/tinygo_${TINYGO_VERSION}_amd64.deb" && \
    dpkg -i "/tmp/tinygo_${TINYGO_VERSION}_amd64.deb"  && \
    rm -rfv "/tmp/tinygo_${TINYGO_VERSION}_amd64.deb"  && \
    go install -v github.com/magefile/mage@latest && go env > $HOME/go_env && . $HOME/go_env && ln -nsfv "$GOPATH/bin/mage" /usr/bin/mage && \
    apt clean && rm -rf /var/lib/apt/lists/*
