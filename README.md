# ClickHouse datasource for Grafana 4.0+

ClickHouse datasource plugin provides a support for [ClickHouse](https://clickhouse.yandex) as a backend database.  

Features:

 * Access to CH via HTTP
 * Query Builder
 * Raw SQL editor
 * Macros support
 * Additional functions
 * Templates
 * Table view
 * SingleStat view


### Access to CH via HTTP
Page configuration is standard

![config image](https://cloud.githubusercontent.com/assets/2902918/21719219/2fc6aa78-d425-11e6-83c0-ad92e068ff4e.png)


There is a small feature - ClickHouse treats HTTP Basic Authentication credentials as a database user and will try to run queries using its name.

### Query Builder

Plugin supports Query Builder:

![query editor image](https://cloud.githubusercontent.com/assets/2902918/21719220/2fddcde8-d425-11e6-8b54-1d8609d9d1cd.png)

Here you have to set database, table, WHERE-condition (if needed), 
Date:Col ([EventDate](https://clickhouse.yandex/reference_en.html#Date) column required for [MergeTree](https://clickhouse.yandex/reference_en.html#MergeTree) engine), 
DateTime:Col ([DateTime](https://clickhouse.yandex/reference_en.html#DateTime) column is required only for our needs), selected columns.

*// DateTime:Col is required for our time-based macros and funcs, because all analytics is based on these values*

Part "Query" displays a current automatically built query based on previously selected values. Feel free to edit it according to your needs.

### Raw SQL Editor

Raw Editor allows custom SQL queries to be written:

![raw editor image](https://cloud.githubusercontent.com/assets/2902918/21719221/2fea14e0-d425-11e6-9211-5e842169eef3.png)


Raw Editor is represented by textarea because sometimes we need to display large queries. Also, it helps to save query formatting in order to understand its structure. 
Under the textarea you can find a raw query (all macros and functions have already been replaced) which will be sent directly to ClickHouse. 

Remember, Raw Editor and Query Builder are incompatible which means that it is impossible to make changes in Raw Editor and switch to Query Builder - all changes will be overridden. There is a special confirmation window for such cases.

### Macros

Plugin supports the following marcos:

* $timeCol - replaced with Date:Col value from Query Builder
* $dateTimeCol - replaced with DateTime:Col value from Query Builder
* $from - replaced with timestamp/1000 value of selected "Time Range:From"
* $to - replaced with timestamp/1000 value of selected "Time Range:To"
* $interval - replaced with selected "Group by time interval" value (as a number of seconds)
* $timeFilter - replaced with currently selected "Time Range". 
  Require Date:Col and DateTime:Col to be selected
* $timeSeries - replaced with special ClickHouse construction to convert results as time-series data. Use it as "SELECT $timeSeries...". 
Require DateTime:Col to be selected

A description of macros is available from an interface by clicking on the info-button

### Functions

Plugin supports the following functions:

###### $rate(cols...) - converts query results as "change rate per interval"

Example usage: $rate(countIf(Type = 200) * 60 AS good, countIf(Type != 200) * 60 AS bad) FROM requests

Query will be transformed into:
```
SELECT 
    t, 
    good / runningDifference(t / 1000) AS goodRate, 
    bad / runningDifference(t / 1000) AS badRate
FROM 
(
    SELECT 
        (intDiv(toUInt32(EventTime), 60) * 60) * 1000 AS t, 
        countIf(Type = 200) * 60 AS good, 
        countIf(Type != 200) * 60 AS bad
    FROM requests 
    WHERE ((EventDate >= toDate(1482796747)) AND (EventDate <= toDate(1482853383))) AND ((EventTime >= toDateTime(1482796747)) AND (EventTime <= toDateTime(1482853383)))
    GROUP BY t
    ORDER BY t ASC
) 
```


###### $columns(key, value) - query values as array of [key, value], where key would be used as label

Example usage: $columns(OSName, count(*) c) FROM requests

Query will be transformed into:
```
SELECT 
    t, 
    groupArray((OSName, c)) AS groupArr
FROM 
(
    SELECT 
        (intDiv(toUInt32(EventTime), 60) * 60) * 1000 AS t, 
        OSName, 
        count(*) AS c
    FROM requests 
    ANY INNER JOIN oses USING (OS)
    WHERE ((EventDate >= toDate(1482796627)) AND (EventDate <= toDate(1482853383))) AND ((EventTime >= toDateTime(1482796627)) AND (EventTime <= toDateTime(1482853383)))
    GROUP BY 
        t, 
        OSName
    ORDER BY 
        t ASC, 
        OSName ASC
) 
GROUP BY t
ORDER BY t ASC
```

This will help to build the next graph:

![req_by_os image](https://cloud.githubusercontent.com/assets/2902918/21719222/2feabf30-d425-11e6-9042-9d290ef07884.png)


###### $rateColumns(key, value) - is a combination of $columns and $rate

Example usage: $rateColumns(OS, count(*) c) FROM requests

Query will be transformed into:
```
SELECT 
    t, 
    arrayMap(lambda(tuple(a), (a.1, a.2 / runningDifference(t / 1000))), groupArr)
FROM 
(
    SELECT 
        t, 
        groupArray((OS, c)) AS groupArr
    FROM 
    (
        SELECT 
            (intDiv(toUInt32(EventTime), 60) * 60) * 1000 AS t, 
            OS, 
            count(*) AS c
        FROM requests 
        WHERE ((EventDate >= toDate(1482796867)) AND (EventDate <= toDate(1482853383))) AND ((EventTime >= toDateTime(1482796867)) AND (EventTime <= toDateTime(1482853383)))
        GROUP BY 
            t, 
            OS
        ORDER BY 
            t ASC, 
            OS ASC
    ) 
    GROUP BY t
    ORDER BY t ASC
) 

```


There are some limits in function use because of poor query analysis:
* Both Date:Col and DateTime:col must be set in Query Builder
* Query must begins from function name
* Only one function can be used per query

Those functions are just templates of SQL queries and you can check the final query at Raw SQL Editor mode. 
If some additional complexity is needed - just copy raw sql into textarea and make according changes. Remember that macros are still available to use. 

It will probably be changed in future to allow combinations and usage in custom places of query.


### Contribute

Since we developed this plugin only for internal needs we don't have some of Grafana's features:

* Alerts
* Annotations
* Labels

We know that code quality needs a tons of improvements and unit-tests. We would continue working on this. 
If you have any idea for an improvement or found a bug do not hesitate to open an issue or submit a pull request. 
We would appreciate any help from the community which would make working with such amazing products as ClickHouse and Grafana more convenient.


Plugin creation was inspired by great [grafana-sqldb-datasource](https://github.com/sraoss/grafana-sqldb-datasource)

License
-------
MIT License, please see [LICENSE](https://github.com/Vertamedia/clickhouse-grafana/blob/master/LICENSE) for details.

