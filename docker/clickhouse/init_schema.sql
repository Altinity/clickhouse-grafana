DROP TABLE IF EXISTS default.test_grafana;
CREATE TABLE IF NOT EXISTS default.test_grafana(event_time DateTime, service_name LowCardinality(String), too_big_value Float64)
    ENGINE=MergeTree()
        PARTITION BY toYYYYMM(event_time)
        ORDER BY (event_time, service_name);

INSERT INTO default.test_grafana(event_time, service_name, too_big_value) SELECT toDateTime(now()-(number*10)) AS event_time, if(rand() % 2 = 1,'mysql','postgresql') AS service_name, 1000000000.05 AS too_big_value FROM numbers(1000);
INSERT INTO default.test_grafana(event_time, service_name, too_big_value) SELECT toDateTime(now()+(number*10)) AS event_time, 'mysql' AS service_name, 1000000000.05 AS too_big_value FROM numbers(1000);
INSERT INTO default.test_grafana(event_time, service_name, too_big_value) SELECT toDateTime(now()+((500+number)*10)) AS event_time, 'postgresql' AS service_name, 1000000000.05 AS too_big_value FROM numbers(1000);
