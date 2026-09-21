# Third-Party License Attribution

This file lists third-party dependencies shipped with the `vertamedia-clickhouse-datasource` Grafana plugin, with their SPDX license identifiers.

The plugin consists of two parts, so two separate tools are used:

- **Go backend** (`pkg/`, built into the `clickhouse-plugin_*` binaries) — reported with [`go-licenses`](https://github.com/google/go-licenses).
- **TypeScript frontend** (`src/`, bundled by webpack into `dist/module.js`) — reported with [`license-checker-rseidelsohn`](https://github.com/RSeidelsohn/license-checker-rseidelsohn) over production dependencies from `package.json` (devDependencies are build-time only and are not shipped).

Regenerate with:

```bash
go install github.com/google/go-licenses@latest
npm ci
python3 scripts/generate_third_party_notices.py
```

The main project license is MIT; see [`LICENSE`](LICENSE).

> Note: `@grafana/data`, `@grafana/runtime`, `@grafana/ui`, `react`, `react-dom`, `rxjs`, `lodash`, `moment` and a few other packages are declared as webpack externals and are provided at runtime by Grafana itself rather than bundled into the plugin. They are still listed below for completeness.

## Go backend

### Summary

| License | Packages |
|---------|----------|
| MIT | 22 |
| Apache-2.0 | 21 |
| BSD-3-Clause | 16 |
| Apache-2.0 AND BSD-3-Clause | 11 |
| MPL-2.0 | 2 |
| BSD-2-Clause | 1 |
| MIT AND Apache-2.0 AND BSD-3-Clause | 1 |

**Total packages:** 74

### Packages

| Package | License | License file |
|---------|---------|--------------|
| `github.com/andybalholm/brotli` | MIT | [`LICENSE`](https://github.com/andybalholm/brotli/blob/v1.2.2/LICENSE) |
| `github.com/andybalholm/brotli/flate` | BSD-3-Clause | [`LICENSE`](https://github.com/andybalholm/brotli/blob/v1.2.2/flate/LICENSE) |
| `github.com/apache/arrow-go/v18` | Apache-2.0 AND BSD-3-Clause | [`LICENSE.txt`](https://github.com/apache/arrow-go/blob/v18.7.0/LICENSE.txt) |
| `github.com/beorn7/perks/quantile` | MIT | [`LICENSE`](https://github.com/beorn7/perks/blob/v1.0.1/LICENSE) |
| `github.com/cenkalti/backoff/v5` | MIT | [`LICENSE`](https://github.com/cenkalti/backoff/blob/v5.0.3/LICENSE) |
| `github.com/cespare/xxhash/v2` | MIT | [`LICENSE.txt`](https://github.com/cespare/xxhash/blob/v2.3.0/LICENSE.txt) |
| `github.com/cheekybits/genny/generic` | MIT | [`LICENSE`](https://github.com/cheekybits/genny/blob/v1.0.0/LICENSE) |
| `github.com/clipperhouse/displaywidth` | MIT | [`LICENSE`](https://github.com/clipperhouse/displaywidth/blob/v0.11.0/LICENSE) |
| `github.com/clipperhouse/uax29/v2/graphemes` | MIT | [`LICENSE`](https://github.com/clipperhouse/uax29/blob/v2.7.0/LICENSE) |
| `github.com/dlclark/regexp2` | MIT | [`LICENSE`](https://github.com/dlclark/regexp2/blob/v1.12.0/LICENSE) |
| `github.com/fatih/color` | MIT | [`LICENSE.md`](https://github.com/fatih/color/blob/v1.19.0/LICENSE.md) |
| `github.com/go-logr/logr` | Apache-2.0 | [`LICENSE`](https://github.com/go-logr/logr/blob/v1.4.4/LICENSE) |
| `github.com/go-logr/stdr` | Apache-2.0 | [`LICENSE`](https://github.com/go-logr/stdr/blob/v1.2.2/LICENSE) |
| `github.com/goccy/go-json` | MIT | [`LICENSE`](https://github.com/goccy/go-json/blob/v0.10.6/LICENSE) |
| `github.com/gogo/googleapis/google/api` | Apache-2.0 | [`LICENSE`](https://github.com/gogo/googleapis/blob/v1.4.1/LICENSE) |
| `github.com/gogo/protobuf` | BSD-3-Clause | [`LICENSE`](https://github.com/gogo/protobuf/blob/v1.3.2/LICENSE) |
| `github.com/golang/protobuf/ptypes/empty` | BSD-3-Clause | [`LICENSE`](https://github.com/golang/protobuf/blob/v1.5.4/LICENSE) |
| `github.com/google/flatbuffers/go` | Apache-2.0 | [`LICENSE`](https://github.com/google/flatbuffers/blob/v25.12.19/LICENSE) |
| `github.com/google/go-cmp/cmp` | BSD-3-Clause | [`LICENSE`](https://github.com/google/go-cmp/blob/v0.7.0/LICENSE) |
| `github.com/google/uuid` | BSD-3-Clause | [`LICENSE`](https://github.com/google/uuid/blob/v1.6.0/LICENSE) |
| `github.com/grafana/grafana-plugin-sdk-go` | Apache-2.0 | [`LICENSE`](https://github.com/grafana/grafana-plugin-sdk-go/blob/v0.294.0/LICENSE) |
| `github.com/grafana/otel-profiling-go` | Apache-2.0 | [`LICENSE`](https://github.com/grafana/otel-profiling-go/blob/v0.6.0/LICENSE) |
| `github.com/grafana/pyroscope-go/godeltaprof` | Apache-2.0 | [`LICENSE`](https://github.com/grafana/pyroscope-go/blob/godeltaprof/v0.1.12/godeltaprof/LICENSE) |
| `github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus` | Apache-2.0 | [`LICENSE`](https://github.com/grpc-ecosystem/go-grpc-middleware/blob/providers/prometheus/v1.1.0/providers/prometheus/LICENSE) |
| `github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors` | Apache-2.0 | [`LICENSE`](https://github.com/grpc-ecosystem/go-grpc-middleware/blob/v2.3.3/LICENSE) |
| `github.com/grpc-ecosystem/grpc-gateway/v2` | BSD-3-Clause | [`LICENSE`](https://github.com/grpc-ecosystem/grpc-gateway/blob/v2.29.0/LICENSE) |
| `github.com/hashicorp/go-hclog` | MIT | [`LICENSE`](https://github.com/hashicorp/go-hclog/blob/v1.6.3/LICENSE) |
| `github.com/hashicorp/go-plugin` | MPL-2.0 | [`LICENSE`](https://github.com/hashicorp/go-plugin/blob/v1.8.0/LICENSE) |
| `github.com/hashicorp/yamux` | MPL-2.0 | [`LICENSE`](https://github.com/hashicorp/yamux/blob/v0.1.2/LICENSE) |
| `github.com/jaegertracing/jaeger-idl` | Apache-2.0 | [`LICENSE`](https://github.com/jaegertracing/jaeger-idl/blob/v0.9.0/LICENSE) |
| `github.com/json-iterator/go` | MIT | [`LICENSE`](https://github.com/json-iterator/go/blob/v1.1.12/LICENSE) |
| `github.com/klauspost/compress` | MIT AND Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/klauspost/compress/blob/v1.19.1/LICENSE) |
| `github.com/klauspost/compress/internal/snapref` | BSD-3-Clause | [`LICENSE`](https://github.com/klauspost/compress/blob/v1.19.1/internal/snapref/LICENSE) |
| `github.com/klauspost/compress/zstd/internal/xxhash` | MIT | [`LICENSE.txt`](https://github.com/klauspost/compress/blob/v1.19.1/zstd/internal/xxhash/LICENSE.txt) |
| `github.com/mattetti/filebuffer` | MIT | [`LICENSE`](https://github.com/mattetti/filebuffer/blob/v1.0.1/LICENSE) |
| `github.com/mattn/go-colorable` | MIT | [`LICENSE`](https://github.com/mattn/go-colorable/blob/v0.1.15/LICENSE) |
| `github.com/mattn/go-isatty` | MIT | [`LICENSE`](https://github.com/mattn/go-isatty/blob/v0.0.24/LICENSE) |
| `github.com/mattn/go-runewidth` | MIT | [`LICENSE`](https://github.com/mattn/go-runewidth/blob/v0.0.27/LICENSE) |
| `github.com/modern-go/concurrent` | Apache-2.0 | [`LICENSE`](https://github.com/modern-go/concurrent/blob/bacd9c7ef1dd/LICENSE) |
| `github.com/modern-go/reflect2` | Apache-2.0 | [`LICENSE`](https://github.com/modern-go/reflect2/blob/v1.0.2/LICENSE) |
| `github.com/munnerz/goautoneg` | BSD-3-Clause | [`LICENSE`](https://github.com/munnerz/goautoneg/blob/a7dc8b61c822/LICENSE) |
| `github.com/oklog/run` | Apache-2.0 | [`LICENSE`](https://github.com/oklog/run/blob/v1.2.0/LICENSE) |
| `github.com/olekukonko/cat` | MIT | [`LICENSE`](https://github.com/olekukonko/cat/blob/50322a0618f6/LICENSE) |
| `github.com/olekukonko/errors` | MIT | [`LICENSE`](https://github.com/olekukonko/errors/blob/v1.3.0/LICENSE) |
| `github.com/olekukonko/ll` | MIT | [`LICENSE`](https://github.com/olekukonko/ll/blob/v0.1.8/LICENSE) |
| `github.com/olekukonko/tablewriter` | MIT | [`LICENSE.md`](https://github.com/olekukonko/tablewriter/blob/v1.1.4/LICENSE.md) |
| `github.com/patrickmn/go-cache` | MIT | [`LICENSE`](https://github.com/patrickmn/go-cache/blob/v2.1.0/LICENSE) |
| `github.com/pierrec/lz4/v4` | BSD-3-Clause | [`LICENSE`](https://github.com/pierrec/lz4/blob/v4.1.27/LICENSE) |
| `github.com/prometheus/client_golang/internal/github.com/golang/gddo/httputil` | BSD-3-Clause | [`LICENSE`](https://github.com/prometheus/client_golang/blob/v1.24.1/internal/github.com/golang/gddo/LICENSE) |
| `github.com/prometheus/client_golang/prometheus` | Apache-2.0 | [`LICENSE`](https://github.com/prometheus/client_golang/blob/v1.24.1/LICENSE) |
| `github.com/prometheus/client_model/go` | Apache-2.0 | [`LICENSE`](https://github.com/prometheus/client_model/blob/v0.6.2/LICENSE) |
| `github.com/prometheus/common` | Apache-2.0 | [`LICENSE`](https://github.com/prometheus/common/blob/v0.70.1/LICENSE) |
| `github.com/zeebo/xxh3` | BSD-2-Clause | [`LICENSE`](https://github.com/zeebo/xxh3/blob/v1.1.0/LICENSE) |
| `go.opentelemetry.io/auto/sdk` | Apache-2.0 | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/sdk/v1.2.1/sdk/LICENSE) |
| `go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/instrumentation/google.golang.org/grpc/otelgrpc/v0.69.0/instrumentation/google.golang.org/grpc/otelgrpc/LICENSE) |
| `go.opentelemetry.io/contrib/instrumentation/net/http/httptrace/otelhttptrace` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/instrumentation/net/http/httptrace/otelhttptrace/v0.69.0/instrumentation/net/http/httptrace/otelhttptrace/LICENSE) |
| `go.opentelemetry.io/contrib/propagators/jaeger` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/propagators/jaeger/v1.44.0/propagators/jaeger/LICENSE) |
| `go.opentelemetry.io/contrib/samplers/jaegerremote` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/samplers/jaegerremote/v0.37.1/samplers/jaegerremote/LICENSE) |
| `go.opentelemetry.io/otel` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/v1.44.0/LICENSE) |
| `go.opentelemetry.io/otel/exporters/otlp/otlptrace` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/exporters/otlp/otlptrace/v1.44.0/exporters/otlp/otlptrace/LICENSE) |
| `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/exporters/otlp/otlptrace/otlptracegrpc/v1.44.0/exporters/otlp/otlptrace/otlptracegrpc/LICENSE) |
| `go.opentelemetry.io/otel/metric` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/metric/v1.44.0/metric/LICENSE) |
| `go.opentelemetry.io/otel/sdk` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/sdk/v1.44.0/sdk/LICENSE) |
| `go.opentelemetry.io/otel/trace` | Apache-2.0 AND BSD-3-Clause | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-go/blob/trace/v1.44.0/trace/LICENSE) |
| `go.opentelemetry.io/proto/otlp` | Apache-2.0 | [`LICENSE`](https://github.com/open-telemetry/opentelemetry-proto-go/blob/otlp/v1.11.0/otlp/LICENSE) |
| `golang.org/x/exp/constraints` | BSD-3-Clause | [`764159d7:LICENSE`](https://cs.opensource.google/go/x/exp/+/764159d7:LICENSE) |
| `golang.org/x/net` | BSD-3-Clause | [`v0.57.0:LICENSE`](https://cs.opensource.google/go/x/net/+/v0.57.0:LICENSE) |
| `golang.org/x/sync/errgroup` | BSD-3-Clause | [`v0.22.0:LICENSE`](https://cs.opensource.google/go/x/sync/+/v0.22.0:LICENSE) |
| `golang.org/x/sys` | BSD-3-Clause | [`v0.47.0:LICENSE`](https://cs.opensource.google/go/x/sys/+/v0.47.0:LICENSE) |
| `golang.org/x/text` | BSD-3-Clause | [`v0.40.0:LICENSE`](https://cs.opensource.google/go/x/text/+/v0.40.0:LICENSE) |
| `google.golang.org/genproto/googleapis/api/httpbody` | Apache-2.0 | [`LICENSE`](https://github.com/googleapis/go-genproto/blob/b2f20204f0df/googleapis/api/LICENSE) |
| `google.golang.org/genproto/googleapis/rpc` | Apache-2.0 | [`LICENSE`](https://github.com/googleapis/go-genproto/blob/b2f20204f0df/googleapis/rpc/LICENSE) |
| `google.golang.org/grpc` | Apache-2.0 | [`LICENSE`](https://github.com/grpc/grpc-go/blob/v1.82.1/LICENSE) |
| `google.golang.org/protobuf` | BSD-3-Clause | [`LICENSE`](https://github.com/protocolbuffers/protobuf-go/blob/v1.36.11/LICENSE) |

## TypeScript frontend (npm)

### Summary

| License | Packages |
|---------|----------|
| MIT | 362 |
| Apache-2.0 | 66 |
| ISC | 17 |
| BSD-3-Clause | 9 |
| BSD-2-Clause | 7 |
| Unlicense | 4 |
| CC0-1.0 | 3 |
| 0BSD | 2 |
| Public Domain | 2 |
| (MIT AND Zlib) | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| MIT AND BSD-3-Clause | 1 |
| Python-2.0 | 1 |
| UNKNOWN | 1 |

**Total packages:** 477

### Packages

| Package | Version | License | Repository | License file |
|---------|---------|---------|------------|--------------|
| `@babel/code-frame` | 7.27.1 | MIT | https://github.com/babel/babel | `node_modules/parse-json/node_modules/@babel/code-frame/LICENSE` |
| `@babel/generator` | 7.28.5 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/node_modules/@babel/traverse/node_modules/@babel/generator/LICENSE` |
| `@babel/helper-globals` | 7.28.0 | MIT | https://github.com/babel/babel | `node_modules/@babel/helper-globals/LICENSE` |
| `@babel/helper-module-imports` | 7.27.1 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/LICENSE` |
| `@babel/helper-string-parser` | 7.27.1 | MIT | https://github.com/babel/babel | `node_modules/@babel/helper-string-parser/LICENSE` |
| `@babel/helper-validator-identifier` | 7.28.5 | MIT | https://github.com/babel/babel | `node_modules/@babel/helper-validator-identifier/LICENSE` |
| `@babel/parser` | 7.28.5 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/node_modules/@babel/traverse/node_modules/@babel/parser/LICENSE` |
| `@babel/runtime` | 7.28.4 | MIT | https://github.com/babel/babel | `node_modules/@babel/runtime/LICENSE` |
| `@babel/runtime` | 7.28.6 | MIT | https://github.com/babel/babel | `node_modules/i18next/node_modules/@babel/runtime/LICENSE` |
| `@babel/runtime` | 7.29.7 | MIT | https://github.com/babel/babel | `node_modules/@grafana/runtime/node_modules/@grafana/data/node_modules/@grafana/i18n/node_modules/i18next/node_modules/@babel/runtime/LICENSE` |
| `@babel/template` | 7.27.2 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/node_modules/@babel/traverse/node_modules/@babel/template/LICENSE` |
| `@babel/traverse` | 7.28.5 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/node_modules/@babel/traverse/LICENSE` |
| `@babel/types` | 7.28.5 | MIT | https://github.com/babel/babel | `node_modules/@emotion/babel-plugin/node_modules/@babel/helper-module-imports/node_modules/@babel/types/LICENSE` |
| `@braintree/sanitize-url` | 7.0.1 | MIT | https://github.com/braintree/sanitize-url | `node_modules/@braintree/sanitize-url/LICENSE` |
| `@codemirror/autocomplete` | 6.20.1 | MIT | https://github.com/codemirror/autocomplete | `node_modules/@codemirror/autocomplete/LICENSE` |
| `@codemirror/commands` | 6.10.4 | MIT | git+https://code.haverbeke.berlin/codemirror/commands | `node_modules/@codemirror/commands/LICENSE` |
| `@codemirror/lang-json` | 6.0.2 | MIT | https://github.com/codemirror/lang-json | `node_modules/@codemirror/lang-json/LICENSE` |
| `@codemirror/lang-sql` | 6.10.0 | MIT | https://github.com/codemirror/lang-sql | `node_modules/@codemirror/lang-sql/LICENSE` |
| `@codemirror/language` | 6.12.4 | MIT | git+https://code.haverbeke.berlin/codemirror/language | `node_modules/@codemirror/language/LICENSE` |
| `@codemirror/lint` | 6.9.7 | MIT | git+https://code.haverbeke.berlin/codemirror/lint | `node_modules/@codemirror/lint/LICENSE` |
| `@codemirror/search` | 6.7.1 | MIT | git+https://code.haverbeke.berlin/codemirror/search | `node_modules/@codemirror/search/LICENSE` |
| `@codemirror/state` | 6.6.0 | MIT | https://github.com/codemirror/state | `node_modules/@codemirror/state/LICENSE` |
| `@codemirror/state` | 6.7.1 | MIT | git+https://code.haverbeke.berlin/codemirror/state | `node_modules/@codemirror/commands/node_modules/@codemirror/state/LICENSE` |
| `@codemirror/theme-one-dark` | 6.1.3 | MIT | https://github.com/codemirror/theme-one-dark | `node_modules/@codemirror/theme-one-dark/LICENSE` |
| `@codemirror/view` | 6.41.0 | MIT | https://github.com/codemirror/view | `node_modules/@codemirror/view/LICENSE` |
| `@codemirror/view` | 6.43.6 | MIT | git+https://code.haverbeke.berlin/codemirror/view | `node_modules/@codemirror/lint/node_modules/@codemirror/view/LICENSE` |
| `@emotion/babel-plugin` | 11.13.5 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/babel-plugin/LICENSE` |
| `@emotion/cache` | 11.14.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/cache/LICENSE` |
| `@emotion/css` | 11.13.5 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/css/LICENSE` |
| `@emotion/hash` | 0.9.2 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/hash/LICENSE` |
| `@emotion/memoize` | 0.9.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/memoize/LICENSE` |
| `@emotion/react` | 11.14.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/react/LICENSE` |
| `@emotion/serialize` | 1.3.3 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/serialize/LICENSE` |
| `@emotion/sheet` | 1.4.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/sheet/LICENSE` |
| `@emotion/unitless` | 0.10.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/unitless/LICENSE` |
| `@emotion/use-insertion-effect-with-fallbacks` | 1.2.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/use-insertion-effect-with-fallbacks/LICENSE` |
| `@emotion/utils` | 1.4.2 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/utils/LICENSE` |
| `@emotion/weak-memoize` | 0.4.0 | MIT | https://github.com/emotion-js/emotion.git#main | `node_modules/@emotion/weak-memoize/LICENSE` |
| `@eslint-community/eslint-utils` | 4.9.0 | MIT | https://github.com/eslint-community/eslint-utils | `node_modules/@eslint-community/eslint-utils/LICENSE` |
| `@eslint-community/regexpp` | 4.12.2 | MIT | https://github.com/eslint-community/regexpp | `node_modules/@eslint-community/regexpp/LICENSE` |
| `@eslint/config-array` | 0.21.1 | Apache-2.0 | https://github.com/eslint/rewrite | `node_modules/@eslint/config-array/LICENSE` |
| `@eslint/config-helpers` | 0.4.2 | Apache-2.0 | https://github.com/eslint/rewrite | `node_modules/@eslint/config-helpers/LICENSE` |
| `@eslint/core` | 0.17.0 | Apache-2.0 | https://github.com/eslint/rewrite | `node_modules/@eslint/core/LICENSE` |
| `@eslint/eslintrc` | 3.3.1 | MIT | https://github.com/eslint/eslintrc | `node_modules/@eslint/eslintrc/LICENSE` |
| `@eslint/js` | 9.39.1 | MIT | https://github.com/eslint/eslint | `node_modules/@eslint/js/LICENSE` |
| `@eslint/object-schema` | 2.1.7 | Apache-2.0 | https://github.com/eslint/rewrite | `node_modules/@eslint/object-schema/LICENSE` |
| `@eslint/plugin-kit` | 0.4.1 | Apache-2.0 | https://github.com/eslint/rewrite | `node_modules/@eslint/plugin-kit/LICENSE` |
| `@floating-ui/core` | 1.7.3 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/core/LICENSE` |
| `@floating-ui/core` | 1.8.0 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/react-dom/node_modules/@floating-ui/dom/node_modules/@floating-ui/core/LICENSE` |
| `@floating-ui/dom` | 1.7.4 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/dom/LICENSE` |
| `@floating-ui/dom` | 1.8.0 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/react-dom/node_modules/@floating-ui/dom/LICENSE` |
| `@floating-ui/react` | 0.27.19 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/react/LICENSE` |
| `@floating-ui/react-dom` | 2.1.9 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/react-dom/LICENSE` |
| `@floating-ui/utils` | 0.2.10 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/dom/node_modules/@floating-ui/utils/LICENSE` |
| `@floating-ui/utils` | 0.2.12 | MIT | https://github.com/floating-ui/floating-ui | `node_modules/@floating-ui/utils/LICENSE` |
| `@formatjs/ecma402-abstract` | 2.3.6 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/ecma402-abstract/LICENSE.md` |
| `@formatjs/fast-memoize` | 2.2.7 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/fast-memoize/LICENSE.md` |
| `@formatjs/icu-messageformat-parser` | 2.11.4 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/icu-messageformat-parser/LICENSE.md` |
| `@formatjs/icu-skeleton-parser` | 1.8.16 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/icu-skeleton-parser/LICENSE.md` |
| `@formatjs/intl-durationformat` | 0.7.6 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/intl-durationformat/LICENSE.md` |
| `@formatjs/intl-localematcher` | 0.6.2 | MIT | https://github.com/formatjs/formatjs | `node_modules/@formatjs/intl-localematcher/LICENSE.md` |
| `@grafana/data` | 13.1.0 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/data/README.md` |
| `@grafana/data` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/runtime/node_modules/@grafana/data/README.md` |
| `@grafana/e2e-selectors` | 13.1.0 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/ui/node_modules/@grafana/e2e-selectors/README.md` |
| `@grafana/e2e-selectors` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/e2e-selectors/README.md` |
| `@grafana/faro-core` | 2.8.2 | Apache-2.0 | https://github.com/grafana/faro-web-sdk | `node_modules/@grafana/faro-core/LICENSE` |
| `@grafana/faro-web-sdk` | 2.8.2 | Apache-2.0 | https://github.com/grafana/faro-web-sdk | `node_modules/@grafana/faro-web-sdk/LICENSE` |
| `@grafana/i18n` | 13.1.0 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/i18n/README.md` |
| `@grafana/i18n` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/runtime/node_modules/@grafana/data/node_modules/@grafana/i18n/README.md` |
| `@grafana/react-data-grid` | 7.0.0-beta.57 | MIT | https://github.com/grafana/react-data-grid | `node_modules/@grafana/react-data-grid/LICENSE` |
| `@grafana/runtime` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/runtime/README.md` |
| `@grafana/schema` | 13.1.0 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/schema/README.md` |
| `@grafana/schema` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/runtime/node_modules/@grafana/schema/README.md` |
| `@grafana/ui` | 13.1.0 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/ui/README.md` |
| `@grafana/ui` | 13.1.1 | Apache-2.0 | https://github.com/grafana/grafana | `node_modules/@grafana/runtime/node_modules/@grafana/ui/README.md` |
| `@hello-pangea/dnd` | 18.0.1 | Apache-2.0 | https://github.com/hello-pangea/dnd | `node_modules/@hello-pangea/dnd/LICENSE` |
| `@humanfs/core` | 0.19.1 | Apache-2.0 | https://github.com/humanwhocodes/humanfs | `node_modules/@humanfs/core/LICENSE` |
| `@humanfs/node` | 0.16.7 | Apache-2.0 | https://github.com/humanwhocodes/humanfs | `node_modules/@humanfs/node/LICENSE` |
| `@humanwhocodes/module-importer` | 1.0.1 | Apache-2.0 | https://github.com/humanwhocodes/module-importer | `node_modules/@humanwhocodes/module-importer/LICENSE` |
| `@humanwhocodes/retry` | 0.4.3 | Apache-2.0 | https://github.com/humanwhocodes/retry | `node_modules/@humanwhocodes/retry/LICENSE` |
| `@internationalized/date` | 3.10.0 | Apache-2.0 | https://github.com/adobe/react-spectrum.git#main | `node_modules/@internationalized/date/LICENSE` |
| `@internationalized/message` | 3.1.8 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@internationalized/message/LICENSE` |
| `@internationalized/number` | 3.6.5 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@internationalized/number/LICENSE` |
| `@internationalized/string` | 3.2.7 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@internationalized/string/LICENSE` |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT | https://github.com/jridgewell/sourcemaps | `node_modules/@jridgewell/gen-mapping/LICENSE` |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT | https://github.com/jridgewell/resolve-uri | `node_modules/@jridgewell/resolve-uri/LICENSE` |
| `@jridgewell/sourcemap-codec` | 1.5.5 | MIT | https://github.com/jridgewell/sourcemaps | `node_modules/@jridgewell/sourcemap-codec/LICENSE` |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT | https://github.com/jridgewell/sourcemaps | `node_modules/@jridgewell/trace-mapping/LICENSE` |
| `@leeoniya/ufuzzy` | 1.0.19 | MIT | https://github.com/leeoniya/uFuzzy | `node_modules/@leeoniya/ufuzzy/LICENSE` |
| `@lezer/common` | 1.5.2 | MIT | https://github.com/lezer-parser/common | `node_modules/@lezer/common/LICENSE` |
| `@lezer/highlight` | 1.2.3 | MIT | https://github.com/lezer-parser/highlight | `node_modules/@lezer/highlight/LICENSE` |
| `@lezer/json` | 1.0.3 | MIT | https://github.com/lezer-parser/json | `node_modules/@lezer/json/LICENSE` |
| `@lezer/lr` | 1.4.10 | MIT | git+https://code.haverbeke.berlin/lezer/lr | `node_modules/@lezer/lr/LICENSE` |
| `@marijn/find-cluster-break` | 1.0.3 | MIT | git+https://code.haverbeke.berlin/marijn/find-cluster-break | `node_modules/@marijn/find-cluster-break/LICENSE` |
| `@monaco-editor/loader` | 1.6.1 | MIT | https://github.com/suren-atoyan/monaco-loader | `node_modules/@monaco-editor/loader/LICENSE` |
| `@monaco-editor/react` | 4.7.0 | MIT | https://github.com/suren-atoyan/monaco-react | `node_modules/@monaco-editor/react/LICENSE` |
| `@nodelib/fs.scandir` | 2.1.5 | MIT | https://github.com/nodelib/nodelib.git#master | `node_modules/@nodelib/fs.scandir/LICENSE` |
| `@nodelib/fs.stat` | 2.0.5 | MIT | https://github.com/nodelib/nodelib.git#master | `node_modules/@nodelib/fs.stat/LICENSE` |
| `@nodelib/fs.walk` | 1.2.8 | MIT | https://github.com/nodelib/nodelib.git#master | `node_modules/@nodelib/fs.walk/LICENSE` |
| `@openfeature/core` | 1.11.0 | Apache-2.0 | https://github.com/open-feature/js-sdk | `node_modules/@openfeature/core/LICENSE` |
| `@openfeature/ofrep-core` | 2.3.0 | Apache-2.0 | https://github.com/open-feature/js-sdk-contrib | `node_modules/@openfeature/ofrep-core/LICENSE` |
| `@openfeature/ofrep-web-provider` | 0.4.2 | Apache-2.0 | https://github.com/open-feature/js-sdk-contrib | `node_modules/@openfeature/ofrep-web-provider/LICENSE` |
| `@openfeature/react-sdk` | 1.4.1 | Apache-2.0 | https://github.com/open-feature/js-sdk | `node_modules/@openfeature/react-sdk/LICENSE` |
| `@openfeature/web-sdk` | 1.9.0 | Apache-2.0 | https://github.com/open-feature/js-sdk | `node_modules/@openfeature/web-sdk/LICENSE` |
| `@opentelemetry/api` | 1.9.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/api/LICENSE` |
| `@opentelemetry/api-logs` | 0.219.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/api-logs/LICENSE` |
| `@opentelemetry/core` | 2.8.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/core/LICENSE` |
| `@opentelemetry/otlp-transformer` | 0.219.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/otlp-transformer/LICENSE` |
| `@opentelemetry/resources` | 2.8.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/resources/LICENSE` |
| `@opentelemetry/sdk-logs` | 0.219.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/sdk-logs/LICENSE` |
| `@opentelemetry/sdk-metrics` | 2.8.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/sdk-metrics/LICENSE` |
| `@opentelemetry/sdk-trace-base` | 2.8.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/sdk-trace-base/LICENSE` |
| `@opentelemetry/semantic-conventions` | 1.38.0 | Apache-2.0 | https://github.com/open-telemetry/opentelemetry-js | `node_modules/@opentelemetry/semantic-conventions/LICENSE` |
| `@petamoriken/float16` | 3.9.3 | MIT | https://github.com/petamoriken/float16 | `node_modules/@petamoriken/float16/LICENSE` |
| `@popperjs/core` | 2.11.8 | MIT | https://github.com/popperjs/popper-core | `node_modules/@popperjs/core/LICENSE.md` |
| `@rc-component/cascader` | 1.9.0 | MIT | https://github.com/react-component/cascader | `node_modules/@rc-component/cascader/LICENSE.md` |
| `@rc-component/drawer` | 1.3.0 | MIT | https://github.com/react-component/drawer | `node_modules/@rc-component/drawer/LICENSE` |
| `@rc-component/motion` | 1.3.1 | MIT | https://github.com/react-component/motion | `node_modules/@rc-component/motion/LICENSE.md` |
| `@rc-component/overflow` | 1.0.0 | MIT | https://github.com/react-component/overflow | `node_modules/@rc-component/overflow/LICENSE.md` |
| `@rc-component/portal` | 2.2.0 | MIT | https://github.com/react-component/portal | `node_modules/@rc-component/portal/LICENSE` |
| `@rc-component/resize-observer` | 1.1.1 | MIT | https://github.com/react-component/resize-observer | `node_modules/@rc-component/resize-observer/LICENSE.md` |
| `@rc-component/select` | 1.3.6 | MIT | https://github.com/react-component/select | `node_modules/@rc-component/select/LICENSE.md` |
| `@rc-component/slider` | 1.0.1 | MIT | https://github.com/react-component/slider | `node_modules/@rc-component/slider/LICENSE` |
| `@rc-component/tooltip` | 1.4.0 | MIT | https://github.com/react-component/tooltip | `node_modules/@rc-component/tooltip/LICENSE` |
| `@rc-component/tree` | 1.1.0 | MIT | https://github.com/react-component/tree | `node_modules/@rc-component/tree/LICENSE.md` |
| `@rc-component/trigger` | 3.9.0 | MIT | https://github.com/react-component/trigger | `node_modules/@rc-component/trigger/LICENSE` |
| `@rc-component/util` | 1.9.0 | MIT | https://github.com/react-component/util | `node_modules/@rc-component/util/LICENSE` |
| `@rc-component/virtual-list` | 1.0.2 | MIT | https://github.com/react-component/virtual-list | `node_modules/@rc-component/virtual-list/LICENSE` |
| `@react-aria/dialog` | 3.5.31 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/dialog/LICENSE` |
| `@react-aria/focus` | 3.21.2 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/focus/LICENSE` |
| `@react-aria/i18n` | 3.12.13 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/i18n/LICENSE` |
| `@react-aria/interactions` | 3.25.6 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/interactions/LICENSE` |
| `@react-aria/overlays` | 3.30.0 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/overlays/LICENSE` |
| `@react-aria/ssr` | 3.9.10 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/ssr/LICENSE` |
| `@react-aria/utils` | 3.31.0 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/utils/LICENSE` |
| `@react-aria/visually-hidden` | 3.8.28 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-aria/visually-hidden/LICENSE` |
| `@react-stately/flags` | 3.1.2 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-stately/flags/LICENSE` |
| `@react-stately/overlays` | 3.6.20 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-stately/overlays/LICENSE` |
| `@react-stately/utils` | 3.10.8 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-stately/utils/LICENSE` |
| `@react-types/button` | 3.14.1 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-types/button/LICENSE` |
| `@react-types/dialog` | 3.5.22 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-types/dialog/LICENSE` |
| `@react-types/overlays` | 3.9.2 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-types/overlays/LICENSE` |
| `@react-types/shared` | 3.32.1 | Apache-2.0 | https://github.com/adobe/react-spectrum | `node_modules/@react-types/shared/LICENSE` |
| `@remix-run/router` | 1.23.2 | MIT | https://github.com/remix-run/react-router | `node_modules/@remix-run/router/LICENSE.md` |
| `@swc/helpers` | 0.5.17 | Apache-2.0 | https://github.com/swc-project/swc | `node_modules/@react-aria/interactions/node_modules/@swc/helpers/LICENSE` |
| `@swc/helpers` | 0.5.19 | Apache-2.0 | https://github.com/swc-project/swc | `node_modules/@swc/helpers/LICENSE` |
| `@tanstack/react-virtual` | 3.13.12 | MIT | https://github.com/TanStack/virtual | `node_modules/@tanstack/react-virtual/LICENSE` |
| `@tanstack/virtual-core` | 3.13.12 | MIT | https://github.com/TanStack/virtual | `node_modules/@tanstack/virtual-core/LICENSE` |
| `@types/d3-color` | 3.1.3 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/d3-color/LICENSE` |
| `@types/d3-interpolate` | 3.0.4 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/d3-interpolate/LICENSE` |
| `@types/estree` | 1.0.8 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/estree/LICENSE` |
| `@types/jquery` | 3.5.33 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/jquery/LICENSE` |
| `@types/js-cookie` | 2.2.7 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/js-cookie/LICENSE` |
| `@types/json-schema` | 7.0.15 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/json-schema/LICENSE` |
| `@types/lodash` | 4.17.20 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@grafana/runtime/node_modules/@grafana/ui/node_modules/@types/lodash/LICENSE` |
| `@types/parse-json` | 4.0.2 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/parse-json/LICENSE` |
| `@types/rbush` | 4.0.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/rbush/LICENSE` |
| `@types/react` | 19.2.3 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/react/LICENSE` |
| `@types/react-table` | 7.7.20 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/react-table/LICENSE` |
| `@types/react-transition-group` | 4.4.12 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/react-transition-group/LICENSE` |
| `@types/sizzle` | 2.3.10 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/sizzle/LICENSE` |
| `@types/string-hash` | 1.1.3 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/string-hash/LICENSE` |
| `@types/systemjs` | 6.15.3 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/systemjs/LICENSE` |
| `@types/trusted-types` | 2.0.7 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/trusted-types/LICENSE` |
| `@types/use-sync-external-store` | 0.0.6 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | `node_modules/@types/use-sync-external-store/LICENSE` |
| `@typescript-eslint/project-service` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/project-service/LICENSE` |
| `@typescript-eslint/scope-manager` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/scope-manager/LICENSE` |
| `@typescript-eslint/tsconfig-utils` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/tsconfig-utils/LICENSE` |
| `@typescript-eslint/types` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/types/LICENSE` |
| `@typescript-eslint/typescript-estree` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/typescript-estree/LICENSE` |
| `@typescript-eslint/utils` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/utils/LICENSE` |
| `@typescript-eslint/visitor-keys` | 8.46.4 | MIT | https://github.com/typescript-eslint/typescript-eslint | `node_modules/@typescript-eslint/visitor-keys/LICENSE` |
| `@uiw/codemirror-extensions-basic-setup` | 4.25.9 | MIT | https://github.com/uiwjs/react-codemirror | `node_modules/@uiw/codemirror-extensions-basic-setup/README.md` |
| `@uiw/codemirror-theme-vscode` | 4.25.9 | MIT | https://github.com/uiwjs/react-codemirror | `node_modules/@uiw/codemirror-theme-vscode/README.md` |
| `@uiw/codemirror-themes` | 4.25.9 | MIT | https://github.com/uiwjs/react-codemirror | `node_modules/@uiw/codemirror-themes/README.md` |
| `@uiw/react-codemirror` | 4.25.9 | MIT | https://github.com/uiwjs/react-codemirror | `node_modules/@uiw/react-codemirror/README.md` |
| `@wojtekmaj/date-utils` | 2.0.2 | MIT | https://github.com/wojtekmaj/date-utils | `node_modules/@wojtekmaj/date-utils/LICENSE` |
| `@xobotyi/scrollbar-width` | 1.9.5 | MIT | https://github.com/xobotyi/scrollbar-width | `node_modules/@xobotyi/scrollbar-width/LICENSE` |
| `acorn` | 8.15.0 | MIT | https://github.com/acornjs/acorn | `node_modules/acorn/LICENSE` |
| `acorn-jsx` | 5.3.2 | MIT | https://github.com/acornjs/acorn-jsx | `node_modules/acorn-jsx/LICENSE` |
| `add-px-to-style` | 1.0.0 | MIT | https://github.com/mikkoh/add-px-to-style | `node_modules/add-px-to-style/LICENSE.md` |
| `ajv` | 6.12.6 | MIT | https://github.com/ajv-validator/ajv | `node_modules/ajv/LICENSE` |
| `altinity-clickhouse-grafana` | 3.5.0 | MIT | https://www.npmjs.com/package/altinity-clickhouse-grafana | `LICENSE` |
| `ansi-styles` | 4.3.0 | MIT | https://github.com/chalk/ansi-styles | `node_modules/chalk/node_modules/ansi-styles/license` |
| `argparse` | 2.0.1 | Python-2.0 | https://github.com/nodeca/argparse | `node_modules/@eslint/eslintrc/node_modules/js-yaml/node_modules/argparse/LICENSE` |
| `attr-accept` | 2.2.5 | MIT | https://github.com/react-dropzone/attr-accept | `node_modules/attr-accept/LICENSE` |
| `babel-plugin-macros` | 3.1.0 | MIT | https://github.com/kentcdodds/babel-plugin-macros | `node_modules/babel-plugin-macros/LICENSE` |
| `balanced-match` | 1.0.2 | MIT | https://github.com/juliangruber/balanced-match | `node_modules/balanced-match/LICENSE.md` |
| `brace-expansion` | 1.1.12 | MIT | https://github.com/juliangruber/brace-expansion | `node_modules/brace-expansion/LICENSE` |
| `brace-expansion` | 2.0.2 | MIT | https://github.com/juliangruber/brace-expansion | `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch/node_modules/brace-expansion/LICENSE` |
| `braces` | 3.0.3 | MIT | https://github.com/micromatch/braces | `node_modules/braces/LICENSE` |
| `calculate-size` | 1.1.1 | MIT | https://github.com/schickling/calculate-size | `node_modules/calculate-size/LICENSE` |
| `callsites` | 3.1.0 | MIT | https://github.com/sindresorhus/callsites | `node_modules/callsites/license` |
| `chalk` | 4.1.2 | MIT | https://github.com/chalk/chalk | `node_modules/chalk/license` |
| `classnames` | 2.5.1 | MIT | https://github.com/JedWatson/classnames | `node_modules/classnames/LICENSE` |
| `clsx` | 2.1.1 | MIT | https://github.com/lukeed/clsx | `node_modules/clsx/license` |
| `codemirror` | 6.0.2 | MIT | https://github.com/codemirror/basic-setup | `node_modules/codemirror/LICENSE` |
| `color-convert` | 2.0.1 | MIT | https://github.com/Qix-/color-convert | `node_modules/color-convert/LICENSE` |
| `color-name` | 1.1.4 | MIT | https://github.com/colorjs/color-name | `node_modules/color-name/LICENSE` |
| `commander` | 2.20.3 | MIT | https://github.com/tj/commander.js | `node_modules/xss/node_modules/commander/LICENSE` |
| `compute-scroll-into-view` | 3.1.1 | MIT | https://github.com/scroll-into-view/compute-scroll-into-view | `node_modules/compute-scroll-into-view/LICENSE` |
| `concat-map` | 0.0.1 | MIT | https://github.com/substack/node-concat-map | `node_modules/concat-map/LICENSE` |
| `convert-source-map` | 1.9.0 | MIT | https://github.com/thlorenz/convert-source-map | `node_modules/@emotion/babel-plugin/node_modules/convert-source-map/LICENSE` |
| `copy-to-clipboard` | 3.3.3 | MIT | https://github.com/sudodoki/copy-to-clipboard | `node_modules/copy-to-clipboard/LICENSE` |
| `cosmiconfig` | 7.1.0 | MIT | https://github.com/davidtheclark/cosmiconfig | `node_modules/babel-plugin-macros/node_modules/cosmiconfig/LICENSE` |
| `crelt` | 1.0.7 | MIT | git+https://code.haverbeke.berlin/marijn/crelt | `node_modules/crelt/LICENSE` |
| `cross-spawn` | 7.0.6 | MIT | https://github.com/moxystudio/node-cross-spawn | `node_modules/cross-spawn/LICENSE` |
| `css-box-model` | 1.2.1 | MIT | https://github.com/alexreardon/css-box-model | `node_modules/css-box-model/LICENSE` |
| `css-in-js-utils` | 3.1.0 | MIT | https://github.com/robinweser/css-in-js-utils | `node_modules/css-in-js-utils/LICENSE` |
| `css-tree` | 1.1.3 | MIT | https://github.com/csstree/csstree | `node_modules/css-tree/LICENSE` |
| `cssfilter` | 0.0.10 | MIT | https://github.com/leizongmin/js-css-filter | `node_modules/cssfilter/LICENSE` |
| `csstype` | 3.1.3 | MIT | https://github.com/frenic/csstype | `node_modules/csstype/LICENSE` |
| `d3-color` | 3.1.0 | ISC | https://github.com/d3/d3-color | `node_modules/d3-color/LICENSE` |
| `d3-interpolate` | 3.0.1 | ISC | https://github.com/d3/d3-interpolate | `node_modules/d3-interpolate/LICENSE` |
| `d3-scale-chromatic` | 3.1.0 | ISC | https://github.com/d3/d3-scale-chromatic | `node_modules/d3-scale-chromatic/LICENSE` |
| `date-fns` | 4.1.0 | MIT | https://github.com/date-fns/date-fns | `node_modules/date-fns/LICENSE.md` |
| `date-fns-tz` | 3.2.0 | MIT | https://github.com/marnusw/date-fns-tz | `node_modules/date-fns-tz/LICENSE.md` |
| `debug` | 3.2.7 | MIT | https://github.com/visionmedia/debug | `node_modules/slate/node_modules/debug/LICENSE` |
| `debug` | 4.4.3 | MIT | https://github.com/debug-js/debug | `node_modules/debug/LICENSE` |
| `decimal.js` | 10.6.0 | MIT | https://github.com/MikeMcl/decimal.js | `node_modules/decimal.js/LICENCE.md` |
| `deep-is` | 0.1.4 | MIT | https://github.com/thlorenz/deep-is | `node_modules/deep-is/LICENSE` |
| `direction` | 0.1.5 | MIT | https://github.com/wooorm/direction | `node_modules/direction/LICENSE` |
| `dom-css` | 2.1.0 | MIT | https://github.com/mattdesl/dom-css | `node_modules/dom-css/LICENSE.md` |
| `dom-helpers` | 5.2.1 | MIT | https://github.com/react-bootstrap/dom-helpers | `node_modules/dom-helpers/LICENSE` |
| `dompurify` | 3.4.12 | (MPL-2.0 OR Apache-2.0) | https://github.com/cure53/DOMPurify | `node_modules/dompurify/LICENSE` |
| `downshift` | 9.0.10 | MIT | https://github.com/downshift-js/downshift | `node_modules/downshift/LICENSE` |
| `earcut` | 3.0.2 | ISC | https://github.com/mapbox/earcut | `node_modules/earcut/LICENSE` |
| `error-ex` | 1.3.4 | MIT | https://github.com/qix-/node-error-ex | `node_modules/error-ex/LICENSE` |
| `error-stack-parser` | 2.1.4 | MIT | https://github.com/stacktracejs/error-stack-parser | `node_modules/error-stack-parser/LICENSE` |
| `escape-string-regexp` | 4.0.0 | MIT | https://github.com/sindresorhus/escape-string-regexp | `node_modules/escape-string-regexp/license` |
| `eslint` | 9.39.1 | MIT | https://github.com/eslint/eslint | `node_modules/eslint/LICENSE` |
| `eslint-scope` | 8.4.0 | BSD-2-Clause | https://github.com/eslint/js | `node_modules/eslint/node_modules/eslint-scope/LICENSE` |
| `eslint-visitor-keys` | 3.4.3 | Apache-2.0 | https://github.com/eslint/eslint-visitor-keys | `node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys/LICENSE` |
| `eslint-visitor-keys` | 4.2.1 | Apache-2.0 | https://github.com/eslint/js | `node_modules/eslint-visitor-keys/LICENSE` |
| `espree` | 10.4.0 | BSD-2-Clause | https://github.com/eslint/js | `node_modules/espree/LICENSE` |
| `esquery` | 1.6.0 | BSD-3-Clause | https://github.com/estools/esquery | `node_modules/esquery/license.txt` |
| `esrecurse` | 4.3.0 | BSD-2-Clause | https://github.com/estools/esrecurse | `node_modules/esrecurse/README.md` |
| `esrever` | 0.2.0 | MIT | https://github.com/mathiasbynens/esrever | `node_modules/esrever/LICENSE-MIT.txt` |
| `estraverse` | 5.3.0 | BSD-2-Clause | https://github.com/estools/estraverse | `node_modules/estraverse/LICENSE.BSD` |
| `esutils` | 2.0.3 | BSD-2-Clause | https://github.com/estools/esutils | `node_modules/esutils/LICENSE.BSD` |
| `eventemitter3` | 5.0.1 | MIT | https://github.com/primus/eventemitter3 | `node_modules/eventemitter3/LICENSE` |
| `fast-deep-equal` | 3.1.3 | MIT | https://github.com/epoberezkin/fast-deep-equal | `node_modules/fast-deep-equal/LICENSE` |
| `fast-glob` | 3.3.3 | MIT | https://github.com/mrmlnc/fast-glob | `node_modules/fast-glob/LICENSE` |
| `fast-json-patch` | 3.1.1 | MIT | https://github.com/Starcounter-Jack/JSON-Patch | `node_modules/fast-json-patch/LICENSE.txt` |
| `fast-json-stable-stringify` | 2.1.0 | MIT | https://github.com/epoberezkin/fast-json-stable-stringify | `node_modules/fast-json-stable-stringify/LICENSE` |
| `fast-levenshtein` | 2.0.6 | MIT | https://github.com/hiddentao/fast-levenshtein | `node_modules/fast-levenshtein/LICENSE.md` |
| `fast-shallow-equal` | 1.0.0 | Public Domain | https://github.com/streamich/fast-shallow-equal | `node_modules/fast-shallow-equal/LICENSE` |
| `fastest-stable-stringify` | 2.0.2 | MIT | https://github.com/streamich/fastest-stable-stringify | `node_modules/fastest-stable-stringify/LICENSE` |
| `fastq` | 1.19.1 | ISC | https://github.com/mcollina/fastq | `node_modules/fastq/LICENSE` |
| `file-entry-cache` | 8.0.0 | MIT | https://github.com/jaredwray/file-entry-cache | `node_modules/file-entry-cache/LICENSE` |
| `file-selector` | 2.1.2 | MIT | https://github.com/react-dropzone/file-selector | `node_modules/file-selector/LICENSE` |
| `fill-range` | 7.1.1 | MIT | https://github.com/jonschlinkert/fill-range | `node_modules/fill-range/LICENSE` |
| `find-root` | 1.1.0 | MIT | https://github.com/js-n/find-root | `node_modules/find-root/LICENSE.md` |
| `find-up` | 5.0.0 | MIT | https://github.com/sindresorhus/find-up | `node_modules/eslint/node_modules/find-up/license` |
| `flat-cache` | 4.0.1 | MIT | https://github.com/jaredwray/flat-cache | `node_modules/flat-cache/LICENSE` |
| `flatted` | 3.3.3 | ISC | https://github.com/WebReflection/flatted | `node_modules/flatted/LICENSE` |
| `function-bind` | 1.1.2 | MIT | https://github.com/Raynos/function-bind | `node_modules/function-bind/LICENSE` |
| `geotiff` | 2.1.3 | MIT | https://github.com/geotiffjs/geotiff.js | `node_modules/geotiff/LICENSE` |
| `get-document` | 1.0.0 | UNKNOWN | https://github.com/webmodules/get-document | `node_modules/get-document/README.md` |
| `get-user-locale` | 3.0.0 | MIT | https://github.com/wojtekmaj/get-user-locale | `node_modules/get-user-locale/LICENSE` |
| `get-window` | 1.1.2 | MIT | https://github.com/webmodules/get-window | `node_modules/get-window/LICENSE` |
| `glob-parent` | 5.1.2 | ISC | https://github.com/gulpjs/glob-parent | `node_modules/fast-glob/node_modules/glob-parent/LICENSE` |
| `glob-parent` | 6.0.2 | ISC | https://github.com/gulpjs/glob-parent | `node_modules/glob-parent/LICENSE` |
| `globals` | 14.0.0 | MIT | https://github.com/sindresorhus/globals | `node_modules/globals/license` |
| `has-flag` | 4.0.0 | MIT | https://github.com/sindresorhus/has-flag | `node_modules/chalk/node_modules/supports-color/node_modules/has-flag/license` |
| `hasown` | 2.0.2 | MIT | https://github.com/inspect-js/hasOwn | `node_modules/hasown/LICENSE` |
| `highlight-words-core` | 1.2.3 | MIT | github.com/bvaughn/highlight-words-core | `node_modules/highlight-words-core/LICENSE` |
| `history` | 4.10.1 | MIT | https://github.com/ReactTraining/history | `node_modules/history/LICENSE` |
| `history` | 5.3.0 | MIT | https://github.com/remix-run/history | `node_modules/react-router-dom-v5-compat/node_modules/history/LICENSE` |
| `hoist-non-react-statics` | 3.3.2 | BSD-3-Clause | https://github.com/mridgway/hoist-non-react-statics | `node_modules/hoist-non-react-statics/LICENSE.md` |
| `html-parse-stringify` | 3.0.1 | MIT | https://github.com/henrikjoreteg/html-parse-stringify | `node_modules/html-parse-stringify/README.md` |
| `hyphenate-style-name` | 1.1.0 | BSD-3-Clause | https://github.com/rexxars/hyphenate-style-name | `node_modules/hyphenate-style-name/LICENSE` |
| `i18next` | 19.9.2 | MIT | https://github.com/i18next/i18next | `node_modules/i18next-pseudo/node_modules/i18next/LICENSE` |
| `i18next` | 25.10.10 | MIT | https://github.com/i18next/i18next | `node_modules/@grafana/runtime/node_modules/@grafana/data/node_modules/@grafana/i18n/node_modules/i18next/LICENSE` |
| `i18next` | 25.8.17 | MIT | https://github.com/i18next/i18next | `node_modules/i18next/LICENSE` |
| `i18next-browser-languagedetector` | 8.2.0 | MIT | https://github.com/i18next/i18next-browser-languageDetector | `node_modules/i18next-browser-languagedetector/LICENSE` |
| `i18next-pseudo` | 2.2.1 | MIT | https://github.com/MattBoatman/i18next-pseudo | `node_modules/i18next-pseudo/LICENSE` |
| `ignore` | 5.3.2 | MIT | https://github.com/kaelzhang/node-ignore | `node_modules/eslint/node_modules/ignore/LICENSE-MIT` |
| `immutable` | 5.1.5 | MIT | https://github.com/immutable-js/immutable-js | `node_modules/immutable/LICENSE` |
| `import-fresh` | 3.3.1 | MIT | https://github.com/sindresorhus/import-fresh | `node_modules/import-fresh/license` |
| `imurmurhash` | 0.1.4 | MIT | https://github.com/jensyt/imurmurhash-js | `node_modules/imurmurhash/README.md` |
| `inline-style-prefixer` | 7.0.1 | MIT | https://github.com/robinweser/inline-style-prefixer | `node_modules/inline-style-prefixer/LICENSE` |
| `intl-messageformat` | 10.7.18 | BSD-3-Clause | https://github.com/formatjs/formatjs | `node_modules/intl-messageformat/LICENSE.md` |
| `invariant` | 2.2.4 | MIT | https://github.com/zertosh/invariant | `node_modules/invariant/LICENSE` |
| `is-arrayish` | 0.2.1 | MIT | https://github.com/qix-/node-is-arrayish | `node_modules/is-arrayish/LICENSE` |
| `is-core-module` | 2.16.1 | MIT | https://github.com/inspect-js/is-core-module | `node_modules/is-core-module/LICENSE` |
| `is-extglob` | 2.1.1 | MIT | https://github.com/jonschlinkert/is-extglob | `node_modules/is-extglob/LICENSE` |
| `is-glob` | 4.0.3 | MIT | https://github.com/micromatch/is-glob | `node_modules/is-glob/LICENSE` |
| `is-hotkey` | 0.1.4 | MIT | https://github.com/ianstormtaylor/is-hotkey | `node_modules/slate-hotkeys/node_modules/is-hotkey/License.md` |
| `is-hotkey` | 0.2.0 | MIT | https://github.com/ianstormtaylor/is-hotkey | `node_modules/is-hotkey/License.md` |
| `is-in-browser` | 1.1.3 | MIT | https://github.com/tuxsudo/is-in-browser | `node_modules/is-in-browser/readme.md` |
| `is-mobile` | 5.0.0 | MIT | https://github.com/juliangruber/is-mobile | `node_modules/is-mobile/README.md` |
| `is-number` | 7.0.0 | MIT | https://github.com/jonschlinkert/is-number | `node_modules/is-number/LICENSE` |
| `is-plain-object` | 2.0.4 | MIT | https://github.com/jonschlinkert/is-plain-object | `node_modules/is-plain-object/LICENSE` |
| `is-window` | 1.0.2 | MIT | https://github.com/gearcase/is-window | `node_modules/is-window/LICENSE` |
| `isarray` | 0.0.1 | MIT | https://github.com/juliangruber/isarray | `node_modules/path-to-regexp/node_modules/isarray/README.md` |
| `isexe` | 2.0.0 | ISC | https://github.com/isaacs/isexe | `node_modules/isexe/LICENSE` |
| `isobject` | 3.0.1 | MIT | https://github.com/jonschlinkert/isobject | `node_modules/isobject/LICENSE` |
| `isomorphic-base64` | 1.0.2 | MIT | https://github.com/ksheedlo/isomorphic-base64 | `node_modules/isomorphic-base64/README.md` |
| `jquery` | 3.7.1 | MIT | https://github.com/jquery/jquery | `node_modules/jquery/LICENSE.txt` |
| `js-cookie` | 3.0.8 | MIT | https://github.com/js-cookie/js-cookie | `node_modules/js-cookie/LICENSE` |
| `js-tokens` | 4.0.0 | MIT | https://github.com/lydell/js-tokens | `node_modules/js-tokens/LICENSE` |
| `js-yaml` | 4.1.1 | MIT | https://github.com/nodeca/js-yaml | `node_modules/@eslint/eslintrc/node_modules/js-yaml/LICENSE` |
| `jsesc` | 3.1.0 | MIT | https://github.com/mathiasbynens/jsesc | `node_modules/jsesc/LICENSE-MIT.txt` |
| `json-buffer` | 3.0.1 | MIT | https://github.com/dominictarr/json-buffer | `node_modules/json-buffer/LICENSE` |
| `json-parse-even-better-errors` | 2.3.1 | MIT | https://github.com/npm/json-parse-even-better-errors | `node_modules/json-parse-even-better-errors/LICENSE.md` |
| `json-schema-traverse` | 0.4.1 | MIT | https://github.com/epoberezkin/json-schema-traverse | `node_modules/json-schema-traverse/LICENSE` |
| `json-stable-stringify-without-jsonify` | 1.0.1 | MIT | https://github.com/samn/json-stable-stringify | `node_modules/json-stable-stringify-without-jsonify/LICENSE` |
| `keyv` | 4.5.4 | MIT | https://github.com/jaredwray/keyv | `node_modules/keyv/README.md` |
| `lerc` | 3.0.0 | Apache-2.0 | https://github.com/Esri/lerc | `node_modules/lerc/README.hbs` |
| `levn` | 0.4.1 | MIT | https://github.com/gkz/levn | `node_modules/levn/LICENSE` |
| `lines-and-columns` | 1.2.4 | MIT | https://github.com/eventualbuddha/lines-and-columns | `node_modules/lines-and-columns/LICENSE` |
| `locate-path` | 6.0.0 | MIT | https://github.com/sindresorhus/locate-path | `node_modules/eslint/node_modules/find-up/node_modules/locate-path/license` |
| `lodash` | 4.17.21 | MIT | https://github.com/lodash/lodash | `node_modules/slate/node_modules/lodash/LICENSE` |
| `lodash` | 4.17.23 | MIT | https://github.com/lodash/lodash | `node_modules/lodash/LICENSE` |
| `lodash.merge` | 4.6.2 | MIT | https://github.com/lodash/lodash | `node_modules/lodash.merge/LICENSE` |
| `loose-envify` | 1.4.0 | MIT | https://github.com/zertosh/loose-envify | `node_modules/loose-envify/LICENSE` |
| `lossless-json` | 4.3.0 | MIT | https://github.com/josdejong/lossless-json | `node_modules/lossless-json/LICENSE.md` |
| `lru-cache` | 11.2.2 | ISC | https://github.com/isaacs/node-lru-cache | `node_modules/lru-cache/LICENSE` |
| `luxon` | 3.7.2 | MIT | https://github.com/moment/luxon | `node_modules/luxon/LICENSE.md` |
| `marked` | 16.3.0 | MIT | https://github.com/markedjs/marked | `node_modules/marked/LICENSE.md` |
| `marked-mangle` | 1.1.12 | MIT | https://github.com/markedjs/marked-mangle | `node_modules/marked-mangle/LICENSE` |
| `mdn-data` | 2.0.14 | CC0-1.0 | https://github.com/mdn/data | `node_modules/mdn-data/LICENSE` |
| `memoize` | 10.2.0 | MIT | https://github.com/sindresorhus/memoize | `node_modules/memoize/license` |
| `memoize-one` | 4.0.3 | MIT | https://github.com/alexreardon/memoize-one | `node_modules/memoize-one/LICENSE` |
| `memoize-one` | 5.2.1 | MIT | https://github.com/alexreardon/memoize-one | `node_modules/react-window/node_modules/memoize-one/LICENSE` |
| `memoize-one` | 6.0.0 | MIT | https://github.com/alexreardon/memoize-one | `node_modules/react-select/node_modules/memoize-one/LICENSE` |
| `merge2` | 1.4.1 | MIT | https://github.com/teambition/merge2 | `node_modules/merge2/LICENSE` |
| `micro-memoize` | 4.2.0 | MIT | https://github.com/planttheidea/micro-memoize | `node_modules/micro-memoize/LICENSE` |
| `micromatch` | 4.0.8 | MIT | https://github.com/micromatch/micromatch | `node_modules/micromatch/LICENSE` |
| `mimic-function` | 5.0.1 | MIT | https://github.com/sindresorhus/mimic-function | `node_modules/mimic-function/license` |
| `minimatch` | 3.1.2 | ISC | https://github.com/isaacs/minimatch | `node_modules/minimatch/LICENSE` |
| `minimatch` | 9.0.5 | ISC | https://github.com/isaacs/minimatch | `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch/LICENSE` |
| `moment` | 2.30.1 | MIT | https://github.com/moment/moment | `node_modules/moment/LICENSE` |
| `moment-timezone` | 0.5.47 | MIT | https://github.com/moment/moment-timezone | `node_modules/moment-timezone/LICENSE` |
| `monaco-editor` | 0.34.1 | MIT | https://github.com/microsoft/monaco-editor | `node_modules/monaco-editor/LICENSE` |
| `ms` | 2.1.3 | MIT | https://github.com/vercel/ms | `node_modules/ms/license.md` |
| `nano-css` | 5.6.2 | Unlicense | https://github.com/streamich/nano-css | `node_modules/nano-css/LICENSE` |
| `natural-compare` | 1.4.0 | MIT | https://github.com/litejs/natural-compare-lite | `node_modules/natural-compare/README.md` |
| `object-assign` | 4.1.1 | MIT | https://github.com/sindresorhus/object-assign | `node_modules/object-assign/license` |
| `ol` | 10.7.0 | BSD-2-Clause | https://github.com/openlayers/openlayers | `node_modules/ol/LICENSE.md` |
| `optionator` | 0.9.4 | MIT | https://github.com/gkz/optionator | `node_modules/optionator/LICENSE` |
| `p-limit` | 3.1.0 | MIT | https://github.com/sindresorhus/p-limit | `node_modules/p-limit/license` |
| `p-locate` | 5.0.0 | MIT | https://github.com/sindresorhus/p-locate | `node_modules/eslint/node_modules/find-up/node_modules/locate-path/node_modules/p-locate/license` |
| `pako` | 2.1.0 | (MIT AND Zlib) | https://github.com/nodeca/pako | `node_modules/pako/LICENSE` |
| `papaparse` | 5.5.3 | MIT | https://github.com/mholt/PapaParse | `node_modules/papaparse/LICENSE` |
| `parent-module` | 1.0.1 | MIT | https://github.com/sindresorhus/parent-module | `node_modules/parent-module/license` |
| `parse-headers` | 2.0.6 | MIT | https://github.com/kesla/parse-headers | `node_modules/parse-headers/LICENCE` |
| `parse-json` | 5.2.0 | MIT | https://github.com/sindresorhus/parse-json | `node_modules/parse-json/license` |
| `path-exists` | 4.0.0 | MIT | https://github.com/sindresorhus/path-exists | `node_modules/path-exists/license` |
| `path-key` | 3.1.1 | MIT | https://github.com/sindresorhus/path-key | `node_modules/path-key/license` |
| `path-parse` | 1.0.7 | MIT | https://github.com/jbgutierrez/path-parse | `node_modules/path-parse/LICENSE` |
| `path-to-regexp` | 1.9.0 | MIT | https://github.com/pillarjs/path-to-regexp | `node_modules/path-to-regexp/LICENSE` |
| `path-type` | 4.0.0 | MIT | https://github.com/sindresorhus/path-type | `node_modules/path-type/license` |
| `pbf` | 4.0.1 | BSD-3-Clause | https://github.com/mapbox/pbf | `node_modules/pbf/LICENSE` |
| `performance-now` | 2.1.0 | MIT | https://github.com/braveg1rl/performance-now | `node_modules/performance-now/license.txt` |
| `picocolors` | 1.1.1 | ISC | https://github.com/alexeyraspopov/picocolors | `node_modules/picocolors/LICENSE` |
| `picomatch` | 2.3.1 | MIT | https://github.com/micromatch/picomatch | `node_modules/micromatch/node_modules/picomatch/LICENSE` |
| `prefix-style` | 2.0.1 | MIT | https://github.com/mattdesl/prefix-style | `node_modules/prefix-style/LICENSE.md` |
| `prelude-ls` | 1.2.1 | MIT | https://github.com/gkz/prelude-ls | `node_modules/prelude-ls/LICENSE` |
| `prismjs` | 1.30.0 | MIT | https://github.com/PrismJS/prism | `node_modules/prismjs/LICENSE` |
| `prop-types` | 15.8.1 | MIT | https://github.com/facebook/prop-types | `node_modules/prop-types/LICENSE` |
| `protocol-buffers-schema` | 3.6.0 | MIT | https://github.com/mafintosh/protocol-buffers-schema | `node_modules/protocol-buffers-schema/LICENSE` |
| `punycode` | 2.3.1 | MIT | https://github.com/mathiasbynens/punycode.js | `node_modules/uri-js/node_modules/punycode/LICENSE-MIT.txt` |
| `queue-microtask` | 1.2.3 | MIT | https://github.com/feross/queue-microtask | `node_modules/queue-microtask/LICENSE` |
| `quick-lru` | 6.1.2 | MIT | https://github.com/sindresorhus/quick-lru | `node_modules/quick-lru/license` |
| `quickselect` | 3.0.0 | ISC | https://github.com/mourner/quickselect | `node_modules/quickselect/LICENSE` |
| `raf` | 3.4.1 | MIT | https://github.com/chrisdickinson/raf | `node_modules/raf/LICENSE` |
| `raf-schd` | 4.0.3 | MIT | https://github.com/alexreardon/raf-schd | `node_modules/raf-schd/LICENSE` |
| `rbush` | 4.0.1 | MIT | https://github.com/mourner/rbush | `node_modules/rbush/LICENSE` |
| `react` | 19.2.4 | MIT | https://github.com/facebook/react | `node_modules/react/LICENSE` |
| `react-calendar` | 6.0.0 | MIT | https://github.com/wojtekmaj/react-calendar | `node_modules/react-calendar/LICENSE` |
| `react-colorful` | 5.6.1 | MIT | https://github.com/omgovich/react-colorful | `node_modules/react-colorful/LICENSE` |
| `react-custom-scrollbars-2` | 4.5.0 | MIT | https://github.com//RobPethick/react-custom-scrollbars-2 | `node_modules/react-custom-scrollbars-2/LICENSE.md` |
| `react-dom` | 19.2.4 | MIT | https://github.com/facebook/react | `node_modules/react-dom/LICENSE` |
| `react-dropzone` | 14.3.8 | MIT | https://github.com/react-dropzone/react-dropzone | `node_modules/react-dropzone/LICENSE` |
| `react-from-dom` | 0.7.5 | MIT | https://github.com/gilbarbara/react-from-dom | `node_modules/react-from-dom/LICENSE` |
| `react-highlight-words` | 0.21.0 | MIT | https://github.com/bvaughn/react-highlight-words | `node_modules/react-highlight-words/LICENSE` |
| `react-hook-form` | 7.66.0 | MIT | https://github.com/react-hook-form/react-hook-form | `node_modules/react-hook-form/LICENSE` |
| `react-i18next` | 15.7.4 | MIT | https://github.com/i18next/react-i18next | `node_modules/react-i18next/LICENSE` |
| `react-i18next` | 16.6.6 | MIT | https://github.com/i18next/react-i18next | `node_modules/@grafana/runtime/node_modules/@grafana/data/node_modules/@grafana/i18n/node_modules/react-i18next/LICENSE` |
| `react-immutable-proptypes` | 2.2.0 | MIT | https://github.com/HurricaneJames/react-immutable-proptypes | `node_modules/react-immutable-proptypes/LICENSE` |
| `react-inlinesvg` | 4.3.0 | MIT | https://github.com/gilbarbara/react-inlinesvg | `node_modules/react-inlinesvg/LICENSE` |
| `react-is` | 16.13.1 | MIT | https://github.com/facebook/react | `node_modules/prop-types/node_modules/react-is/LICENSE` |
| `react-is` | 18.2.0 | MIT | https://github.com/facebook/react | `node_modules/downshift/node_modules/react-is/LICENSE` |
| `react-is` | 18.3.1 | MIT | https://github.com/facebook/react | `node_modules/react-is/LICENSE` |
| `react-loading-skeleton` | 3.5.0 | MIT | https://github.com/dvtng/react-loading-skeleton | `node_modules/react-loading-skeleton/LICENSE` |
| `react-redux` | 9.2.0 | MIT | https://github.com/reduxjs/react-redux | `node_modules/react-redux/LICENSE.md` |
| `react-router` | 5.3.4 | MIT | https://github.com/remix-run/react-router | `node_modules/react-router/LICENSE` |
| `react-router` | 6.30.3 | MIT | https://github.com/remix-run/react-router | `node_modules/react-router-dom-v5-compat/node_modules/react-router/LICENSE.md` |
| `react-router-dom` | 5.3.4 | MIT | https://github.com/remix-run/react-router | `node_modules/react-router-dom/LICENSE` |
| `react-router-dom-v5-compat` | 6.30.3 | MIT | https://github.com/remix-run/react-router | `node_modules/react-router-dom-v5-compat/LICENSE.md` |
| `react-select` | 5.10.2 | MIT | https://github.com/JedWatson/react-select.git#master | `node_modules/react-select/LICENSE` |
| `react-table` | 7.8.0 | MIT | https://github.com/tannerlinsley/react-table | `node_modules/react-table/LICENSE` |
| `react-transition-group` | 4.4.5 | BSD-3-Clause | https://github.com/reactjs/react-transition-group | `node_modules/react-transition-group/LICENSE` |
| `react-universal-interface` | 0.6.2 | Public Domain | https://github.com/streamich/react-universal-interface | `node_modules/react-universal-interface/LICENSE` |
| `react-use` | 17.6.0 | Unlicense | https://github.com/streamich/react-use | `node_modules/react-use/LICENSE` |
| `react-window` | 1.8.11 | MIT | https://github.com/bvaughn/react-window | `node_modules/react-window/LICENSE.md` |
| `redux` | 5.0.1 | MIT | https://github.com/reduxjs/redux | `node_modules/redux/LICENSE.md` |
| `resize-observer-polyfill` | 1.5.1 | MIT | https://github.com/que-etc/resize-observer-polyfill | `node_modules/resize-observer-polyfill/LICENSE` |
| `resolve` | 1.22.11 | MIT | https://github.com/browserify/resolve | `node_modules/babel-plugin-macros/node_modules/resolve/LICENSE` |
| `resolve-from` | 4.0.0 | MIT | https://github.com/sindresorhus/resolve-from | `node_modules/import-fresh/node_modules/resolve-from/license` |
| `resolve-pathname` | 3.0.0 | MIT | https://github.com/mjackson/resolve-pathname | `node_modules/resolve-pathname/LICENSE` |
| `resolve-protobuf-schema` | 2.1.0 | MIT | https://github.com/mafintosh/resolve-protobuf-schema | `node_modules/resolve-protobuf-schema/LICENSE` |
| `reusify` | 1.1.0 | MIT | https://github.com/mcollina/reusify | `node_modules/reusify/LICENSE` |
| `rtl-css-js` | 1.16.1 | MIT | https://github.com/kentcdodds/rtl-css-js | `node_modules/rtl-css-js/LICENSE` |
| `run-parallel` | 1.2.0 | MIT | https://github.com/feross/run-parallel | `node_modules/run-parallel/LICENSE` |
| `rxjs` | 7.8.2 | Apache-2.0 | https://github.com/reactivex/rxjs | `node_modules/rxjs/LICENSE.txt` |
| `scheduler` | 0.27.0 | MIT | https://github.com/facebook/react | `node_modules/scheduler/LICENSE` |
| `screenfull` | 5.2.0 | MIT | https://github.com/sindresorhus/screenfull.js | `node_modules/screenfull/license` |
| `selection-is-backward` | 1.0.0 | MIT | https://github.com/webmodules/selection-is-backward | — |
| `semver` | 7.7.3 | ISC | https://github.com/npm/node-semver | `node_modules/@typescript-eslint/typescript-estree/node_modules/semver/LICENSE` |
| `set-harmonic-interval` | 1.0.1 | Unlicense | https://github.com/streamich/set-harmonic-interval | `node_modules/set-harmonic-interval/LICENSE` |
| `shebang-command` | 2.0.0 | MIT | https://github.com/kevva/shebang-command | `node_modules/shebang-command/license` |
| `shebang-regex` | 3.0.0 | MIT | https://github.com/sindresorhus/shebang-regex | `node_modules/shebang-regex/license` |
| `slate` | 0.47.9 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate/Readme.md` |
| `slate-base64-serializer` | 0.2.115 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-base64-serializer/Readme.md` |
| `slate-dev-environment` | 0.2.5 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-dev-environment/Readme.md` |
| `slate-hotkeys` | 0.2.11 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-hotkeys/Readme.md` |
| `slate-plain-serializer` | 0.7.13 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-plain-serializer/Readme.md` |
| `slate-prop-types` | 0.5.44 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-prop-types/Readme.md` |
| `slate-react` | 0.22.10 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-react/Readme.md` |
| `slate-react-placeholder` | 0.2.9 | MIT | https://github.com/ianstormtaylor/slate | `node_modules/slate-react-placeholder/Readme.md` |
| `source-map` | 0.5.6 | BSD-3-Clause | https://github.com/mozilla/source-map | `node_modules/stacktrace-gps/node_modules/source-map/LICENSE` |
| `source-map` | 0.5.7 | BSD-3-Clause | https://github.com/mozilla/source-map | `node_modules/@emotion/babel-plugin/node_modules/source-map/LICENSE` |
| `source-map` | 0.6.1 | BSD-3-Clause | https://github.com/mozilla/source-map | `node_modules/source-map/LICENSE` |
| `stack-generator` | 2.0.10 | MIT | https://github.com/stacktracejs/stack-generator | `node_modules/stack-generator/LICENSE` |
| `stackframe` | 1.3.4 | MIT | https://github.com/stacktracejs/stackframe | `node_modules/stackframe/LICENSE` |
| `stacktrace-gps` | 3.1.2 | MIT | https://github.com/stacktracejs/stacktrace-gps | `node_modules/stacktrace-gps/LICENSE` |
| `stacktrace-js` | 2.0.2 | MIT | https://github.com/stacktracejs/stacktrace.js | `node_modules/stacktrace-js/LICENSE` |
| `state-local` | 1.0.7 | MIT | https://github.com/suren-atoyan/state-local | `node_modules/state-local/LICENSE` |
| `string-hash` | 1.1.3 | CC0-1.0 | https://github.com/darkskyapp/string-hash | `node_modules/string-hash/README.md` |
| `strip-json-comments` | 3.1.1 | MIT | https://github.com/sindresorhus/strip-json-comments | `node_modules/strip-json-comments/license` |
| `style-mod` | 4.1.3 | MIT | https://github.com/marijnh/style-mod | `node_modules/style-mod/LICENSE` |
| `stylis` | 4.2.0 | MIT | https://github.com/thysultan/stylis.js | `node_modules/@emotion/cache/node_modules/stylis/LICENSE` |
| `stylis` | 4.3.6 | MIT | https://github.com/thysultan/stylis.js | `node_modules/stylis/LICENSE` |
| `supports-color` | 7.2.0 | MIT | https://github.com/chalk/supports-color | `node_modules/chalk/node_modules/supports-color/license` |
| `supports-preserve-symlinks-flag` | 1.0.0 | MIT | https://github.com/inspect-js/node-supports-preserve-symlinks-flag | `node_modules/supports-preserve-symlinks-flag/LICENSE` |
| `tabbable` | 6.3.0 | MIT | https://github.com/focus-trap/tabbable | `node_modules/tabbable/LICENSE` |
| `throttle-debounce` | 3.0.1 | MIT | https://github.com/niksy/throttle-debounce | `node_modules/throttle-debounce/LICENSE.md` |
| `tiny-invariant` | 1.3.3 | MIT | https://github.com/alexreardon/tiny-invariant | `node_modules/tiny-invariant/LICENSE` |
| `tiny-warning` | 0.0.3 | MIT | https://www.npmjs.com/package/tiny-warning | `node_modules/slate/node_modules/tiny-warning/README.md` |
| `tiny-warning` | 1.0.3 | MIT | https://github.com/alexreardon/tiny-warning | `node_modules/tiny-warning/LICENSE` |
| `tinycolor2` | 1.6.0 | MIT | https://github.com/bgrins/TinyColor | `node_modules/tinycolor2/LICENSE` |
| `to-camel-case` | 1.0.0 | MIT | https://github.com/ianstormtaylor/to-camel-case | `node_modules/to-camel-case/Readme.md` |
| `to-no-case` | 1.0.2 | MIT | https://github.com/ianstormtaylor/to-no-case | `node_modules/to-no-case/Readme.md` |
| `to-regex-range` | 5.0.1 | MIT | https://github.com/micromatch/to-regex-range | `node_modules/to-regex-range/LICENSE` |
| `to-space-case` | 1.0.0 | MIT | https://github.com/ianstormtaylor/to-space-case | `node_modules/to-space-case/Readme.md` |
| `toggle-selection` | 1.0.6 | MIT | https://github.com/sudodoki/toggle-selection | `node_modules/toggle-selection/README.md` |
| `ts-api-utils` | 2.1.0 | MIT | https://github.com/JoshuaKGoldberg/ts-api-utils | `node_modules/ts-api-utils/LICENSE.md` |
| `ts-easing` | 0.2.0 | Unlicense | https://github.com/streamich/ts-easing | `node_modules/ts-easing/LICENSE` |
| `tslib` | 2.5.3 | 0BSD | https://github.com/Microsoft/tslib | `node_modules/react-use/node_modules/tslib/LICENSE.txt` |
| `tslib` | 2.8.1 | 0BSD | https://github.com/Microsoft/tslib | `node_modules/tslib/LICENSE.txt` |
| `type-check` | 0.4.0 | MIT | https://github.com/gkz/type-check | `node_modules/type-check/LICENSE` |
| `type-of` | 2.0.1 | MIT | https://github.com/ForbesLindesay/type-of | `node_modules/type-of/LICENSE` |
| `typescript` | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | `node_modules/typescript/LICENSE.txt` |
| `typescript` | 6.0.2 | Apache-2.0 | https://github.com/microsoft/TypeScript | `node_modules/@grafana/e2e-selectors/node_modules/typescript/LICENSE.txt` |
| `ua-parser-js` | 1.0.41 | MIT | https://github.com/faisalman/ua-parser-js | `node_modules/ua-parser-js/license.md` |
| `uplot` | 1.6.32 | MIT | https://github.com/leeoniya/uPlot | `node_modules/uplot/LICENSE` |
| `uri-js` | 4.4.1 | BSD-2-Clause | https://github.com/garycourt/uri-js | `node_modules/uri-js/LICENSE` |
| `use-isomorphic-layout-effect` | 1.2.1 | MIT | https://github.com/Andarist/use-isomorphic-layout-effect | `node_modules/use-isomorphic-layout-effect/LICENSE` |
| `use-sync-external-store` | 1.6.0 | MIT | https://github.com/facebook/react | `node_modules/use-sync-external-store/LICENSE` |
| `uwrap` | 0.1.2 | MIT | https://github.com/leeoniya/uWrap | `node_modules/uwrap/LICENSE` |
| `value-equal` | 1.0.1 | MIT | https://github.com/mjackson/value-equal | `node_modules/value-equal/LICENSE` |
| `void-elements` | 3.1.0 | MIT | https://github.com/pugjs/void-elements | `node_modules/void-elements/LICENSE` |
| `w3c-keyname` | 2.2.8 | MIT | https://github.com/marijnh/w3c-keyname | `node_modules/w3c-keyname/LICENSE` |
| `warning` | 4.0.3 | MIT | https://github.com/BerkeleyTrue/warning | `node_modules/warning/LICENSE.md` |
| `web-vitals` | 5.3.0 | Apache-2.0 | https://github.com/GoogleChrome/web-vitals | `node_modules/web-vitals/LICENSE` |
| `web-worker` | 1.5.0 | Apache-2.0 | https://github.com/developit/web-worker | `node_modules/web-worker/LICENSE` |
| `which` | 2.0.2 | ISC | https://github.com/isaacs/node-which | `node_modules/cross-spawn/node_modules/which/LICENSE` |
| `word-wrap` | 1.2.5 | MIT | https://github.com/jonschlinkert/word-wrap | `node_modules/word-wrap/LICENSE` |
| `xml-utils` | 1.10.2 | CC0-1.0 | https://github.com/DanielJDufour/xml-utils | `node_modules/xml-utils/LICENSE` |
| `xss` | 1.0.15 | MIT | https://github.com/leizongmin/js-xss | `node_modules/xss/LICENSE` |
| `yaml` | 1.10.2 | ISC | https://github.com/eemeli/yaml | `node_modules/yaml/LICENSE` |
| `yocto-queue` | 0.1.0 | MIT | https://github.com/sindresorhus/yocto-queue | `node_modules/yocto-queue/license` |
| `zod` | 4.3.6 | MIT | https://github.com/colinhacks/zod | `node_modules/zod/LICENSE` |
| `zstddec` | 0.1.0 | MIT AND BSD-3-Clause | https://github.com/donmccurdy/zstddec | `node_modules/zstddec/LICENSE` |

### Packages without a declared license

- `get-document@1.0.0` (https://github.com/webmodules/get-document) — no `license` field in `package.json` and no LICENSE file; pulled in transitively.
