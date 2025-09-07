# Testing Trace to Metrics Feature

## Setup Instructions

1. **Access Grafana**: http://localhost:3000 (admin/admin)

2. **Get Datasource UID**:
   - Go to Configuration → Data Sources → ClickHouse
   - Copy the datasource UID from the URL (e.g., `http://localhost:3000/datasources/edit/YOUR_UID_HERE`)

3. **Configure ClickHouse Datasource**:
   - Go to Configuration → Data Sources → ClickHouse
   - Scroll to "Trace to Metrics" section
   - Enable "Enable Trace to Metrics"
   - Enter Datasource UID (paste the UID you copied above)
   - Set Query Template: `SELECT count() FROM system.events WHERE $__tags`
   - Set Tag Mappings: `service.name=service, http.method=method`
   - Save & Test

## LATEST IMPLEMENTATION (COMPLETE REWRITE)

This implementation now uses **proper field-level DataLinks** that match Grafana's expectations:

### How It Works:
1. **Field-Level Data Links**: Links are attached to the `spanID` field's `config.links` property
2. **Per-Span Links**: Each span gets its own set of data links based on its attributes
3. **Dynamic Query Generation**: `$__tags` placeholder is replaced with actual span attributes
4. **Dual Approach**: Links are added both to field config AND as metadata for maximum compatibility

### What You Should See:
- **Data link buttons/icons** appear on trace spans in the trace viewer
- **Click links** to navigate to metrics with pre-populated queries
- **Tag interpolation** works automatically (e.g., `service_name='my-service' AND http.method='GET'`)

3. **Create Test Trace Data**:
   Use this SQL query in Explore with Format = "Traces":

```sql
SELECT 
    'trace-' || toString(number) as traceID,
    'span-' || toString(number) as spanID,
    if(number % 3 = 0, '', 'span-' || toString(number - 1)) as parentSpanID,
    'my-service' as serviceName,
    'GET /api/users' as operationName,
    now() - interval number second as startTime,
    rand() % 1000 as duration,
    map('http.method', 'GET', 'http.status_code', '200', 'http.url', '/api/users') as tags,
    map('version', '1.0.0', 'environment', 'production') as serviceTags
FROM numbers(10)
```

4. **View Traces**:
   - Run the query above
   - Switch to "Traces" visualization
   - You should see trace spans
   - Each span should have a data link to view metrics

## Debugging

If links don't appear:
1. Check browser console for errors
2. Verify datasource UID is correct
3. Ensure trace-to-metrics is enabled and saved
4. Check that the query returns proper trace format

## Example Trace Query with Real Data

If you have actual trace data in ClickHouse:

```sql
SELECT 
    trace_id as traceID,
    span_id as spanID,
    parent_span_id as parentSpanID,
    service_name as serviceName,
    operation_name as operationName,
    start_time as startTime,
    duration_ms as duration,
    attributes as tags,
    resource_attributes as serviceTags
FROM otel.traces
WHERE start_time > now() - interval 1 hour
LIMIT 100
```

## Expected Behavior

When configured correctly:
- Each trace span should show a "View metrics" link
- Clicking the link should navigate to the metrics datasource
- The query should include the filtered tags from the span
- The metrics query should be pre-populated with the span's attributes