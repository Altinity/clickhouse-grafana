FROM ubuntu:latest
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=22
ARG GOLANG_VERSION=1.19
ARG GOPHERJS_VERSION=1.19.0-beta1

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common && \
    curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION}.x | bash - && \
    apt update && apt install -y nodejs && \
    # Install Go directly from the official distribution
    curl -fsSL https://go.dev/dl/go${GOLANG_VERSION}.linux-$(dpkg --print-architecture).tar.gz | tar -C /usr/local -xzf - && \
    ln -sf /usr/local/go/bin/go /usr/bin/go && \
    # Install required Go tools
    go install -v github.com/magefile/mage@latest && \
    go install -v github.com/gopherjs/gopherjs@v${GOPHERJS_VERSION} && \
    go env > $HOME/go_env && . $HOME/go_env && \
    ln -sf "$GOPATH/bin/mage" /usr/bin/mage && \
    ln -sf "$GOPATH/bin/gopherjs" /usr/bin/gopherjs && \
    apt clean && rm -rf /var/lib/apt/lists/*
