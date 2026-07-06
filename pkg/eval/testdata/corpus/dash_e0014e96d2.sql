SELECT hostName() FROM clusterAllReplicas('{cluster}', system.one)
SETTINGS skip_unavailable_shards=1