import { each, isString, map } from 'lodash';
import { dateMath, TypedVariableModel } from '@grafana/data';
import dayjs from 'dayjs';
import { TemplateSrv } from '@grafana/runtime';
import { TimestampFormat } from '../../types/types';

export class SqlQueryHelper {
  static convertTimestamp(date: any) {
    if (isString(date)) {
      date = dateMath.parse(date, true);
    }

    return Math.floor(date.valueOf() / 1000);
  }

  static round(date: any, round: number): any {
    if (round === 0) {
      return date;
    }

    if (isString(date)) {
      date = dateMath.parse(date, true);
    }

    let coefficient = 1000 * round;
    let rounded = Math.floor(date.valueOf() / coefficient) * coefficient;
    return dayjs(rounded);
  }

  static conditionalTest(query: string, templateSrv: TemplateSrv) {
    const betweenBraces = (query: string): boolean | any => {
      let r = {
        result: '',
        error: '',
      };
      let openBraces = 1;
      for (let i = 0; i < query.length; i++) {
        if (query.charAt(i) === '(') {
          openBraces++;
        }
        if (query.charAt(i) === ')') {
          openBraces--;
          if (openBraces === 0) {
            r.result = query.substring(0, i);
            break;
          }
        }
      }
      if (openBraces > 1) {
        r.error = 'missing parentheses';
      }
      return r;
    }

    let macros = '$conditionalTest(';
    let openMacros = query.indexOf(macros);
    while (openMacros !== -1) {
      let r = betweenBraces(query.substring(openMacros + macros.length, query.length));
      if (r.error.length > 0) {
        throw { message: '$conditionalIn macros error: ' + r.error };
      }
      let arg = r.result;
      // first parameters is an expression and require some complex parsing,
      // so parse from the end where you know that the last parameters is a comma with a variable
      let param1 = arg.substring(0, arg.lastIndexOf(',')).trim();
      let param2 = arg.substring(arg.lastIndexOf(',') + 1).trim();
      // remove the $ from the variable
      let varInParam = param2.substring(1);
      let done = 0;
      //now find in the list of variable what is the value
      let variables = templateSrv.getVariables();
      for (let i = 0; i < variables.length; i++) {
        let varG: TypedVariableModel = variables[i];
        if (varG.name === varInParam) {
          let closeMacros = openMacros + macros.length + r.result.length + 1;
          done = 1;

          const value: any = 'current' in varG ? varG.current.value : '';

          if (
            // for query variable when all is selected
            // may be add another test on the all activation may be wise.
            (varG.type === 'query' &&
              ((value.length === 1 && value[0] === '$__all') || (typeof value === 'string' && value === '$__all'))) ||
            // for multi-value drop-down when no one value is select, fix https://github.com/Altinity/clickhouse-grafana/issues/485
            (typeof value === 'object' && value.length === 0) ||
            // for textbox variable when nothing is entered
            (['textbox', 'custom'].includes(varG.type) && ['', undefined, null].includes(value))
          ) {
            query = query.substring(0, openMacros) + ' ' + query.substring(closeMacros, query.length);
          } else {
            // replace of the macro with standard test.
            query = query.substring(0, openMacros) + ' ' + param1 + ' ' + query.substring(closeMacros, query.length);
          }
          break;
        }
      }
      if (done === 0) {
        throw { message: '$conditionalTest macros error cannot find referenced variable: ' + param2 };
      }
      openMacros = query.indexOf(macros);
    }
    return query;
  }

  static clickhouseOperator(value: string): string {
    switch (value) {
      case '=':
      case '!=':
      case '>':
      case '<':
        return value;
      case '=~':
        return 'LIKE';
      case '!~':
        return 'NOT LIKE';
      default:
        console.warn('adhoc filters: got unsupported operator `' + value + '`');
        return value;
    }
  }

  static clickhouseEscape(value: any, variable: any): any {
    const NumberOnlyRegexp = /^[+-]?\d+(\.\d+)?$/;

    let returnAsIs = true;
    let returnAsArray = false;
    // if at least one of options is not digit or is array
    each(variable.options, function (opt): boolean {
      if (typeof opt.value === 'string' && opt.value === '$__all') {
        return true;
      }
      if (typeof opt.value === 'number') {
        returnAsIs = true;
        return false;
      }
      if (typeof opt.value === 'string' && !NumberOnlyRegexp.test(opt.value)) {
        returnAsIs = false;
        return false;
      }
      if (opt.value instanceof Array) {
        returnAsArray = true;
        each(opt.value, function (v): boolean {
          if (typeof v === 'string' && !NumberOnlyRegexp.test(v)) {
            returnAsIs = false;
            return false;
          }
          return true;
        });
        return false;
      }
      return true;
    });

    if (value instanceof Array && returnAsArray) {
      let arrayValues = map(value, function (v) {
        return SqlQueryHelper.clickhouseEscape(v, variable);
      });
      return '[' + arrayValues.join(', ') + ']';
    } else if (typeof value === 'number' || (returnAsIs && typeof value === 'string' && NumberOnlyRegexp.test(value))) {
      return value;
    } else {
      return "'" + value.replace(/[\\']/g, '\\$&') + "'";
    }
  }

  static target(from: string, target: any): [string, string] {
    if (from.length === 0) {
      return ['', ''];
    }
    let targetTable, targetDatabase;
    let parts = from.split('.');
    switch (parts.length) {
      case 1:
        targetTable = parts[0];
        targetDatabase = target.database;
        break;
      case 2:
        targetDatabase = parts[0];
        targetTable = parts[1];
        break;
      default:
        throw { message: 'FROM expression "' + from + '" cant be parsed' };
    }

    if (targetTable === '$table') {
      targetTable = target.table;
    }
    return [targetDatabase, targetTable];
  }

  static getFilterSqlForDateTime(columnName: string, dateTimeType: string) {
    const getConvertFn = (dateTimeType: string) => {
      return function (t: string): string {
        if (dateTimeType === TimestampFormat.DateTime) {
          return "toDateTime(" + t + ")"
        }
        if (dateTimeType === TimestampFormat.DateTime64) {
          return "toDateTime64(" + t + ",3)"
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_3) {
          return "1000*" + t
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_6) {
          return "1000000*" + t
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_9) {
          return "1000000000*" + t
        }
        return t
      };
    };

    const convertFn = getConvertFn(dateTimeType);
    let from = '$from';
    let to = '$to';
    if (dateTimeType === TimestampFormat.DateTime64) {
      from = '$__from/1000';
      to = '$__to/1000';
    }
    return `${columnName} >= ${convertFn(from)} AND ${columnName} <= ${convertFn(to)}`;
  }

  static getFilterSqlForDateTimeMs(columnName: string, dateTimeType: string) {
    const getConvertFn = (dateTimeType: string) => {
      return function (t: string): string {
        if (dateTimeType === TimestampFormat.DateTime) {
          return "toDateTime(" + t + ")"
        }

        if (dateTimeType === TimestampFormat.DateTime64) {
          return "toDateTime64(" + t + ",3)"
        }
        if (dateTimeType === TimestampFormat.Float) {
          return t + "/1000"
        }
        if (dateTimeType === TimestampFormat.TimeStamp) {
          return t + "/1000"
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_3) {
          return t
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_6) {
          return "1000*" + t
        }
        if (dateTimeType === TimestampFormat.TimeStamp64_9) {
          return "1000000*" + t
        }
        return t;
      };
    };

    const convertFn = getConvertFn(dateTimeType);
    let from = "$__from";
    let to = "$__to";
    if (dateTimeType === TimestampFormat.DateTime || dateTimeType === TimestampFormat.DateTime64) {
      from = '$__from/1000';
      to = '$__to/1000';
    }
    return `${columnName} >= ${convertFn(from)} AND ${columnName} <= ${convertFn(to)}`;
  }
}
