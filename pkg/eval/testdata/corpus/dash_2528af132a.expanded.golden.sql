SELECT 
    toString(normalized_query_hash) as query_hash,
    argMax(query_id, cputime) AS sample_query_id,
    replace(argMax(query, cputime), '\n', ' ') AS query,
    count() as cnt,
    sum(query_duration_ms) / 1000 AS QueriesDuration, /* wall clock */
    sum(ProfileEvents['OSCPUVirtualTimeMicroseconds'] as cputime) / 1000000 AS OSCPUVirtualTime, /* similar to usertime + system time */
    sum(ProfileEvents['OSIOWaitMicroseconds']) / 1000000 AS OSIOWaitTime, /* IO waits, usually disks - that metric is 'orthogonal' to other */ 
    quantile(0.97)(memory_usage) as MemoryUsageQ97 ,
    sum(read_rows) AS ReadRows,
    sum(read_bytes) AS ReadBytes,
    sum(ProfileEvents['NetworkReceiveBytes']) AS NetworkReceiveBytes,
    sum(ProfileEvents['NetworkSendBytes']) AS NetworkSendBytes,
    sum(written_rows) AS WrittenRows,
    sum(written_bytes) AS WrittenBytes, /* */
    sum(result_rows) AS ResultRows,
    sum(result_bytes) AS ResultBytes,
    arrayStringConcat(groupUniqArrayIf(5)( errorCodeToName(exception_code), exception_code <> 0 ), ',') AS exceptions,
    arrayStringConcat(groupUniqArray(5)( initial_user ), ',') AS users,
    sum(ProfileEvents['DiskReadElapsedMicroseconds']) / 1000000 AS DiskReadTime,
    sum(ProfileEvents['DiskWriteElapsedMicroseconds']) / 1000000 AS DiskWriteTime,
    sum(ProfileEvents['RealTimeMicroseconds']) / 1000000 AS RealTime,  /* same as above but x number of thread */
    sum(ProfileEvents['UserTimeMicroseconds']) / 1000000 AS UserTime,  /* time when our query was doin some cpu-insense work, creating cpu load */
    sum(ProfileEvents['SystemTimeMicroseconds']) / 1000000 AS SystemTime, /* time spend on waiting for some system operations */
    sum(ProfileEvents['NetworkSendElapsedMicroseconds']) / 1000000 AS NetworkSendTime, /* check the other side of the network! */
    sum(ProfileEvents['NetworkReceiveElapsedMicroseconds']) / 1000000 AS NetworkReceiveTime, /* check the other side of the network! */
    sum(ProfileEvents['SelectedParts']) as SelectedParts,
    sum(ProfileEvents['SelectedRanges']) as SelectedRanges,
    sum(ProfileEvents['SelectedMarks']) as SelectedMarks,
    sum(ProfileEvents['SelectedRows']) as SelectedRows,  /* those may different from read_rows - here the number or rows potentially matching the where conditions, not neccessary all will be read */
    sum(ProfileEvents['SelectedBytes']) as SelectedBytes,
    sum(ProfileEvents['FileOpen']) as FileOpen,
    sum(ProfileEvents['ZooKeeperTransactions']) as ZooKeeperTransactions,
    sum(ProfileEvents['OSReadBytes'] ) as OSReadBytesExcludePageCache,
    sum(ProfileEvents['OSWriteBytes'] ) as OSWriteBytesExcludePageCache,
    sum(ProfileEvents['OSReadChars'] ) as OSReadBytesIncludePageCache,
    sum(ProfileEvents['OSWriteChars'] ) as OSWriteCharsIncludePageCache,
    anyIf(exception, exception<>'') as exception_sample,
    min(event_time) as min_event_time,
    max(event_time) as max_event_time
FROM clusterAllReplicas('{cluster}', merge(system,'^query_log'))
WHERE 
hostName() IN ($hostname)
AND event_date >= toDate(1735787045) AND event_date <= toDate(1735790706) AND event_time >= toDateTime(1735787045) AND event_time <= toDateTime(1735790706) AND type in (2,4)-- QueryFinish, ExceptionWhileProcessing
and normalized_query_hash IN [$query_hash]
GROUP BY normalized_query_hash
ORDER BY cnt DESC
SETTINGS skip_unavailable_shards=1