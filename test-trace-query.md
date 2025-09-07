# Quick Test Queries

## 1. Generate Test Traces
```sql
SELECT 
    'trace-001' as traceID,
    'span-001' as spanID,
    '' as parentSpanID,
    'api-gateway' as serviceName,
    'GET /api/users' as operationName,
    now() - interval 1 minute as startTime,
    50000000 as duration,
    map('http.method', 'GET', 'http.status_code', '200', 'service.name', 'api-gateway') as tags,
    map('version', '1.0.0') as serviceTags
```

## 2. Check if DataLinks are Generated
- Open browser DevTools (F12)
- Go to Network tab
- Run the trace query
- Look for the response
- Check if the spanID field has `config.links` populated

## 3. Verify Configuration
In browser console, run:
```javascript
// Get datasource instance
const ds = await window.grafanaRuntime.getDataSourceSrv().get('ClickHouse Traces');
console.log('Trace to Metrics Config:', ds.tracesToMetrics);
```
