import { each } from 'lodash';
import { SqlQueryHelper } from './sql-query-helper';

export default class SqlQueryMacros {
  static applyMacros(query: string, ast: any): string {
    if (SqlQueryHelper.contain(ast, '$columns')) {
      return SqlQueryMacros.columns(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$rateColumns')) {
      return SqlQueryMacros.rateColumns(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$rate')) {
      return SqlQueryMacros.rate(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$perSecond')) {
      return SqlQueryMacros.perSecond(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$perSecondColumns')) {
      return SqlQueryMacros.perSecondColumns(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$increase')) {
      return SqlQueryMacros.increase(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$increaseColumns')) {
      return SqlQueryMacros.increaseColumns(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$delta')) {
      return SqlQueryMacros.delta(query, ast);
    }
    if (SqlQueryHelper.contain(ast, '$deltaColumns')) {
      return SqlQueryMacros.deltaColumns(query, ast);
    }
    return query;
  }

  static getDateFilter(): string {
    return '$dateCol >= toDate($from) AND $dateCol <= toDate($to)';
  }

  static getDateTimeFilter(dateTimeType: string) {
    let convertFn = function (t: string): string {
      if (dateTimeType === 'DATETIME') {
        return 'toDateTime(' + t + ')';
      }
      if (dateTimeType === 'DATETIME64') {
        return 'toDateTime64(' + t + ', 3)';
      }
      return t;
    };
    return '$dateTimeCol >= ' + convertFn('$from') + ' AND $dateTimeCol <= ' + convertFn('$to');
  }

  static getDateTimeFilterMs(dateTimeType: string) {
    let convertFn = function (t: string): string {
      if (dateTimeType === 'DATETIME') {
        return 'toDateTime(' + t + ')';
      }
      if (dateTimeType === 'DATETIME64') {
        return 'toDateTime64(' + t + ', 3)';
      }
      return '(' + t + ')';
    };
    return '$dateTimeCol >= ' + convertFn('$__from/1000') + ' AND $dateTimeCol <= ' + convertFn('$__to/1000');
  }

  static getTimeSeries(dateTimeType: string): string {
    if (dateTimeType === 'DATETIME') {
      return '(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000';
    }
    if (dateTimeType === 'DATETIME64') {
      return '(intDiv(toFloat64($dateTimeCol) * 1000, ($interval * 1000)) * ($interval * 1000))';
    }
    return '(intDiv($dateTimeCol, $interval) * $interval) * 1000';
  }

  static getTimeSeriesMs(dateTimeType: string): string {
    if (dateTimeType === 'DATETIME') {
      return '(intDiv(toUInt32($dateTimeCol) * 1000, $__interval_ms) * $__interval_ms)';
    }
    if (dateTimeType === 'DATETIME64') {
      return '(intDiv(toFloat64($dateTimeCol) * 1000, $__interval_ms) * $__interval_ms)';
    }
    return '(intDiv($dateTimeCol, $__interval_ms) * $__interval_ms)';
  }

  static getNaturalTimeSeries(dateTimeType: string, from: number, to: number): string {
    let SOME_MINUTES = 60 * 20;
    let FEW_HOURS = 60 * 60 * 4;
    let SOME_HOURS = 60 * 60 * 24;
    let MANY_HOURS = 60 * 60 * 72;
    let FEW_DAYS = 60 * 60 * 24 * 15;
    let MANY_WEEKS = 60 * 60 * 24 * 7 * 15;
    let FEW_MONTHS = 60 * 60 * 24 * 30 * 10;
    let FEW_YEARS = 60 * 60 * 24 * 365 * 6;
    if (dateTimeType === 'DATETIME' || dateTimeType === 'DATETIME64') {
      let duration = to - from;
      if (duration < SOME_MINUTES) {
        return 'toUInt32($dateTimeCol) * 1000';
      } else if (duration < FEW_HOURS) {
        return 'toUInt32(toStartOfMinute($dateTimeCol)) * 1000';
      } else if (duration < SOME_HOURS) {
        return 'toUInt32(toStartOfFiveMinute($dateTimeCol)) * 1000';
      } else if (duration < MANY_HOURS) {
        return 'toUInt32(toStartOfFifteenMinutes($dateTimeCol)) * 1000';
      } else if (duration < FEW_DAYS) {
        return 'toUInt32(toStartOfHour($dateTimeCol)) * 1000';
      } else if (duration < MANY_WEEKS) {
        return 'toUInt32(toStartOfDay($dateTimeCol)) * 1000';
      } else if (duration < FEW_MONTHS) {
        return 'toUInt32(toDateTime(toMonday($dateTimeCol))) * 1000';
      } else if (duration < FEW_YEARS) {
        return 'toUInt32(toDateTime(toStartOfMonth($dateTimeCol))) * 1000';
      } else {
        return 'toUInt32(toDateTime(toStartOfQuarter($dateTimeCol))) * 1000';
      }
    }
    return '(intDiv($dateTimeCol, $interval) * $interval) * 1000';
  }

  static delta(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$delta', query);

    if (fromQuery.length < 1) {
      return query;
    }

    const deltaArguments = ast['$delta'];

    if (!deltaArguments || deltaArguments.length < 1) {
      throw {
        message:
          'Amount of arguments must be > 0 for $delta func. Parsed arguments are: ' + (deltaArguments || []).join(', '),
      };
    }

    const formattedArguments = deltaArguments.map((arg, i) => `max(${arg.trim()}) AS max_${i}`);
    const deltaColumns = formattedArguments.map((arg, i) => `runningDifference(${arg}) AS max_${i}_Delta`);

    fromQuery = SqlQueryHelper._applyTimeFilter(fromQuery);

    return (
      beforeMacrosQuery +
      `SELECT t, ${deltaColumns.join(', ')}
        FROM (
            SELECT $timeSeries AS t, ${formattedArguments.join(', ')} ${fromQuery}
            GROUP BY t
            ORDER BY t
        )`
    );
  }

  static _parseMacro(macro: string, query: string): string[] {
    const _fromIndex = (query: string, macro: string): number => {
      let fromRe = new RegExp('\\' + macro + '\\([\\w\\s\\S]+?\\)(\\s+FROM\\s+)', 'gim');
      let matches = fromRe.exec(query);
      if (matches === null || matches.length === 0) {
        throw { message: 'Could not find FROM-statement at: ' + query };
      }
      let fromRelativeIndex = matches[matches.length - 1].toLocaleLowerCase().indexOf('from');
      return fromRe.lastIndex - matches[matches.length - 1].length + fromRelativeIndex;
    };

    let mLen = macro.length;
    let mPos = query.indexOf(macro);
    if (mPos === -1 || query.slice(mPos, mPos + mLen + 1) !== macro + '(') {
      return [query, ''];
    }
    let fromIndex = _fromIndex(query, macro);
    return [query.slice(0, mPos), query.slice(fromIndex)];
  }

  static _applyTimeFilter(query: string): string {
    return query.toLowerCase().includes('where')
      ? query.replace(/where/gi, 'WHERE $timeFilter AND')
      : `${query} WHERE $timeFilter`;
  }

  static transformQuery(
    query: string,
    ast: any,
    macro: string,
    transformation: (args: string[], cols: string[]) => void
  ): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro(macro, query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast[macro];
    if (args.length < 1) {
      throw { message: `Amount of arguments must be > 0 for ${macro} func. Parsed arguments are:  ${args.join(', ')}` };
    }

    let cols: any[] = [];
    transformation(args, cols);

    fromQuery = SqlQueryHelper._applyTimeFilter(fromQuery);
    return (
      beforeMacrosQuery +
      'SELECT ' +
      't,' +
      ' ' +
      cols.join(', ') +
      ' FROM (' +
      ' SELECT $timeSeries AS t,' +
      ' ' +
      args.join(', ') +
      ' ' +
      fromQuery +
      ' GROUP BY t' +
      ' ORDER BY t' +
      ')'
    );
  }

  static increase(query: string, ast: any): string {
    return this.transformQuery(query, ast, '$increase', function (args, cols) {
      each(args, function (a, i) {
        cols.push(
          'if(runningDifference(max_' + i + ') < 0, 0, runningDifference(max_' + i + ')) AS max_' + i + '_Increase'
        );
      });
    });
  }

  static perSecond(query: string, ast: any): string {
    return this.transformQuery(query, ast, '$perSecond', function (args, cols) {
      each(args, function (a, i) {
        cols.push(
          'if(runningDifference(max_' +
            i +
            ') < 0, nan, ' +
            'runningDifference(max_' +
            i +
            ') / runningDifference(t/1000)) AS max_' +
            i +
            '_PerSecond'
        );
      });
    });
  }

  static rate(query: string, ast: any): string {
    return this.transformQuery(query, ast, '$rate', function (args, cols) {
      let aliases: any[] = [];
      each(args, function (arg) {
        if (arg.slice(-1) === ')') {
          throw { message: 'Argument "' + arg + '" cant be used without alias' };
        }
        aliases.push(arg.trim().split(' ').pop());
      });

      each(aliases, function (a) {
        cols.push(a + '/runningDifference(t/1000) ' + a + 'Rate');
      });
    });
  }

  static _columns(key: string, value: string, beforeMacrosQuery: string, fromQuery: string): string {
    if (key.slice(-1) === ')' || value.slice(-1) === ')') {
      throw { message: 'Some of passed arguments are without aliases: ' + key + ', ' + value };
    }

    let keyAlias = key.trim().split(' ').pop(),
      valueAlias = value.trim().split(' ').pop(),
      havingIndex = fromQuery.toLowerCase().indexOf('having'),
      having = '';

    if (havingIndex !== -1) {
      having = ' ' + fromQuery.slice(havingIndex, fromQuery.length);
      fromQuery = fromQuery.slice(0, havingIndex - 1);
    }
    fromQuery = SqlQueryHelper._applyTimeFilter(fromQuery);

    return (
      beforeMacrosQuery +
      'SELECT' +
      ' t,' +
      ' groupArray((' +
      keyAlias +
      ', ' +
      valueAlias +
      ')) AS groupArr' +
      ' FROM (' +
      ' SELECT $timeSeries AS t' +
      ', ' +
      key +
      ', ' +
      value +
      ' ' +
      fromQuery +
      ' GROUP BY t, ' +
      keyAlias +
      having +
      ' ORDER BY t, ' +
      keyAlias +
      ')' +
      ' GROUP BY t' +
      ' ORDER BY t'
    );
  }

  static columns(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$columns', query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast['$columns'];
    if (args.length !== 2) {
      throw {
        message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + ast.$columns.join(', '),
      };
    }
    return SqlQueryHelper._columns(args[0], args[1], beforeMacrosQuery, fromQuery);
  }

  static rateColumns(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$rateColumns', query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast['$rateColumns'];
    if (args.length !== 2) {
      throw {
        message: 'Amount of arguments must equal 2 for $rateColumns func. Parsed arguments are: ' + args.join(', '),
      };
    }

    query = SqlQueryHelper._columns(args[0], args[1], '', fromQuery);
    return (
      beforeMacrosQuery +
      'SELECT t' +
      ', arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
      ' FROM (' +
      query +
      ')'
    );
  }

  static convertInterval(interval: any, intervalFactor: number, ms?: boolean): number {
    if (!interval || typeof interval !== 'string' || interval === '') {
      return 0;
    }

    const match = interval.match(durationSplitRegexp);

    if (!match) {
      throw new Error('Received interval is invalid: ' + interval);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const unitsInSeconds: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      M: 2592000,
      y: 31536000,
      ms: 0.001,
    };

    if (!(unit in unitsInSeconds)) {
      throw new Error('Invalid unit in interval: ' + unit);
    }

    let result = value * unitsInSeconds[unit];

    if (ms) {
      result *= 1000;
    }

    return Math.ceil(result * intervalFactor);
  }

  static _detectAliasAndApplyTimeFilter(
    aliasIndex: number,
    key: string,
    alias: string,
    havingIndex: number,
    having: string,
    fromQuery: string
  ) {
    if (aliasIndex === -1) {
      key = key + ' AS ' + alias;
    } else {
      alias = key.slice(aliasIndex + 4, key.length);
    }

    if (havingIndex !== -1) {
      having = ' ' + fromQuery.slice(havingIndex, fromQuery.length);
      fromQuery = fromQuery.slice(0, havingIndex - 1);
    }
    fromQuery = SqlQueryHelper._applyTimeFilter(fromQuery);
    return [key, alias, having, fromQuery];
  }
  static perSecondColumns(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$perSecondColumns', query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast['$perSecondColumns'];
    if (args.length !== 2) {
      throw {
        message:
          'Amount of arguments must equal 2 for $perSecondColumns func. Parsed arguments are: ' + args.join(', '),
      };
    }

    let key = args[0],
      value = 'max(' + args[1].trim() + ') AS max_0',
      havingIndex = fromQuery.toLowerCase().indexOf('having'),
      having = '',
      aliasIndex = key.toLowerCase().indexOf(' as '),
      alias = 'perSecondColumns';
    [key, alias, having, fromQuery] = SqlQueryHelper._detectAliasAndApplyTimeFilter(
      aliasIndex,
      key,
      alias,
      havingIndex,
      having,
      fromQuery
    );

    return (
      beforeMacrosQuery +
      'SELECT' +
      ' t,' +
      ' groupArray((' +
      alias +
      ', max_0_PerSecond)) AS groupArr' +
      ' FROM (' +
      ' SELECT t,' +
      ' ' +
      alias +
      ', if(runningDifference(max_0) < 0 OR neighbor(' +
      alias +
      ',-1,' +
      alias +
      ') != ' +
      alias +
      ', nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_PerSecond' +
      ' FROM (' +
      ' SELECT $timeSeries AS t' +
      ', ' +
      key +
      ', ' +
      value +
      ' ' +
      fromQuery +
      ' GROUP BY t, ' +
      alias +
      having +
      ' ORDER BY ' +
      alias +
      ', t' +
      ')' +
      ')' +
      ' GROUP BY t' +
      ' ORDER BY t'
    );
  }

  static increaseColumns(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$increaseColumns', query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast['$increaseColumns'];
    if (args.length !== 2) {
      throw {
        message: 'Amount of arguments must equal 2 for $increaseColumns func. Parsed arguments are: ' + args.join(', '),
      };
    }

    let key = args[0],
      value = 'max(' + args[1].trim() + ') AS max_0',
      havingIndex = fromQuery.toLowerCase().indexOf('having'),
      having = '',
      aliasIndex = key.toLowerCase().indexOf(' as '),
      alias = 'increaseColumns';

    [key, alias, having, fromQuery] = SqlQueryHelper._detectAliasAndApplyTimeFilter(
      aliasIndex,
      key,
      alias,
      havingIndex,
      having,
      fromQuery
    );

    return (
      beforeMacrosQuery +
      'SELECT' +
      ' t,' +
      ' groupArray((' +
      alias +
      ', max_0_Increase)) AS groupArr' +
      ' FROM (' +
      ' SELECT t,' +
      ' ' +
      alias +
      ', if(runningDifference(max_0) < 0 OR neighbor(' +
      alias +
      ',-1,' +
      alias +
      ') != ' +
      alias +
      ', 0, runningDifference(max_0)) AS max_0_Increase' +
      ' FROM (' +
      ' SELECT $timeSeries AS t' +
      ', ' +
      key +
      ', ' +
      value +
      ' ' +
      fromQuery +
      ' GROUP BY t, ' +
      alias +
      having +
      ' ORDER BY ' +
      alias +
      ', t' +
      ')' +
      ')' +
      ' GROUP BY t' +
      ' ORDER BY t'
    );
  }

  static deltaColumns(query: string, ast: any): string {
    let [beforeMacrosQuery, fromQuery] = SqlQueryHelper._parseMacro('$deltaColumns', query);
    if (fromQuery.length < 1) {
      return query;
    }
    let args = ast['$deltaColumns'];
    if (args.length !== 2) {
      throw {
        message: 'Amount of arguments must equal 2 for $deltaColumns func. Parsed arguments are: ' + args.join(', '),
      };
    }

    let key = args[0],
      value = 'max(' + args[1].trim() + ') AS max_0',
      havingIndex = fromQuery.toLowerCase().indexOf('having'),
      having = '',
      aliasIndex = key.toLowerCase().indexOf(' as '),
      alias = 'deltaColumns';
    [key, alias, having, fromQuery] = SqlQueryHelper._detectAliasAndApplyTimeFilter(
      aliasIndex,
      key,
      alias,
      havingIndex,
      having,
      fromQuery
    );

    return (
      beforeMacrosQuery +
      'SELECT' +
      ' t,' +
      ' groupArray((' +
      alias +
      ', max_0_Delta)) AS groupArr' +
      ' FROM (' +
      ' SELECT t,' +
      ' ' +
      alias +
      ', if(neighbor(' +
      alias +
      ',-1,' +
      alias +
      ') != ' +
      alias +
      ', 0, runningDifference(max_0)) AS max_0_Delta' +
      ' FROM (' +
      ' SELECT $timeSeries AS t' +
      ', ' +
      key +
      ', ' +
      value +
      ' ' +
      fromQuery +
      ' GROUP BY t, ' +
      alias +
      having +
      ' ORDER BY ' +
      alias +
      ', t' +
      ')' +
      ')' +
      ' GROUP BY t' +
      ' ORDER BY t'
    );
  }
}
