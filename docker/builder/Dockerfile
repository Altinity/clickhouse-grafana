FROM ubuntu:latest
LABEL maintainer="Altinity <support@altinity.com>"

ARG NODEJS_VERSION=22
ARG GOLANG_VERSION=1.23
ARG TINYGO_VERSION=0.35.0

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

