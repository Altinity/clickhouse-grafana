# ClickHouse datasource for Grafana 4.0+

ClickHouse datasource plugin provides a support for [ClickHouse](https://clickhouse.yandex) as a backend database.  

### Quick start
Install from [grafana.net](https://grafana.net/plugins/vertamedia-clickhouse-datasource)

OR

Copy files to your [Grafana plugin directory](http://docs.grafana.org/plugins/installation/#grafana-plugin-directory). Restart Grafana, check datasources list at http://your.grafana.instance/datasources/new, choose ClickHouse option.

### Features:

 * Access to CH via HTTP
 * Query setup
 * Raw SQL editor
 * SQL syntax highlighting 
 * Macros support
 * Additional functions
 * Templates
 * Table view
 * SingleStat view


### Access to CH via HTTP
Page configuration is standard

![config image](https://cloud.githubusercontent.com/assets/2902918/21719219/2fc6aa78-d425-11e6-83c0-ad92e068ff4e.png)


There is a small feature - ClickHouse treats HTTP Basic Authentication credentials as a database user and will try to run queries using its name.

### Query setup

Query setup interface:

![query editor image](https://cloud.githubusercontent.com/assets/2902918/24203791/5dc44d38-0f1f-11e7-9905-6deb8b28fbe4.png)

First row `FROM` contains two options: database and table. Table values depends on selected database.
Second row contains:
* Date:Col ([EventDate](https://clickhouse.yandex/reference_en.html#Date) column required for [MergeTree](https://clickhouse.yandex/reference_en.html#MergeTree) engine), 
* DateTime:Col ([DateTime](https://clickhouse.yandex/reference_en.html#DateTime) column is required for macros and functions), selected columns.

* // Plugin will try to detect date columns automatically *
* // DateTime:Col is required for our time-based macros and funcs, because all analytics is based on these values*

Button `Go to Query` is just a toggler to Raw SQL Editor

### Raw SQL Editor

Raw Editor allows custom SQL queries to be written:

![raw editor image](https://cloud.githubusercontent.com/assets/2902918/24203787/5a5da7ac-0f1f-11e7-911b-4da7cc4ddb2a.png)


Raw Editor is represented by textarea because sometimes we need to display large queries. Also, it helps to save query formatting in order to understand its structure. 
Under the textarea you can find a raw query (all macros and functions have already been replaced) which will be sent directly to ClickHouse. 

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

Functions are just templates of SQL queries and you can check the final query at [Raw SQL Editor mode](https://github.com/Vertamedia/clickhouse-grafana/blob/master/README.md#raw-sql-editor). 
If some additional complexity is needed - just copy raw sql into textarea and make according changes. Remember that macros are still available to use. 

There are some limits in function use because of poor query analysis:
* Both Date:Col and DateTime:col must be set in Query Builder
* Query must begins from function name
* Only one function can be used per query



Plugin supports the following functions:

#### $rate(cols...) - converts query results as "change rate per interval"

Example usage: 
```
$rate(countIf(Type = 200) * 60 AS good, countIf(Type != 200) * 60 AS bad) FROM requests
```

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
---

#### $columns(key, value) - query values as array of [key, value], where key will be used as label

Example usage: 
```
$columns(OSName, count(*) c) FROM requests
```

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

---

#### $rateColumns(key, value) - is a combination of $columns and $rate

Example usage: 
```
$rateColumns(OS, count(*) c) FROM requests
```

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

### Working with panels

#### Piechart (https://grafana.com/plugins/grafana-piechart-panel)

Remember that piechart plugin is not welcome for using in grafana - see https://grafana.com/blog/2015/12/04/friends-dont-let-friends-abuse-pie-charts

![top5things](https://cloud.githubusercontent.com/assets/2902918/25392562/9fadb202-29e1-11e7-95ca-5b0d2921c592.png)

To create "Top 5" diagram we will need two queries: one for 'Top 5' rows and one for 'Other' row.

Top5:
```
SELECT
    1, /* fake timestamp value */
    groupArray((UserName,  Reqs))
FROM
(
    SELECT
        UserName,
        sum(Reqs) AS Reqs
    FROM requests
    GROUP BY UserName
    ORDER BY Reqs desc
    LIMIT 5
)
```

Other:
```
SELECT
    1, /* fake timestamp value */
    tuple(tuple('Other',  sum(Reqs)))
FROM
(
    SELECT
        UserName,
        sum(Reqs) AS Reqs
    FROM requests
    GROUP BY UserName
    ORDER BY Reqs desc
    LIMIT 5,10000000000000 /* select some ridiculous number after first 5 */
)
```

### Table (https://grafana.com/plugins/table)

There are no any tricks in displaying time-series data. But to display some summary we will need to fake timestamp data:

```
SELECT
    rand() Time, /* fake timestamp value */
    UserName,
    sum(Reqs) as Reqs
FROM requests
GROUP BY
    UserName
ORDER BY 
    Reqs
```

Better to hide `Time` column at `Options` tab while editing panel


### Vertical histogram (https://grafana.com/plugins/graph)

![vertical histogram](https://cloud.githubusercontent.com/assets/2902918/25392561/9f3777e0-29e1-11e7-8b23-2ea9ae46a029.png)

To make vertical histogram from graph panel we will need to edit some settings:
* Display -> Draw Modes -> Bars
* Axes -> X-Axis -> Mode -> Series

And use next query:
```
$columns(
    Size,
    sum(Items) Items)
FROM some_table
```

// It is also possible to use query without macros

### Contribute

Since we developed this plugin only for internal needs we don't have some of Grafana's features:

* Alerts (this feature requires additional changes at backend and can't be solved by js-plugin)
* Annotations
* Labels

We know that code quality needs a tons of improvements and unit-tests. We will continue working on this. 
If you have any idea for an improvement or found a bug do not hesitate to open an issue or submit a pull request. 
We will appreciate any help from the community which will make working with such amazing products as ClickHouse and Grafana more convenient.


Plugin creation was inspired by great [grafana-sqldb-datasource](https://github.com/sraoss/grafana-sqldb-datasource)

License
-------
MIT License, please see [LICENSE](https://github.com/Vertamedia/clickhouse-grafana/blob/master/LICENSE) for details.

