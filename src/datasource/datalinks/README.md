# Data Links System

**Centralized, extensible data links framework for all ClickHouse datasource formats**

---

## Overview

This directory contains a complete, production-ready data links system that works across all ClickHouse formats:
- `time_series` - Time series visualizations
- `logs` - Logs panels
- `traces` - Trace visualizations (replaces old trace-to-metrics)
- `flamegraph` - Flame graph visualizations
- `table` - Table panels

## Architecture

```
datalinks/
├── index.ts                    # Public API exports
├── types.ts                    # Shared types and interfaces
├── utils.ts                    # Utility functions
├── BaseLinkBuilder.ts          # Abstract base class
├── LinkBuilderFactory.ts       # Factory for creating builders
└── formats/                    # Format-specific implementations
    ├── TimeSeriesLinkBuilder.ts
    ├── LogsLinkBuilder.ts
    ├── TracesLinkBuilder.ts
    ├── FlamegraphLinkBuilder.ts
    └── TableLinkBuilder.ts
```

## Quick Start

```typescript
// 1. Import
import { LinkBuilderFactory, TimeSeriesLinkContext } from './datalinks';

// 2. Get builder
const builder = LinkBuilderFactory.getBuilder<TimeSeriesLinkContext>(
  'time_series',
  config
);

// 3. Build links
if (builder) {
  const context = { seriesName: 'requests', timestamp: Date.now(), value: 100, labels: {...} };
  const links = builder.buildLinks(context);

  // 4. Attach to field
  field.config.links = links;
}
```

## Design Principles

### 1. Single Responsibility
Each link builder handles one format only, with clear boundaries.

### 2. Open/Closed Principle
Easy to add new formats without modifying existing code.

### 3. Dependency Inversion
Builders depend on abstract interfaces, not concrete implementations.

### 4. DRY (Don't Repeat Yourself)
Common logic in `BaseLinkBuilder`, format-specific logic in subclasses.

### 5. Type Safety
Full TypeScript support with strict typing throughout.

## Key Components

### LinkBuilderFactory

**Purpose:** Central factory for creating format-specific builders.

```typescript
// Get a builder
const builder = LinkBuilderFactory.getBuilder('time_series', config);

// Check if format is supported
if (LinkBuilderFactory.isFormatSupported('custom_format')) {
  // ...
}

// Clear cache (for testing)
LinkBuilderFactory.clearCache();
```

### BaseLinkBuilder

**Purpose:** Abstract base class with common functionality.

**Features:**
- Configuration management
- Time range calculation
- Query interpolation
- WHERE clause building
- Default link generation

**Usage:** Extend for new formats:

```typescript
export class MyFormatLinkBuilder extends BaseLinkBuilder<MyContext> {
  constructor(config: DataLinksConfig) {
    super(config, 'my_format');
  }

  public buildLinks(context: MyContext): DataLink[] {
    // Your implementation
  }
}
```

### Format-Specific Builders

Each format has a dedicated builder:

#### TimeSeriesLinkBuilder
- Links on value fields
- Extracts labels from series name
- Default target: logs

#### LogsLinkBuilder
- Links on body/labels fields
- Detects trace_id for trace links
- Default target: traces or metrics

#### TracesLinkBuilder
- Links on spanID field (per-span links)
- Migrated from old trace-to-metrics system
- Default target: metrics

#### FlamegraphLinkBuilder
- Links on label field (function names)
- Skips root node
- Default target: traces

#### TableLinkBuilder
- Links on configurable columns
- Per-row or per-column links
- Default target: detail view

## Configuration

### Global Configuration

```typescript
interface DataLinksConfig {
  enabled: boolean;
  targetDatasourceUid: string;
  targetDatasourceName?: string;

  timeShift?: {
    start: string;  // e.g., '-5m'
    end: string;    // e.g., '5m'
  };

  fieldMappings?: FieldMapping[];
  queryTemplates?: QueryTemplate[];

  // Format-specific overrides
  formats?: {
    time_series?: FormatConfig;
    logs?: FormatConfig;
    // ...
  };
}
```

### Format-Specific Override

```typescript
{
  "dataLinks": {
    "enabled": true,
    "targetDatasourceUid": "main-ds",

    // Global settings (apply to all formats)
    "fieldMappings": [...],
    "queryTemplates": [...],

    // Override for specific format
    "formats": {
      "time_series": {
        "enabled": true,
        "linkFields": ["value"],
        "queryTemplates": [...]  // Use these instead of global
      }
    }
  }
}
```

## Link Context Types

Each format has a specific context type:

```typescript
// Time Series
interface TimeSeriesLinkContext {
  seriesName: string;
  timestamp: number;
  value: number;
  labels: Record<string, string>;
}

// Logs
interface LogsLinkContext {
  timestamp: number;
  labels: Record<string, string>;
  body: string;
  severity?: string;
  traceId?: string;
}

// Traces
interface TracesLinkContext {
  traceID: string;
  spanID: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Record<string, any>;
  serviceTags: Record<string, any>;
}

// And so on...
```

## Utilities

### parseTimeShift
Converts time shift strings to milliseconds.

```typescript
parseTimeShift('-5m')  // -300000
parseTimeShift('1h')   // 3600000
```

### calculateTimeRange
Creates TimeRange from timestamp and shifts.

```typescript
const range = calculateTimeRange(timestamp, '-5m', '5m');
```

### buildWhereClause
Builds SQL WHERE clause from field mappings.

```typescript
const where = buildWhereClause(mappings, context);
// Result: "service_name = 'api' AND cluster = 'prod'"
```

### interpolateQuery
Replaces placeholders in query templates.

```typescript
const query = interpolateQuery(
  "SELECT * FROM logs WHERE ${service_name}",
  context,
  mappings
);
```

## Testing

### Unit Tests

Test builders in isolation:

```typescript
import { TimeSeriesLinkBuilder } from './formats/TimeSeriesLinkBuilder';

describe('TimeSeriesLinkBuilder', () => {
  it('should build links from context', () => {
    const config = { enabled: true, targetDatasourceUid: 'test' };
    const builder = new TimeSeriesLinkBuilder(config);

    const context = {
      seriesName: 'requests',
      timestamp: 1000,
      value: 100,
      labels: { service: 'api' }
    };

    const links = builder.buildLinks(context);
    expect(links).toHaveLength(1);
  });
});
```

### Integration Tests

Test with format converters:

```typescript
import { toTimeSeries } from '../sql-series/toTimeSeries';

describe('toTimeSeries with links', () => {
  it('should attach links when config provided', () => {
    const config = {...};
    const result = toTimeSeries(true, false, mockData, config);

    const valueField = result[0].fields[1];
    expect(valueField.config.links).toBeDefined();
  });
});
```

## Extension

### Adding a New Format

1. **Create builder class:**

```typescript
// formats/NewFormatLinkBuilder.ts
import { BaseLinkBuilder } from '../BaseLinkBuilder';

export class NewFormatLinkBuilder extends BaseLinkBuilder<NewFormatContext> {
  constructor(config: DataLinksConfig) {
    super(config, 'new_format');
  }

  public buildLinks(context: NewFormatContext): DataLink[] {
    // Implementation
  }
}
```

2. **Define context type:**

```typescript
// types.ts
export interface NewFormatLinkContext extends LinkContext {
  // Format-specific fields
}
```

3. **Register in factory:**

```typescript
// LinkBuilderFactory.ts
import { NewFormatLinkBuilder } from './formats/NewFormatLinkBuilder';

case 'new_format':
  builder = new NewFormatLinkBuilder(config);
  break;
```

4. **Export from index:**

```typescript
// index.ts
export { NewFormatLinkBuilder } from './formats/NewFormatLinkBuilder';
```

5. **Update type union:**

```typescript
// LinkBuilderFactory.ts
export type SupportedFormat = 'time_series' | 'logs' | 'traces' | 'flamegraph' | 'table' | 'new_format';
```

## Migration from Old System

### Old (trace-to-metrics)

```typescript
import { TraceToMetricsLinkBuilder } from './trace-to-metrics/linkBuilder';

const builder = new TraceToMetricsLinkBuilder(config);
const links = builder.buildLinks(span);
```

### New (unified system)

```typescript
import { LinkBuilderFactory, TracesLinkContext } from './datalinks';

const builder = LinkBuilderFactory.getBuilder<TracesLinkContext>('traces', config);
if (builder) {
  const links = builder.buildLinks(span);
}
```

Configuration is automatically migrated by datasource.ts.

## Best Practices

### ✅ DO

- Use `LinkBuilderFactory.getBuilder()` to create builders
- Check if builder exists before calling `buildLinks()`
- Use helper methods like `createContext()` from builders
- Cache builders at datasource level (factory does this)
- Provide meaningful link titles
- Use format-specific configuration for overrides

### ❌ DON'T

- Don't instantiate builders directly (use factory)
- Don't skip `isEnabled()` checks
- Don't hardcode datasource UIDs in builders
- Don't modify config objects (they're shared)
- Don't forget to pass config from datasource to converters

## Performance

- **Factory caching:** Builders are cached per datasource UID
- **Lazy initialization:** Builders created only when needed
- **Efficient context:** Context objects are lightweight
- **Batch processing:** Generate links in bulk where possible

## Troubleshooting

### Links not appearing

1. Check config is enabled: `config.enabled === true`
2. Check target datasource UID is valid
3. Check format is not explicitly disabled
4. Verify field mappings match your data structure

### Wrong query generated

1. Check field mappings are correct
2. Verify query template has correct placeholders
3. Check time shift values are valid
4. Use `interpolateQuery()` utility to test

### Performance issues

1. Check if generating too many links per field
2. Verify builders are being cached (use factory)
3. Consider per-field links instead of per-value

## Documentation

- **Specification:** `/docs/DATA_LINKS_SPECIFICATION.md`
- **Technical Guide:** `/docs/DATA_LINKS_TECHNICAL_GUIDE.md`
- **Integration Guide:** `/docs/DATA_LINKS_INTEGRATION_GUIDE.md`

## Support

For questions or issues:
1. Check the documentation above
2. Review existing format builders for examples
3. Create an issue with `[data-links]` prefix

---

**Version:** 1.0.0
**Status:** Production Ready
**Maintainer:** ClickHouse Grafana Plugin Team
