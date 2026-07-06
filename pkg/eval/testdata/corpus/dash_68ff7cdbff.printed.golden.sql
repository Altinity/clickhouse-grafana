 $columns(
     substring(concat(JobName as JobName, ' # ', Metrics.Name as MetricName), 1, 50) as JobSource,
     sum(rand() %(Metrics.Value + 1)) as Kafka_lag_max) SELECT
 FROM $table

 ARRAY JOIN
(
 Metrics

) 