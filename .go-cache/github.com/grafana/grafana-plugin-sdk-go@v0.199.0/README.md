# Grafana Plugin SDK for Go

This SDK enables building [Grafana](https://github.com/grafana/grafana) backend plugins using Go.

[![License](https://img.shields.io/github/license/grafana/grafana-plugin-sdk-go)](LICENSE)
[![Go.dev](https://pkg.go.dev/badge/github.com/grafana/grafana-plugin-sdk-go)](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go?tab=doc)
[![Go Report Card](https://goreportcard.com/badge/github.com/grafana/grafana-plugin-sdk-go)](https://goreportcard.com/report/github.com/grafana/grafana-plugin-sdk-go)
[![Circle CI](https://img.shields.io/circleci/build/gh/grafana/grafana-plugin-sdk-go/master)](https://circleci.com/gh/grafana/grafana-plugin-sdk-go?branch=master)

## Current state

This SDK is still in development. The protocol between the Grafana server and the plugin SDK is considered stable, but we might introduce breaking changes in the SDK. This means that plugins using the older SDK should work with Grafana, but might lose out on new features and capabilities that we introduce in the SDK.

## Navigating the SDK

The SDK documentation can be navigated in the form of [Go docs](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go). In particular, you can find the following packages:

- [`backend`](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/backend): Package `backend` provides SDK handler interfaces and contracts for implementing and serving backend plugins. It includes multiple sub-packages.
- [`build`](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/build): Package `build` includes standard mage targets useful when building plugins.
- [`data`](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/data): Package `data` provides data structures that Grafana recognizes. It includes multiple subpackages like `converters`, `framestruct` and `sqlutil`.
- [`experimental`](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/experimental): Package `experimental` provides multiple experimental features. It includes multiple sub-packages.
- [`live`](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go/live): Package `live` provides types for the Grafana Live server.

See the list of all packages [here](https://pkg.go.dev/github.com/grafana/grafana-plugin-sdk-go#section-directories).

## Contributing

If you're interested in contributing to this project:

- Start by reading the [Contributing guide](/CONTRIBUTING.md).
- Learn how to set up your local environment, in our [Developer guide](/contribute/developer-guide.md).

## License

[Apache 2.0 License](https://github.com/grafana/grafana-plugin-sdk-go/blob/master/LICENSE)
