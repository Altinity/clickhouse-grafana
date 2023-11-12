import React from 'react';

const QueryMacrosInfo = () => {
  return (
    <div>
      <h5>Macros</h5>
      <pre>
        <code>
          {`$table - replaced with selected table name from Query Builder\n`}
          {`$dateCol - replaced with Date:Col value from Query Builder\n`}
          {`$dateTimeCol - replaced with Column:DateTime or Column:TimeStamp value from Query Builder\n`}
          {`$from - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:From"\n`}
          {`$to - replaced with (timestamp with ms)/1000 value of UI selected "Time Range:To"\n`}
          {`$interval - replaced with selected "Group by time interval" value (as a number of seconds)\n`}
          {`$timeFilter - replaced with currently selected "Time Range". Require Column:Date and Column:DateTime or Column:TimeStamp to be selected\n`}
          {`$timeSeries - replaced with special ClickHouse construction to convert results as time-series data. Use it as "SELECT $timeSeries...". Require Column:DateTime or Column:TimeStamp to be selected\n`}
          {`$naturalTimeSeries - replaced with special ClickHouse construction to convert results as time-series data in logical/natural units. Use it as "SELECT $naturalTimeSeries...". Require Column:DateTime or Column:TimeStamp to be selected\n`}
          {`$unescape - unescapes variable value by removing single quotes. Used for multiple-value string variables: "SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"\n`}
          {`$adhoc - replaced with a rendered ad-hoc filter expression, or "1" if no ad-hoc filters exist\n`}
          {`$conditionalTest - add \`SQL predicate\` filter expression only if $variable have non empty value\n`}
          {`A description of macros is available by typing their names in Raw Editor\n`}
        </code>
      </pre>

      <h5>Functions (Only one function per query allowed)</h5>
      <pre>
        <code>
          {`$rate(cols...) - function to convert query results as "change rate per interval". Example usage: $rate(countIf(Type = 200) * 60 AS good, countIf(Type != 200) * 60 AS bad) FROM requests\n`}
          {`$columns(key, value) - function to query values as an array of [key, value], where key would be used as a label. Example usage: $columns(Type, count() c) FROM requests\n`}
          {`$rateColumns(key, value) - is a combination of $columns and $rate. Example usage: $rateColumns(Type, count() c) FROM requests\n`}
        </code>
      </pre>
    </div>
  );
};

export default QueryMacrosInfo;
