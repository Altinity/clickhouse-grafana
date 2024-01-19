const getMacrosAutocompletion = function () {
    return [
        {
            "name": "$table",
            "def": "$table",
            "docText": "Replaced with selected table name from Query Builder"
        },
        {
            "name": "$dateCol",
            "def": "$dateCol",
            "docText": "Replaced with `Date:Col` value from Query Builder"
        },
        {
            "name": "$dateTimeCol",
            "def": "$dateTimeCol",
            "docText": "Replaced with `Column:DateTime` or `Column:TimeStamp` value from Query Builder"
        },
        {
            "name": "$from",
            "def": "$from",
            "docText": "Replaced with timestamp/1000 value of selected `Time Range:From`"
        },
        {
            "name": "$to",
            "def": "$to",
            "docText": "Replaced with timestamp/1000 value of selected `Time Range:To`"
        },
        {
            "name": "$interval",
            "def": "$interval",
            "docText": "Replaced with selected `Group by time interval` value (as a number of seconds)"
        },
        {
            "name": "$timeFilter",
            "def": "$timeFilter",
            "docText": "Replaced with currently selected `Time Range`. Requires `Column:Date` and `Column:DateTime` or `Column:TimeStamp` or `Column:DateTime64` to be selected"
        },
        {
            "name": "$timeFilterMs",
            "def": "$timeFilterMs",
            "docText": "Replaced with currently selected `Time Range` with Millisecond precision. Requires `Column:DateTime64` to be selected"
        },
        {
            "name": "$timeFilterByColumn",
            "def": "$timeFilterByColumn(column_name)",
            "docText": "Replaced with currently selected `Time Range`. Requires column name with type `Date` and `DateTime` or `DateTime64`",
        },
        {
            "name": "$timeFilter64ByColumn",
            "def": "$timeFilter64ByColumn(column_name)",
            "docText": "Replaced with currently selected `Time Range` with sub-seconds values. Requires column name with type `DateTime64`",
        },
        {
            "name": "$timeSeries",
            "def": "$timeSeries",
            "docText": "Replaced with special ClickHouse construction to convert results as time-series data. Use it as `SELECT $timeSeries...`. Require `Column:DateTime` or `Column:TimeStamp` or `Column:DateTime64` to be selected"
        },
        {
            "name": "$timeSeriesMs",
            "def": "$timeSeriesMs",
            "docText": "Replaced with special ClickHouse construction to convert results as time-series data with Milliseconds precision. Use it as `SELECT $timeSeriesMs...`. Require `Column:DateTime64` to be selected"
        },
        {
            "name": "$naturalTimeSeries",
            "def": "$naturalTimeSeries",
            "docText": "Replaced with special ClickHouse construction to convert results as time-series data in logical/natural units. Use it as `SELECT $timeSeries...`. Require `Column:DateTime` or `Column:TimeStamp` to be selected"
        },
        {
            "name": "$rate",
            "def": "$rate(cols...)",
            "docText": "Converts query results as `change rate per interval`. Can be used to display changes-per-second." +
                "\n" +
                "Example:\n $rate(countIf(Type = 200) AS good, countIf(Type != 200) AS bad) FROM requests"
        },
        {
            "name": "$perSecond",
            "def": "$perSecond(cols...)",
            "docText": "Similar to $rate macros for Counter-like type of metrics which are only grow. The macros will chose the max" +
                "value for each column in every timeSlot and calculate the changes." +
                "\n" +
                "Example:\n $perSecond(total_requests) FROM requests"
        },
        {
            "name": "$delta",
            "def": "$delta(cols...)",
            "docText": "The macros will chose the max value for each column in every timeSlot and calculate the delta. Could have negative values" +
                "\n" +
                "Example:\n $delta(total_requests) FROM requests"
        },
        {
            "name": "$increase",
            "def": "$increase(cols...)",
            "docText": "The macros will chose the max value for each column in every timeSlot and calculate the delta. Have only positive values" +
                "\n" +
                "Example:\n $increase(total_requests) FROM requests"
        },
        {
            "name": "$perSecondColumns",
            "def": "$perSecondColumns(key, value)",
            "docText": "A combination of $perSecond and $columns" +
                "\n" +
                "Example:\n $perSecondColumns(type, total) FROM requests"
        },
        {
            "name": "$deltaColumns",
            "def": "$deltaColumns(key, value)",
            "docText": "A combination of $delta and $columns" +
                "\n" +
                "Example:\n $deltaColumns(type, total) FROM requests"
        },
        {
            "name": "$increaseColumns",
            "def": "$increaseColumns(key, value)",
            "docText": "A combination of $increase and $columns" +
                "\n" +
                "Example:\n $increaseColumns(type, total) FROM requests"
        },
        {
            "name": "$columns",
            "def": "$columns(key, value)",
            "docText": "Query values as array of [key, value], where key will be used as label. Can be used to display multiple lines at graph" +
                "\n" +
                "Example:\n $columns(OSName, count(*) c) FROM requests"
        },
        {
            "name": "$rateColumns",
            "def": "$rateColumns(key, value)",
            "docText": "A combination of `$columns` and `$rate` ." +
                "\n" +
                "Example:\n $rateColumns(OS, count(*) c) FROM requests"
        },
        {
            "name": "$unescape",
            "def": "$unescape($variable)",
            "docText": "Unescapes variable value by removing single quotes" +
                "\n" +
                "Example:\n SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"
        },
        {
            "name": "$adhoc",
            "def": "$adhoc",
            "docText": "Replaced with a rendered ad-hoc filter expression, or `1` if no ad-hoc filters exist" +
                "\n" +
                "Example:\n SELECT * FROM (select a, b from table2 WHERE $adhoc) ORDER BY a"
        },
        {
            "name": "$conditionalTest",
            "def": "$conditionalTest(SQL predicate,$variable)",
            "docText": "Will add `SQL predicate` filter expression only if $variable have non empty value" +
                "\n" +
                "Example:\n" +
                "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter\n" +
                "  $conditionalTest(AND toLowerCase(column) in ($var),$var)\n" +
                "  $conditionalTest(AND toLowerCase(column2) like '%$text%',$text)\n" +
                "  $conditionalTest(\n" +
                "    AND toLowerCase(column3) ilike ${text_with_single_quote:sqlstring},\n" +
                "    $text_with_single_quote\n" +
                "  )\n" +
                "GROUP BY t\n" +
                "ORDER BY t"

        },
    ];
};
export {
    getMacrosAutocompletion
}
