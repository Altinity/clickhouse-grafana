-- Create tables for trace-to-metrics demo

-- Drop existing tables if they exist
DROP TABLE IF EXISTS traces;
DROP TABLE IF EXISTS metrics;

-- Create traces table
CREATE TABLE IF NOT EXISTS traces (
    trace_id String,
    span_id String,
    parent_span_id String,
    service_name String,
    operation_name String,
    start_time DateTime64(9),
    duration_ns UInt64,
    tags Map(String, String),
    service_tags Map(String, String)
) ENGINE = MergeTree()
ORDER BY (service_name, start_time);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    timestamp DateTime,
    service_name String,
    operation_name String,
    http_method String,
    http_status_code UInt16,
    cluster String,
    namespace String,
    pod String,
    request_count UInt64,
    error_count UInt64,
    duration_ms Float32,
    duration_p50 Float32,
    duration_p95 Float32,
    duration_p99 Float32
) ENGINE = MergeTree()
ORDER BY (service_name, timestamp);

-- Insert sample trace data
INSERT INTO traces VALUES
    ('trace-001', 'span-001', '', 'api-gateway', 'GET /api/users', now() - interval 1 hour, 50000000, 
     map('http.method', 'GET', 'http.status_code', '200', 'http.url', '/api/users', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '1.0.0', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-001', 'span-002', 'span-001', 'user-service', 'getUserList', now() - interval 1 hour + interval 5 millisecond, 30000000,
     map('http.method', 'GET', 'http.status_code', '200', 'db.statement', 'SELECT * FROM users', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '2.1.0', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-001', 'span-003', 'span-002', 'database', 'query', now() - interval 1 hour + interval 10 millisecond, 15000000,
     map('db.type', 'postgresql', 'db.statement', 'SELECT * FROM users LIMIT 100', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '14.2', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-002', 'span-004', '', 'api-gateway', 'POST /api/users', now() - interval 55 minute, 120000000,
     map('http.method', 'POST', 'http.status_code', '201', 'http.url', '/api/users', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '1.0.0', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-002', 'span-005', 'span-004', 'user-service', 'createUser', now() - interval 55 minute + interval 10 millisecond, 80000000,
     map('http.method', 'POST', 'http.status_code', '201', 'validation', 'passed', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '2.1.0', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-003', 'span-006', '', 'api-gateway', 'GET /api/orders', now() - interval 50 minute, 75000000,
     map('http.method', 'GET', 'http.status_code', '500', 'http.url', '/api/orders', 'error', 'true', 'cluster', 'prod-us-west', 'namespace', 'production'),
     map('version', '1.0.0', 'environment', 'production', 'region', 'us-west-2')),
    
    ('trace-003', 'span-007', 'span-006', 'order-service', 'getOrderList', now() - interval 50 minute + interval 5 millisecond, 60000000,
     map('http.method', 'GET', 'http.status_code', '500', 'error.type', 'DatabaseConnectionError', 'cluster', 'prod-us-west', 'namespace', 'production'),
     map('version', '1.5.0', 'environment', 'production', 'region', 'us-west-2')),
    
    ('trace-004', 'span-008', '', 'api-gateway', 'DELETE /api/users/123', now() - interval 45 minute, 35000000,
     map('http.method', 'DELETE', 'http.status_code', '204', 'http.url', '/api/users/123', 'cluster', 'prod-us-east', 'namespace', 'production'),
     map('version', '1.0.0', 'environment', 'production', 'region', 'us-east-1')),
    
    ('trace-005', 'span-009', '', 'api-gateway', 'PUT /api/products/456', now() - interval 40 minute, 90000000,
     map('http.method', 'PUT', 'http.status_code', '200', 'http.url', '/api/products/456', 'cluster', 'prod-eu-west', 'namespace', 'staging'),
     map('version', '1.1.0', 'environment', 'staging', 'region', 'eu-west-1')),
    
    ('trace-005', 'span-010', 'span-009', 'product-service', 'updateProduct', now() - interval 40 minute + interval 5 millisecond, 70000000,
     map('http.method', 'PUT', 'http.status_code', '200', 'cache.hit', 'false', 'cluster', 'prod-eu-west', 'namespace', 'staging'),
     map('version', '3.0.0', 'environment', 'staging', 'region', 'eu-west-1'));

-- Insert corresponding metrics data
INSERT INTO metrics
SELECT 
    toStartOfMinute(now() - interval number minute) as timestamp,
    multiIf(
        number % 5 = 0, 'api-gateway',
        number % 5 = 1, 'user-service',
        number % 5 = 2, 'order-service',
        number % 5 = 3, 'product-service',
        'database'
    ) as service_name,
    multiIf(
        number % 4 = 0, 'GET /api/users',
        number % 4 = 1, 'POST /api/users',
        number % 4 = 2, 'GET /api/orders',
        'PUT /api/products'
    ) as operation_name,
    multiIf(
        number % 4 = 0, 'GET',
        number % 4 = 1, 'POST',
        number % 4 = 2, 'DELETE',
        'PUT'
    ) as http_method,
    multiIf(
        number % 10 = 0, 500,
        number % 10 = 1, 404,
        200
    ) as http_status_code,
    multiIf(
        number % 3 = 0, 'prod-us-east',
        number % 3 = 1, 'prod-us-west',
        'prod-eu-west'
    ) as cluster,
    multiIf(
        number % 2 = 0, 'production',
        'staging'
    ) as namespace,
    concat('pod-', toString(number % 10)) as pod,
    100 + rand() % 500 as request_count,
    if(number % 10 = 0, 10 + rand() % 20, rand() % 5) as error_count,
    50 + rand() % 200 as duration_ms,
    30 + rand() % 50 as duration_p50,
    80 + rand() % 100 as duration_p95,
    150 + rand() % 150 as duration_p99
FROM numbers(120); -- 2 hours of data, one row per minute

-- Add some recent data for better demo
INSERT INTO metrics
SELECT 
    now() - interval (number * 10) second as timestamp,
    multiIf(
        number % 3 = 0, 'api-gateway',
        number % 3 = 1, 'user-service',
        'order-service'
    ) as service_name,
    multiIf(
        number % 2 = 0, 'GET /api/users',
        'POST /api/users'
    ) as operation_name,
    multiIf(
        number % 2 = 0, 'GET',
        'POST'
    ) as http_method,
    multiIf(
        number % 20 = 0, 500,
        number % 15 = 0, 404,
        200
    ) as http_status_code,
    'prod-us-east' as cluster,
    'production' as namespace,
    concat('pod-', toString(number % 5)) as pod,
    200 + rand() % 300 as request_count,
    if(number % 20 = 0, 20 + rand() % 30, rand() % 10) as error_count,
    40 + rand() % 160 as duration_ms,
    25 + rand() % 40 as duration_p50,
    70 + rand() % 80 as duration_p95,
    120 + rand() % 180 as duration_p99
FROM numbers(60); -- Last 10 minutes of higher resolution data

-- Verify data was inserted
SELECT 'Traces table:' as info, count() as row_count FROM traces;
SELECT 'Metrics table:' as info, count() as row_count FROM metrics;