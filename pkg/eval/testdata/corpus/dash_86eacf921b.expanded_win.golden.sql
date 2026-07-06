SELECT
    concat(source,'->',target) AS id,
    source,
    target, 
    sum(bytes) AS mainStat
FROM default.test_grafana
GROUP BY id, source, target