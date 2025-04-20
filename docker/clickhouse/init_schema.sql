DROP TABLE IF EXISTS default.test_grafana;
CREATE TABLE IF NOT EXISTS default.test_grafana
(
    event_time    DateTime,
    service_name  LowCardinality(String),
    from_user     LowCardinality(String),
    country       LowCardinality(String),
    too_big_value Float64
)
    ENGINE = MergeTree()
        PARTITION BY toYYYYMM(event_time)
        ORDER BY (event_time, service_name);

INSERT INTO default.test_grafana(event_time, service_name, from_user, country, too_big_value) SELECT toDateTime(now()-(number*10)) AS event_time, if(rand() % 2 = 1,'mysql','postgresql') AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value FROM numbers(1000);
INSERT INTO default.test_grafana(event_time, service_name, from_user, country, too_big_value) SELECT toDateTime(now()+(number*10)) AS event_time, 'mysql' AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value FROM numbers(1000);
INSERT INTO default.test_grafana(event_time, service_name, from_user, country, too_big_value) SELECT toDateTime(now()+((500+number)*10)) AS event_time, 'postgresql' AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value FROM numbers(1000);

DROP TABLE IF EXISTS default.test_grafana_random;
CREATE TABLE IF NOT EXISTS default.test_grafana_random
(
    event_time    DateTime,
    service_name  LowCardinality(String),
    from_user     LowCardinality(String),
    country       LowCardinality(String),
    too_big_value Float64,
    random        UInt32
)
    ENGINE = MergeTree()
        PARTITION BY toYYYYMM(event_time)
        ORDER BY (event_time, service_name);

INSERT INTO default.test_grafana_random(event_time, service_name, from_user, country, too_big_value, random) SELECT toDateTime(now()-(number*10)) AS event_time, if(rand() % 2 = 1,'mysql','postgresql') AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value, rand() as random FROM numbers(1000);
INSERT INTO default.test_grafana_random(event_time, service_name, from_user, country, too_big_value, random) SELECT toDateTime(now()+(number*10)) AS event_time, 'mysql' AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value, rand() as random FROM numbers(1000);
INSERT INTO default.test_grafana_random(event_time, service_name, from_user, country, too_big_value, random) SELECT toDateTime(now()+((500+number)*10)) AS event_time, 'postgresql' AS service_name, if(rand() % 2 = 1,'bob','alice') AS from_user, multiIf(rand() % 10= 1,'RU', rand() % 10= 2,'DE', rand() % 10= 3,'CN', rand() % 10= 4,'UK', rand() % 10= 5,'NL', rand() % 10= 6,'EU', rand() % 10= 7,'TK', rand() % 10= 8,'AR', rand() % 10= 9,'FR', 'US') AS country, 1000000000.05 AS too_big_value, rand() as random FROM numbers(1000);

DROP TABLE IF EXISTS default.test_logs;
CREATE TABLE IF NOT EXISTS default.test_logs
(
    event_time    DateTime,
    content  LowCardinality(String),
    level     LowCardinality(String),
    id       UUID,
    label    LowCardinality(String),
    detected_field Float64
)
    ENGINE = MergeTree()
        PARTITION BY toYYYYMM(event_time)
        ORDER BY (event_time, level);

INSERT INTO default.test_logs(event_time, content, level, id, label, detected_field) SELECT toDateTime(now()-(number*10)) AS event_time, concat('Warn Log line ', toString(number)) as content, 'Warn' AS level, generateUUIDv4() as id, if(rand() % 2 = 1,'abc','cba') AS label, 1000000000.05 AS detected_field FROM numbers(1000);
INSERT INTO default.test_logs(event_time, content, level, id, label, detected_field) SELECT toDateTime(now()+(number*10)) AS event_time, concat('Info Log line ', toString(number)) as content, 'Info' AS level, generateUUIDv4() as id, if(rand() % 2 = 1,'abc','cba') AS label, 1000000000.05 AS detected_field FROM numbers(1000);
INSERT INTO default.test_logs(event_time, content, level, id, label, detected_field) SELECT toDateTime(now()+((500+number)*10)) AS event_time, concat('Unknown Log line ', toString(number)) as content, 'Unknown' AS level, generateUUIDv4() as id, if(rand() % 2 = 1,'abc','cba') AS label, 1000000000.05 AS detected_field FROM numbers(1000);

DROP TABLE IF EXISTS default.test_logs_with_complex_labels;
CREATE TABLE default.test_logs_with_complex_labels(
  `_raw` String CODEC(ZSTD(1)),
  `_time` DateTime64(3, 'Asia/Yekaterinburg') CODEC(ZSTD(1)),
  `_map` Map(String, String),
  `_db_time` DateTime DEFAULT now() CODEC(ZSTD(1)),
  `_time_dec` Float64 DEFAULT toFloat64(_time) CODEC(DoubleDelta, Default),
  `cluster_name` LowCardinality(String) DEFAULT JSONExtractString(_raw, 'cluster_name') CODEC(ZSTD(1)),
  `host` LowCardinality(String) DEFAULT JSONExtractString(_raw, 'host') CODEC(ZSTD(1)),
  `pod_namespace` LowCardinality(String) DEFAULT JSONExtractString(_raw, 'pod_namespace') CODEC(ZSTD(1)),
  `pod_name` String DEFAULT JSONExtractString(_raw, 'pod_name') CODEC(ZSTD(1)),
  `container_name` String DEFAULT JSONExtractString(_raw, 'container_name') CODEC(ZSTD(1)),
  `container_image` String DEFAULT JSONExtractString(_raw, 'container_image') CODEC(ZSTD(1)),
  `stream` LowCardinality(String) DEFAULT JSONExtractString(_raw, 'stream') CODEC(ZSTD(1)),
  `source` LowCardinality(String) DEFAULT JSONExtractString(_raw, 'source') CODEC(ZSTD(1)),
  `sourcetype` String DEFAULT JSONExtractString(_raw, 'source_type') CODEC(ZSTD(1)),
  `message` String DEFAULT JSONExtractString(_raw, 'message') CODEC(ZSTD(1)),
  `bu` LowCardinality(String) DEFAULT JSON_VALUE(_raw, '$.namespace_labels."business-unit-code"'),
  INDEX message_ngram_bf message TYPE ngrambf_v1(4, 1024, 2, 0) GRANULARITY 1,
  INDEX pod_name_token_bf pod_name TYPE tokenbf_v1(2048, 4, 0) GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toDate(_time)
ORDER BY (cluster_name, bu, pod_namespace, pod_name, container_name, _time);

INSERT INTO default.test_logs_with_complex_labels(_raw, _time, _map)
SELECT '{"cluster_name":"test' || toString(number) || '","host":"test","pod_namespace":"test","pod_name":"test","container_name":"test' || toString(number) || '","container_image":"test","stream":"test","source":"test","source_type":"test","namespace_labels":{"business-unit-code":"test"}}' AS _raw,
       now64() - INTERVAL number SECOND _time,
       map('map_key' || toString(number),'map_value' ||toString(number)) AS _map
FROM numbers(100);

DROP TABLE IF EXISTS default.test_alerts;
CREATE TABLE IF NOT EXISTS default.test_alerts
(
    `Name` String,
    `EventDate` Date,
    `EventTime` DateTime,
    `Value` UInt64
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(EventTime)
  ORDER BY (EventTime, Name);

INSERT INTO default.test_alerts SELECT if(rand() % 2, 'test2','test1') AS Name, toDate( now() - ( 5400  - (60*number) ) ) AS EventDate, toDateTime( now() - ( 5400  - (60*number) ) ) AS EventTime, if((EventTime BETWEEN now() - INTERVAL 3600 SECOND AND now() + INTERVAL 600 SECOND) OR (EventTime BETWEEN now() + INTERVAL 1200 SECOND AND now() + INTERVAL 1800 SECOND), rand() % 20, rand() ) AS Value FROM numbers(180);

DROP TABLE IF EXISTS default.test_depends_on_variable;
CREATE TABLE IF NOT EXISTS default.test_depends_on_variable(
    event_time DateTime,
    bulk_id LowCardinality(String),
    city LowCardinality(Nullable(String)),
    service_name LowCardinality(String),
    too_big_value UInt64
)
    ENGINE = MergeTree()
        PARTITION BY toYYYYMM(event_time)
        ORDER BY (event_time, bulk_id, service_name);

INSERT INTO default.test_depends_on_variable(event_time, bulk_id, city, service_name, too_big_value) SELECT toDateTime(now()-(number*10)) AS event_time, concat('bulk',toString(number%10)) AS bulk_id, if (number%600 > 0,concat('city',toString(number%600)),null) AS city, concat('service',toString(number%1000)) AS service_name, rand64() AS too_big_value FROM numbers(10000);


DROP TABLE IF EXISTS default.test_interval;
CREATE TABLE IF NOT EXISTS default.test_interval
(
    d DateTime,
    x UInt32
) ENGINE = MergeTree() ORDER BY (d);

INSERT INTO default.test_interval(d,x) SELECT toDateTime(now()-(number*10)) AS d, rand() AS x FROM numbers(1000);


DROP TABLE IF EXISTS default.test_interval_64;
CREATE TABLE IF NOT EXISTS default.test_interval_64
(
    d64 DateTime64,
    x UInt32
) ENGINE = MergeTree() ORDER BY (d64);

INSERT INTO default.test_interval_64(d64,x) SELECT toDateTime(now()-(number*10)) AS d64, rand() AS x FROM numbers(1000);


DROP TABLE IF EXISTS default.test_array_join_nested;
CREATE TABLE IF NOT EXISTS default.test_array_join_nested(
    d DateTime,
    JobName LowCardinality(String),
    Metrics Nested (
        Name LowCardinality(String),
        Value UInt64
    )
) ENGINE = MergeTree() ORDER BY (d);

INSERT INTO default.test_array_join_nested(d, JobName, Metrics.Name, Metrics.Value)
SELECT d, JobName, groupArray(metricname) AS metrics_name_arr, groupArray(metricval) AS metrics_value_arr
FROM (
      SELECT
          if(number%2,'Job2','Job1') AS JobName,
          toDateTime(now()-(number*10)) AS d,
          arrayJoin(['metric1', 'metric2']) AS metricname,
          rand64(cityHash64(arrayJoin(range(5)), number, metricname))%10 metricval
      FROM numbers(1000)
      ORDER BY d, metricname
         )
GROUP BY d, JobName;


DROP TABLE IF EXISTS default.test_datetime64;
CREATE TABLE IF NOT EXISTS default.test_datetime64
(
    d DateTime64(6),
    x UInt32
) ENGINE = MergeTree() ORDER BY (d);

INSERT INTO default.test_datetime64(d,x) SELECT toDateTime64(now64(6)-(number*10), 3) AS d, rand() AS x FROM numbers(1000);


DROP TABLE IF EXISTS default.test_rate_and_per_seconds;
CREATE TABLE IF NOT EXISTS default.test_rate_and_per_seconds (
    d DateTime,
    category LowCardinality(String),
    counter Int64
) ENGINE = MergeTree() ORDER BY (d);

INSERT INTO default.test_rate_and_per_seconds SELECT now() - 10*number, 'category1', 200 - (number % 200)  FROM numbers(10000);
INSERT INTO default.test_rate_and_per_seconds SELECT now() - 15*number, 'category2', 300 - (number % 300)  FROM numbers(10000);


DROP TABLE IF EXISTS default.test_alerts_low_frequency;
CREATE TABLE IF NOT EXISTS default.test_alerts_low_frequency (
    eventTime DateTime64(6),
    eventDate Date,
    category LowCardinality(String),
    counter Int64
) ENGINE = MergeTree() ORDER BY (eventDate, category);

INSERT INTO default.test_alerts_low_frequency SELECT now() + ((number-500)*600) + ( rand()%180 - 90 ) d, toDate(d), 'category1', number % 200  FROM numbers(1000);
INSERT INTO default.test_alerts_low_frequency SELECT now() + ((number-500)*600) + ( rand()%180 - 90 ) d, toDate(d), 'category2', number % 200  FROM numbers(1000);



CREATE TABLE IF NOT EXISTS default.nested_array_join_example
(
    time DateTime,
    dataMap Nested (
        key String,
        value UInt64
    )
) ENGINE = MergeTree
PARTITION BY toYYYYMMDD(time)
ORDER BY time;

INSERT INTO default.nested_array_join_example(time, dataMap.key, dataMap.value) VALUES (now()-INTERVAL 2 MINUTE, ['a', 'b'], [1, 2]), (now()-INTERVAL 2 MINUTE, ['a', 'b'], [3, 4]), (now()-INTERVAL 1 MINUTE, ['a', 'b'], [5, 6]), (now()-INTERVAL 1 MINUTE, ['a', 'b'], [7, 8]), (now(), ['a', 'b'], [9, 10]);

DROP TABLE IF EXISTS nodes_graph_example;
CREATE TABLE IF NOT EXISTS nodes_graph_example (
    source LowCardinality(String),
    target LowCardinality(String),
    bytes UInt64
) ENGINE=MergeTree() ORDER BY (source, target);

INSERT INTO nodes_graph_example VALUES('src1','dst1', 10), ('src2','dst1', 10), ('src2','dst1', 10);


/* https://github.com/Altinity/clickhouse-grafana/issues/386 */
DROP TABLE IF EXISTS traffic;
CREATE TABLE traffic (
  event_date Date,
  event_time DateTime,
  datacenter LowCardinality(String),
  interface LowCardinality(String),
  rx_bytes UInt64,
  tx_bytes UInt64
) ENGINE=MergeTree
ORDER BY (event_date, datacenter);

INSERT INTO traffic SELECT
  today() + INTERVAL number % 7 DAY AS event_date,
  event_date + INTERVAL number % 1440 MINUTE AS event_time,
  concat('dc', toString(number % 4)) AS datacenter,
  concat('link', toString(number % 100)) AS interface,
  number % 1000 AS rx_bytes,
  rx_bytes * 2 AS tx_bytes
FROM numbers(10080);


DROP TABLE IF EXISTS oses;
CREATE TABLE oses (
  OS LowCardinality(String),
  OSName LowCardinality(String)
) ENGINE=MergeTree()
ORDER BY OS;

INSERT INTO oses VALUES('os1','Windows XP'),('os2','Windows 7'),('os3','Windows 8'),('os4','Windows 10'),('os5','Windows 11'),('os6','MacOS'),('os7','Linux'),('os8','Android'),('os9','iOS');


DROP TABLE IF EXISTS requests;
CREATE TABLE requests (
    EventTime DateTime,
    OS LowCardinality(String),
    UserName LowCardinality(String),
    req_count UInt64
) ENGINE=MergeTree()
ORDER BY EventTime;

INSERT INTO requests SELECT now()-INTERVAL 3 HOUR+INTERVAL number SECOND, 'os' || rand() % 9 AS OS, 'user' || rand() % 1000 AS UserName, randUniform(10,10000) AS req_count FROM numbers(10000);

DROP DATABASE IF EXISTS test SYNC;
CREATE DATABASE test;

DROP TABLE IF EXISTS test.map_table SYNC;
CREATE TABLE test.map_table
(
    `time` DateTime,
    `id` String,
    `attributes` Map(LowCardinality(String), String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(time)
PRIMARY KEY (toDate(time), id)
ORDER BY (toDate(time), id)
TTL toStartOfMonth(time) + toIntervalMonth(12 * 5)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

INSERT INTO test.map_table values (now(), 'id1', {'key1': 'value1', 'key2':'value2'});
INSERT INTO test.map_table values (now(), 'id2', {'key1': 'value1', 'key2':'value2'});
INSERT INTO test.map_table values (now(), 'id2', {'key1': 'value1', 'key2':'value2'});

CREATE TABLE test.test_timezone
(
  dt   Date,
  tm   DateTime('Europe/Moscow'),
  tm64 DateTime64(3, 'Europe/Moscow'),
  v   UInt64,
  log String
) ENGINE=MergeTree
PARTITION BY toYYYYMM(dt)
ORDER BY (dt, tm);

INSERT INTO test.test_timezone
SELECT today() AS dt,
       dt + INTERVAL number SECOND, dt + INTERVAL number SECOND + INTERVAL number % 100 MILLISECOND, rand(), 'line ' || number
FROM numbers(86400);

DROP TABLE IF EXISTS default.test_barchart SYNC;
CREATE TABLE default.test_barchart
(
  _time DateTime,
  user_metadata_map   Map(String, String),
  alloc_cost          Float64,
  cluster             String,
  hpcod_resource_name String
) ENGINE = MergeTree()
ORDER BY _time;

INSERT INTO default.test_barchart
SELECT now() - INTERVAL number HOUR AS _time, map ('rocketStage', concat('stage', toString(number % 4)), 'rp_prescreenStep', '(prescreen)') AS user_metadata_map, rand() % 100 AS alloc_cost, concat('cluster', toString(number%4)) AS cluster, multiIf(cluster='cluster2', 'RESOURCE_SLEEP', cluster='cluster3', 'INTERACTIVE', concat('RESOURCE', rand() % 4)) AS hpcod_resource_name
FROM numbers(24);

-- Drop the table if it exists
DROP TABLE IF EXISTS default.test_timestamp_formats SYNC;

-- Create the table with correct syntax
CREATE TABLE default.test_timestamp_formats (
  t DateTime64(3),
  tFloat Float64,
  tDecimal Decimal64(3),
  tUInt64_3 UInt64,
  tUInt64_6 UInt64,
  tUInt64_9 UInt64,
  value UInt64
) ENGINE = MergeTree()
ORDER BY (t, tFloat, tDecimal, tUInt64_3, tUInt64_6, tUInt64_9);

-- Insert data into the table
INSERT INTO default.test_timestamp_formats
SELECT
   now64(3) - INTERVAL number + 7200 SECOND AS t,
   toFloat64(now() - INTERVAL number SECOND) + randUniform(0, 1) AS tFloat,
   toDecimal64(toFloat64(now() - INTERVAL number SECOND) + randUniform(0, 1), 3) AS tDecimal,
   toUInt64(now() - INTERVAL number SECOND)*1000 + toUInt64(randUniform(0, 1000)) AS tUInt64_3,
   toUInt64(now() - INTERVAL number SECOND)*1000000 + toUInt64(randUniform(0, 1000000)) AS tUInt64_6,
   toUInt64(now() - INTERVAL number SECOND)*1000000000 + toUInt64(randUniform(0, 1000000000)) AS tUInt64_9,
   number AS value
FROM numbers(86400);

DROP TABLE IF EXISTS default.test_lttb SYNC;
CREATE TABLE default.test_lttb(
  event_time DateTime,
  event_time_ms DateTime64(3),
  category LowCardinality(String),
  requests UInt64
) ENGINE=MergeTree() ORDER BY event_time;

INSERT INTO default.test_lttb
SELECT
  now() - INTERVAL number SECOND,
  now() - INTERVAL number SECOND + INTERVAL randUniform(0, 100) MILLISECOND,
  'category' || toString(number%25),
  rand() % 1000000
FROM numbers(86400);
