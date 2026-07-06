 SELECT DISTINCT concat(host_name, ':', toString(port)) AS remote_host

 FROM system.clusters
