# ClickHouse datasource for Grafana 4.6+

ClickHouse datasource plugin provides a support for [ClickHouse](https://clickhouse.yandex) as a backend database.  

### Quick start
Install from [grafana.net](https://grafana.net/plugins/vertamedia-clickhouse-datasource)

OR

Copy files to your [Grafana plugin directory](http://docs.grafana.org/plugins/installation/#grafana-plugin-directory). Restart Grafana, check datasources list at http://your.grafana.instance/datasources/new, choose ClickHouse option.

### Features:

 * Access to CH via HTTP
 * Query setup
 * Raw SQL editor
 * Query formatting
 * Macros support
 * Additional functions
 * Templates
 * Table view
 * SingleStat view
 * Ad-hoc filters
 * Annotations


### Access to CH via HTTP
Page configuration is standard

![settings](https://cloud.githubusercontent.com/assets/2902918/25473216/3ebd20fc-2b37-11e7-9743-fbbf2c5bdd3f.png)


There is a small feature - ClickHouse treats HTTP Basic Authentication credentials as a database user and will try to run queries using its name.

#### [CHProxy](https://github.com/Vertamedia/chproxy) (optional)
Using of [CHProxy](https://github.com/Vertamedia/chproxy) will bring additional features:
* Easily setup `HTTPS` access to ClickHouse as shown [here](https://github.com/Vertamedia/chproxy#authorize-users-by-passwords-via-https)
to provide secure access.
* Limit concurrency and execution time for requests from `Grafana` as shown [here](https://github.com/Vertamedia/chproxy#spread-selects-from-reporting-apps-among-cluster-nodes)
to prevent `ClickHouse` overloading from `Grafana`.
* Protection against request bursts for dashboards with numerous graphs. `CHProxy` allows to queue requests and execute them sequentially.
To learn more - read about params `max_queue_size` and `max_queue_time` at [CHProxy](https://github.com/Vertamedia/chproxy) page.
* Response caching for the most frequent queries as shown [here](https://github.com/Vertamedia/chproxy#caching).
`Caching` will protect `ClickHouse` from excessive refreshes and will be optimal option for popular dashboards.
> Hint - if you need to cache requests like `last 24h` where timestamp changes constantly then try to use `Round` option at `Raw Editor`


### Query setup

Query setup interface:

![query editor image](https://user-images.githubusercontent.com/2902918/32498037-2e9df438-c3d7-11e7-90de-73957c20cf6d.png)

First row `FROM` contains two options: database and table. Table values depends on selected database.
Second row contains selectors for time filtering:
* Column:Date ([EventDate](https://clickhouse.yandex/reference_en.html#Date))
* Column:DateTime ([DateTime](https://clickhouse.yandex/reference_en.html#DateTime)) or Column:TimeStamp (UInt32).

> Plugin will try to detect date columns automatically

> Column:DateTime or Column:TimeStamp are required for time-based macros and functions, because all analytics is based on these values

Button `Go to Query` is just a toggler to Raw SQL Editor

### Raw SQL Editor

Raw Editor allows custom SQL queries to be written:

![raw editor image](https://user-images.githubusercontent.com/2902918/32843338-337f2efc-ca28-11e7-9bde-ec65faa3cdc9.png)


Raw Editor allows to type queries, get info about functions and macroses, format queries as Clickhouse do. 
Under the Editor you can find a raw query (all macros and functions have already been replaced) which will be sent directly to ClickHouse. 

### Macros

Plugin supports the following marcos:

* $table - replaced with selected table name from Query Builder
* $dateCol - replaced with Date:Col value from Query Builder
* $dateTimeCol - replaced with Column:DateTime or Column:TimeStamp value from Query Builder
* $from - replaced with timestamp/1000 value of selected "Time Range:From"
* $to - replaced with timestamp/1000 value of selected "Time Range:To"
* $interval - replaced with selected "Group by time interval" value (as a number of seconds)
* $timeFilter - replaced with currently selected "Time Range". 
  Requires Column:Date and Column:DateTime or Column:TimeStamp to be selected
* $timeFilterColumn($column) - replaced with currently selected "Time Range" for column passed as `$column` argument. Use it in queries or query variables as `...WHERE $timeFilterColumn($column)...` or `...WHERE $timeFilterColumn(created_at)...`.
* $timeSeries - replaced with special ClickHouse construction to convert results as time-series data. Use it as "SELECT $timeSeries...". 
* $unescape - unescapes variable value by removing single quotes. Used for multiple-value string variables: "SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"
* $adhoc - replaced with a rendered ad-hoc filter expression, or "1" if no ad-hoc filters exist. Since ad-hoc applies automatically only to outer queries the macros can be used for filtering in inner queries.

A description of macros is available by typing their names in Raw Editor

### Functions

Functions are just templates of SQL queries and you can check the final query at [Raw SQL Editor mode](https://github.com/Vertamedia/clickhouse-grafana/blob/master/README.md#raw-sql-editor). 
If some additional complexity is needed - just copy raw sql into Raw Editor and make according changes. Remember that macros are still available to use. 

There are some limits in function use because of poor query analysis:
* Column:Date and Column:DateTime or Column:TimeStamp must be set in Query Builder
* Query must begins from function name
* Only one function can be used per query



Plugin supports the following functions:

#### $rate(cols...) - converts query results as "change rate per interval"

Example usage: 
```
$rate(countIf(Type = 200) AS good, countIf(Type != 200) AS bad) FROM requests
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
        (intDiv(toUInt32(EventTime), 60)) * 1000 AS t, 
        countIf(Type = 200) AS good, 
        countIf(Type != 200) AS bad
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

#### $perSecond(cols...) - converts query results as "change rate per interval" for Counter-like(growing only) metrics

Example usage:
```
$perSecond(total_requests) FROM requests
```

Query will be transformed into:
```
SELECT
    t,
    if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t / 1000)) AS max_0_Rate
FROM
(
    SELECT
        (intDiv(toUInt32(Time), 60) * 60) * 1000 AS t,
        max(total_requests) AS max_0
    FROM requests
    WHERE ((Date >= toDate(1535711819)) AND (Date <= toDate(1535714715)))
    AND ((Time >= toDateTime(1535711819)) AND (Time <= toDateTime(1535714715)))
    GROUP BY t
    ORDER BY t ASC
)
```
// see [issue 78](https://github.com/Vertamedia/clickhouse-grafana/issues/78) for the background

---

#### $perSecondColumns(key, value) - is a combination of $columns and $perSecond for Counter-like metrics

Example usage:
```
$perSecondColumns(type, total) FROM requests WHERE Type in ('udp','tcp')
```

Query will be transformed into:
```
SELECT
    t,
    groupArray((type, max_0_Rate)) AS groupArr
FROM
(
    SELECT
        t,
        type,
        if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t / 1000)) AS max_0_Rate
    FROM
    (
        SELECT
            (intDiv(toUInt32(Time), 60) * 60) * 1000 AS t,
            type,
            max(total) AS max_0
        FROM requests
        WHERE ((Date >= toDate(1535711819)) AND (Date <= toDate(1535714715)))
        AND ((Time >= toDateTime(1535711819)) AND (Time <= toDateTime(1535714715)))
        AND (Type IN ('udp', 'tcp'))
        GROUP BY
            t,
            type
        ORDER BY
            type ASC,
            t ASC
    )
)
GROUP BY t
ORDER BY t ASC
```
// see [issue 80](https://github.com/Vertamedia/clickhouse-grafana/issues/80) for the background

---

### Working with panels

#### Piechart (https://grafana.com/plugins/grafana-piechart-panel)

Remember that piechart plugin is not welcome for using in grafana - see https://grafana.com/blog/2015/12/04/friends-dont-let-friends-abuse-pie-charts

![top5things](https://cloud.githubusercontent.com/assets/2902918/25392562/9fadb202-29e1-11e7-95ca-5b0d2921c592.png)

To create "Top 5" diagram we will need two queries: one for 'Top 5' rows and one for 'Other' row.

Top5:
```
SELECT
    1, /* fake timestamp value */
    UserName,
    sum(Reqs) AS Reqs
FROM requests
GROUP BY UserName
ORDER BY Reqs desc
LIMIT 5
```

Other:
```
SELECT
    1, /* fake timestamp value */
    UserName,
    sum(Reqs) AS Reqs
FROM requests
GROUP BY UserName
ORDER BY Reqs
LIMIT 5,10000000000000 /* select some ridiculous number after first 5 */
```

#### Table (https://grafana.com/plugins/table)

There are no any tricks in displaying time-series data. To print summary data, omit time column, and format the result as "Table".

```
SELECT
    UserName,
    sum(Reqs) as Reqs
FROM requests
GROUP BY
    UserName
ORDER BY 
    Reqs
```

#### Vertical histogram (https://grafana.com/plugins/graph)

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


#### Worldmap panel (https://github.com/grafana/worldmap-panel)

![worldmap](https://user-images.githubusercontent.com/2902918/39430337-47513f4c-4c96-11e8-981d-04533538abec.png)

If you have a table with country/city codes:
```
SELECT
    1,
    CountryCode AS c,
    sum(requests) AS Reqs
FROM requests
GLOBAL ANY INNER JOIN
(
    SELECT Country country, CountryCode
    FROM countries
) USING (country)
WHERE $timeFilter
GROUP BY
    c
ORDER BY Reqs DESC
```

If you are using [geohash](https://github.com/grafana/worldmap-panel#geohashes-as-the-data-source) set following options:

![Format](https://user-images.githubusercontent.com/2902918/32726398-96793438-c881-11e7-84b8-26e82dbdb40c.png)

And make following query with `Table` formatting:

![geohash-query](https://user-images.githubusercontent.com/2902918/32726399-96a01e86-c881-11e7-9368-61207bae72fd.png)


### Ad-hoc filters

If there is an Ad-hoc variable, plugin will fetch all columns of all tables of all databases (except system database) as tags.
So in dropdown menu will be options like `database.table.column`. If the default database is specified, it will only fetch tables and columns from that database, and the dropdown menu will have option like `table.column`. If there are ENUM columns,
plugin will fetch their options and use them as tag values.

Plugin will apply Ad-hoc filters to all queries on the dashboard if their settings `$database` and `$table` are the same
as Ad-hoc's `database.table`. If the ad-hoc filter doesn't specify table, it will apply to all queries regardless of the table.
This is useful if the dashboard contains queries to multiple different tables.

![ad-hoc](https://user-images.githubusercontent.com/2902918/37139531-ed67f222-22b6-11e8-8815-9268850f16fb.png)

> There are no option to apply OR operator for multiple Ad-hoc filters - see grafana/grafana#10918

> There are no option to use IN operator for Ad-hoc filters due to Grafana limitations

There may be cases when CH contains too many tables and columns so their fetching could take notably amount of time. And if you need
to have multiple dashboards with different databases using of `default database` won't help. The best way to solve this will be to have parametrized
ad-hoc variable in dashboard settings. Currently it's not supported by Grafana interface (see [issue](https://github.com/grafana/grafana/issues/13109)).
As a temporary workaround, plugin will try to look for variable with name `adhoc_query_filter` and if it exists will use it's value as query to fetch columns.
To do so we recommend to create some `constant` variable with name `adhoc_query_filter` and set value similar to following:
```
SELECT database, table, name, type FROM system.columns WHERE table='myTable' ORDER BY database, table
```

That should help to control data fetching by ad-hoc queries.


### Query variables

To use time range dependent macros like `$from` and `$to` in your query the refresh mode of the template variable needs to be set to On Time Range Change.
```
SELECT ClientID FROM events WHERE EventTime > $from AND EventTime < $to
```


### Configure the Datasource with Provisioning
It’s now possible to configure datasources using config files with Grafana’s provisioning system.
You can read more about how it works and all the settings you can set for datasources on the [provisioning docs page](http://docs.grafana.org/administration/provisioning/#datasources)

Here are some provisioning example:
```
apiVersion: 1

datasources:
 - name: Clickhouse
   type: vertamedia-clickhouse-datasource
   access: proxy
   url: http://localhost:8123

   # <bool> enable/disable basic auth
   basicAuth:
   # <string> basic auth username
   basicAuthUser:
   # <string> basic auth password
   basicAuthPassword:
   # <bool> enable/disable with credentials headers
   withCredentials:
   # <bool> mark as default datasource. Max one per org
   isDefault:
   # <map> fields that will be converted to json and stored in json_data
   jsonData:
      # <bool> enable/disable sending 'add_http_cors_header=1' parameter
      addCorsHeader:
      # <bool> enable/disable using POST method for sending queries
      usePOST:
      # <string> default database name
      defaultDatabase:
```

Some settings and security params are the same for all datasources. You can find them [here](http://docs.grafana.org/administration/provisioning/#example-datasource-config-file)


### FAQ

> Time series last point is not the real last point

Plugin extrapolates last datapoint if timerange is `last N` to avoid displaying of constantly decreasing graphs
when timestamp in table is rounded to minute or bigger.
If it so then in 99% cases last datapoint will be much less than previous one, because last minute is not finished yet.
That's why plugin checks prev datapoints and tries to predict last datapoint value just as it was already written into db.

> Why no alerts support?

Alerts feature requires changes in `Grafana`'s backend, which can't be extended for now. `Grafana`'s maintainers are working on this feature.

### Build

The build works with either NPM or Yarn:

```
yarn run build
```

Tests can be run with Karma:

```
yarn run test
```

### Contribute

Since we developed this plugin only for internal needs we don't have some of Grafana's features:

* Alerts (this feature requires additional changes at backend and can't be solved by js-plugin)
* Labels

We know that code quality needs a tons of improvements and unit-tests. We will continue working on this. 
If you have any idea for an improvement or found a bug do not hesitate to open an issue or submit a pull request. 
We will appreciate any help from the community which will make working with such amazing products as ClickHouse and Grafana more convenient.


Plugin creation was inspired by great [grafana-sqldb-datasource](https://github.com/sraoss/grafana-sqldb-datasource)

License
-------
MIT License, please see [LICENSE](https://github.com/Vertamedia/clickhouse-grafana/blob/master/LICENSE) for details.

