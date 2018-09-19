pkgs = $(shell go list ./...)

all: grunt build

grunt:
	grunt

format:
	go fmt $(pkgs)
	gofmt -w -s .

lint:
	go vet $(pkgs)
	go list ./... | grep -v /vendor/ | xargs -L1 golint

test:
	go test -v $(pkgs)

build:
	GOOS=darwin GOARCH=amd64 go build -o ./dist/clickhouse-plugin_darwin_amd64 .

#	GOOS=linux GOARCH=amd64 go build -o ./dist/clickhouse-plugin_linux_amd64 .
