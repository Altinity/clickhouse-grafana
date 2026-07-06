SELECT
    concat(source,'->',target) AS id,
    source,
    target, 
    sum(bytes) AS mainStat
FROM $table
GROUP BY id, source, target