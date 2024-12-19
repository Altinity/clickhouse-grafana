FROM ubuntu:latest
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=22
ARG GOLANG_VERSION=1.23

RUN apt update && apt install --no-install-recommends -y curl git gnupg2 software-properties-common && \
    ( curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION}.x | bash - ) && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 52B59B1571A79DBC054901C0F6BC817356A3D45E && \
    add-apt-repository -y ppa:longsleep/golang-backports && \
    apt update && apt install -y nodejs golang-${GOLANG_VERSION} && \
    ln -nsfv "/usr/lib/go-${GOLANG_VERSION}/bin/go" /usr/bin/go && \
    go install -v github.com/magefile/mage@latest && go env > $HOME/go_env && . $HOME/go_env && ln -nsfv "$GOPATH/bin/mage" /usr/bin/mage && \
    apt clean && rm -rf /var/lib/apt/lists/*

