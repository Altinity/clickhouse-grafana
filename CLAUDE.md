# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Altinity ClickHouse Grafana Plugin is a **hybrid datasource plugin** that consists of:
- **Frontend**: TypeScript/React using Grafana plugin framework
- **Backend**: Go using Grafana Plugin SDK with resource handlers for advanced functionality

The plugin enables Grafana to connect to ClickHouse databases with full support for time series, tables, logs, traces, flamegraphs, annotations, and alerting.

## Core Commands

### Development Setup
```bash
# Start development environment
docker compose up --no-deps -d grafana clickhouse

# Access Grafana at http://localhost:3000/ (admin/admin)
```

### Frontend Development
```bash
npm install                    # Install dependencies
npm run dev                    # Build with watch mode
npm run build                  # Production build
npm run build:frontend         # Frontend-only build

# Testing
npm run test                   # Run Jest tests
npm run test:ci               # CI test mode
npm run test:coverage         # Coverage reports
npm run e2e                   # Cypress E2E tests

# Code Quality
npm run lint                  # ESLint
npm run typecheck             # TypeScript checking
```

### Backend Development
```bash
# Build (using Mage)
mage -v                       # Build all binaries
mage -l                       # List available targets

# Docker-based development
docker compose run --rm backend_builder   # Build backend
docker compose run --rm frontend_builder  # Build frontend

# After changes, restart Grafana
docker compose restart grafana
```

### Testing
```bash
# Run specific test patterns
RUN_TESTS="TestSomeFunction" docker compose run --rm backend_builder

# Frontend tests with coverage
npm run test:coverage

# E2E testing workflow
npm run server                # Start Grafana instance
npm run e2e                   # Run Cypress tests

# Run a single test file
npm run test -- path/to/test.spec.ts
```

## Architecture

### Frontend Architecture (`src/`)
- **DataSource** (`datasource/datasource.ts`): Main `CHDataSource` class extending `DataSourceWithBackend`
- **Query Editor** (`views/QueryEditor/`): SQL query builder and text editor with autocomplete
- **Config Editor** (`views/ConfigEditor/`): Datasource configuration UI
- **Response Parser** (`datasource/response_parser.ts`): Transforms ClickHouse responses to Grafana format
- **SQL Series** (`datasource/sql-series/`): Handles various visualization formats (time series, table, logs, traces, flamegraph)
- **Ad-hoc Filters** (`datasource/adhoc.ts`): Dynamic filtering support

### Backend Architecture (`pkg/`)
- **Main Entry** (`main.go`): Plugin server initialization using Grafana Plugin SDK
- **Datasource Handler** (`datasource.go`): Processes queries, manages connections, and handles resource calls
- **Resource Handlers** (`resource_handlers.go`): Implements API endpoints for advanced query processing
- **Client** (`client.go`): ClickHouse HTTP client with compression support (brotli, gzip)
- **Parser** (`parser.go`): SQL query parsing and macro expansion
- **Response Handler** (`response.go`): Data transformation and formatting

### Key Hybrid Features
- **Resource Handlers**: Backend exposes REST endpoints for complex query processing (createQuery, applyAdhocFilters, etc.)
- **Dual Execution**: Backend handles server queries/alerts, frontend calls resource handlers for interactive queries
- **Compression Support**: Multiple compression algorithms (brotli, gzip, zstd) for performance

## Development Patterns

### When Making Frontend Changes
1. Edit source files in `src/`
2. Run `npm run build:frontend`
3. Restart Grafana: `docker compose restart grafana`
4. Test at http://localhost:3000/

### When Making Backend Changes
1. Edit source files in `pkg/`
2. Run `docker compose run --rm backend_builder` or `mage -v`
3. Restart Grafana: `docker compose restart grafana`
4. Test server functionality (alerts, resource handlers, etc.)

### Query Development
- **Macros**: Use ClickHouse-specific macros like `$timeFilter`, `$timeSeries`, `$columns()`, `$rate()`
- **Functions**: Template SQL queries for common patterns (rate, perSecond, delta, increase)
- **Format Types**: Support for time series, table, logs, traces, flamegraph outputs
- **SQL Editor**: Located in `src/views/QueryEditor/components/QueryTextEditor/` with autocomplete

### Testing Strategy
- **Unit Tests**: Jest for frontend (`src/spec/`)
- **Integration Tests**: Go tests for backend (`pkg/`)
- **E2E Tests**: Cypress tests for full workflow
- **Test Environment**: Full Docker stack with ClickHouse + Grafana

## Branch Context

- **Current Branch**: `grafana-backend`
- **Main Branch**: `master`
- **Recent Changes**: Upgraded Go to 1.24, removed TinyGo dependencies

## Plugin Structure

- **Plugin ID**: `vertamedia-clickhouse-datasource` 
- **Executable**: `altinity-clickhouse-plugin` (backend binary)
- **Dependencies**: Grafana >=10.0.3
- **Capabilities**: metrics, annotations, backend, alerting, logs

## Common Development Tasks

### Adding New SQL Functions
1. Add function logic in `pkg/parser.go`
2. Add frontend autocomplete in `src/views/QueryEditor/components/QueryTextEditor/editor/autocompletions/`
3. Add tests in relevant test files
4. Update documentation

### Adding New Visualization Formats
1. Create new converter in `src/datasource/sql-series/`
2. Update response parser in `src/datasource/response_parser.ts`
3. Add format option in query editor components

### Debugging
- **Frontend**: Use browser DevTools, check Network tab for resource handler API calls
- **Backend**: Use Grafana debug logs (`GF_LOG_LEVEL=debug`)
- **Docker Logs**: `docker compose logs grafana` or `docker compose logs clickhouse`
- **Resource Handlers**: Debug API calls to `/api/datasources/uid/{uid}/resources/*` endpoints

## Important Notes

- **Resource Handlers**: The plugin uses Grafana's resource handler API to expose backend functionality to the frontend. Complex query processing (SQL parsing, macro expansion, adhoc filters) is handled by backend endpoints at `/api/datasources/uid/{uid}/resources/{endpoint}`.
- **Plugin Signing**: For production use, the plugin needs to be signed. Development mode allows unsigned plugins.
- **Compression**: The plugin supports multiple compression algorithms. Default is gzip, but brotli and zstd are also available for better performance.
- **API Endpoints**: The backend exposes four main resource endpoints: `createQuery`, `applyAdhocFilters`, `getAstProperty`, and `replaceTimeFilters` for advanced query processing.