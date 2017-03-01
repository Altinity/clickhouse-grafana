///<reference path="../../../headers/common.d.ts" />

import _ from 'lodash';
import queryPart from './query_part';
import * as dateMath from 'app/core/utils/datemath';

export default class SqlQuery {
  target: any;
  selectModels: any[];
  queryBuilder: any;
  templateSrv: any;
  options: any;

  /** @ngInject */
  constructor(target, templateSrv?, options?) {
    this.target = target;
    this.templateSrv = templateSrv;
    this.options = options;

    target.resultFormat = 'time_series';
    target.tags = target.tags || [];
    target.targetLists = target.targetLists || [[
      {type: 'field', params: ['*']},
      {type: 'count', params: []},
    ]];
    this.updateProjection();
  }

  updateProjection() {
    this.selectModels = _.map(this.target.targetLists, function(parts: any) {
      return _.map(parts, queryPart.create);
    });
  }

  updatePersistedParts() {
    this.target.targetLists = _.map(this.selectModels, function(selectParts) {
      return _.map(selectParts, function(part: any) {
        return {type: part.def.type, params: part.params};
      });
    });
  }

  removeSelect(index: number) {
    this.target.targetLists.splice(index, 1);
    this.updateProjection();
  }

  removeSelectPart(selectParts, part) {
    // if we remove the field remove the whole statement
    if (part.def.type === 'field') {
      if (this.selectModels.length > 1) {
        var modelsIndex = _.indexOf(this.selectModels, selectParts);
        this.selectModels.splice(modelsIndex, 1);
      }
    } else {
      var partIndex = _.indexOf(selectParts, part);
      selectParts.splice(partIndex, 1);
    }

    this.updatePersistedParts();
  }

  addSelectPart(selectParts, type) {
    var partModel = queryPart.create({type: type});
    partModel.def.addStrategy(selectParts, partModel, this);
    this.updatePersistedParts();
  }

  private static renderTagCondition(tag, index) {
    var str = "";
    var operator = tag.operator;
    var value = tag.value;
    if (index > 0) {
      str = (tag.condition || 'AND') + ' ';
    }

    if (!operator) {
      if (/^\/.*\/$/.test(value)) {
        operator = '=~';
      } else {
        operator = '=';
      }
    }

    return str + tag.key + ' ' + operator + ' ' + value;
  }

  getTableAndDatabase() {
    var database = this.target.database;
    var table = this.target.table || 'table';

    if (database !== 'default') {
      database = this.target.database + '.';
    } else {
      database = "";
    }

    return database + table;
  }

 render(rebuild: boolean) {
    var target = this.target;
    if (target.rawQuery && !rebuild) {
        return target.query;
    }

    var query = 'SELECT $timeSeries as t, ',
        i, j,
        targetList = '';
    for (i = 0; i < this.selectModels.length; i++) {
      let parts = this.selectModels[i];
      var selectText = "";
      for (j = 0; j < parts.length; j++) {
        let part = parts[j];
        selectText = part.render(selectText);
      }
      if (i > 0) {
        targetList += ', ';
      }
      targetList += selectText;
    }

    query += targetList;
    query += ' FROM ' + this.getTableAndDatabase() + ' WHERE ';
    var conditions = _.map(target.tags, (tag, index) => {
      return SqlQuery.renderTagCondition(tag, index);
    });
    query += conditions.join(' ');
    query += (conditions.length > 0 ? ' AND ' : '') + '$timeFilter';
    query += ' GROUP BY t ORDER BY t';
    return query.trim();
  }

    replace(options?) {
        var query = this.render(false),
            // hack to query additional left data-point
            from = SqlQuery.convertTimestamp(
                this.options.range.from
                    .subtract(this.options.intervalMs>60000 ? this.options.intervalMs : 60000, 'ms')
            ),
            to = SqlQuery.convertTimestamp(this.options.range.to),
            timeFilter = SqlQuery.getTimeFilter((this.options.rangeRaw.to === 'now')),
            interval = SqlQuery.convertInterval(this.options.intervalMs);

        query = SqlQuery.columns(query);
        query = SqlQuery.rateColumns(query);
        query = SqlQuery.rate(query);
        query = this.templateSrv.replace(query, options.scopedVars, SqlQuery.interpolateQueryExpr);
        this.target.compiledQuery = query
                    .replace(/\$timeSeries/g, '(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000')
                    .replace(/\$timeFilter/g, timeFilter)
                    .replace(/\$from/g, from)
                    .replace(/\$to/g, to)
                    .replace(/\$timeCol/g, this.target.dateColDataType)
                    .replace(/\$dateTimeCol/g, this.target.dateTimeColDataType)
                    .replace(/\$interval/g, interval);
        return this.target.compiledQuery;
    }

    // $columns(query)
    static columns(query: string): string {
        if (query.slice(0, 9) === '$columns(') {
            var fromIndex = SqlQuery._fromIndex(query);
            var args = query.slice(9,fromIndex)
                .trim() // rm spaces
                .slice(0, -1) // cut ending brace
                .split(','); // extract arguments

            if (args.length !== 2) {
                throw {message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + args.join(', ')};
            }

            query = SqlQuery._columns(args[0], args[1], query.slice(fromIndex));
        }

        return query;
    }

    static _columns(key: string, value: string, fromQuery: string): string {
        if (key.slice(-1) === ')' || value.slice(-1) === ')') {
            throw {message: 'Some of passed arguments are without aliases: ' + key + ', ' + value};
        }

        var keyAlias = key.trim().split(' ').pop(),
            valueAlias = value.trim().split(' ').pop();
        fromQuery = SqlQuery._applyTimeFilter(fromQuery);
        return 'SELECT ' + '' +
            't' +
            ', groupArray((' + keyAlias + ', ' + valueAlias + ')) as groupArr' +
            ' FROM (' +
                ' SELECT $timeSeries as t' +
                ', ' + key +
                ', ' + value + ' ' +
                fromQuery +
                ' GROUP BY t, ' + keyAlias +
                ' ORDER BY t, ' + keyAlias +
                ') ' +
            'GROUP BY t ' +
            'ORDER BY t ';
    }


    // $rateColumns(query)
    static rateColumns(query: string): string {
        if (query.slice(0, 13) === '$rateColumns(') {
            var fromIndex = SqlQuery._fromIndex(query);
            var args = query.slice(13,fromIndex)
                .trim() // rm spaces
                .slice(0, -1) // cut ending brace
                .split(','); // extract arguments

            if (args.length !== 2) {
                throw {message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + args.join(', ')};
            }

            query = SqlQuery._columns(args[0], args[1], query.slice(fromIndex));
            query = 'SELECT t' +
                    ', arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
                    ' FROM (' +
                    query +
                    ')';
        }

        return query;
    }

    // $rate(query)
    static rate(query: string): string {
        if (query.slice(0, 6) === '$rate(') {
            var fromIndex = SqlQuery._fromIndex(query);
            var args = query.slice(6,fromIndex)
                .trim() // rm spaces
                .slice(0, -1) // cut ending brace
                .split(','); // extract arguments

            if (args.length < 1) {
                throw {message: 'Amount of arguments must be > 0 for $rate func. Parsed arguments are: ' + args.join(', ')};
            }

            query = SqlQuery._rate(args, query.slice(fromIndex));
        }

        return query;
    }

    static _fromIndex(query: string): number {
        var fromIndex = query.toLowerCase().indexOf('from');
        if (fromIndex === -1) {
            throw {message: 'Could not find FROM-statement at: ' + query};
        }
        return fromIndex;
    }

    static _rate(args, fromQuery: string): string {
        var aliases = [];
        _.each(args, function(arg){
            if (arg.slice(-1) === ')') {
                throw {message: 'Argument "' + arg + '" cant be used without alias'};
            }
            aliases.push(arg.trim().split(' ').pop());
        });

        var rateColums = [];
        _.each(aliases, function(a){
           rateColums.push(a + '/runningDifference(t/1000) ' + a + 'Rate');
        });

        fromQuery = SqlQuery._applyTimeFilter(fromQuery);
        return 'SELECT ' + '' +
            't' +
            ', ' + rateColums.join(',') +
            ' FROM (' +
            ' SELECT $timeSeries as t' +
            ', ' + args.join(',') +
            ' ' + fromQuery +
            ' GROUP BY t' +
            ' ORDER BY t' +
            ')';
    }

    static _applyTimeFilter(query: string): string {
        if ( query.toLowerCase().indexOf('where') !== -1 ) {
            query = query.replace(/where/i, 'WHERE $timeFilter AND ');
        } else {
            query += ' WHERE $timeFilter';
        }

        return query;
    }

    static getTimeFilter(isToNow): string {
        if (isToNow) {
            return '$timeCol >= toDate($from) AND $dateTimeCol >= toDateTime($from)';

        } else {
            return '$timeCol BETWEEN toDate($from) AND toDate($to) AND $dateTimeCol BETWEEN toDateTime($from) AND toDateTime($to)';
        }
    }

    // date is a moment object
    static convertTimestamp(date) {
        //return date.format("'Y-MM-DD HH:mm:ss'")
        if (_.isString(date)) {
            date = dateMath.parse(date, true);
        }
        return Math.ceil(date.valueOf() / 1000);
    }


    static convertInterval(interval: number) {
        if (interval < 1000) {
            return 1;
        }
        return Math.ceil(interval / 1000);
    }

    public static REGEX_COLUMNS = /(?:\s*(?=\w+\.|.*as\s+|distinct\s+|)(\*|\w+|(?:,|\s+)|\w+\([a-z*]+\))(?=\s*(?=,|$)))/ig;

    static interpolateQueryExpr (value, variable, defaultFormatFn) {
        // if no multi or include all do not regexEscape
        if (!variable.multi && !variable.includeAll) {
            return value;
        }

        if (typeof value === 'string') {
            return SqlQuery.clickhouseEscape(value);
        }

        var escapedValues = _.map(value, SqlQuery.clickhouseEscape);
        return escapedValues.join(',');
    }

    static clickhouseEscape(value) {
        if (value.match(/^\d+$/) || value.match(/^\d+\.\d+$/)){
            return value;
        }else{
            return "'" + value.replace(/[\\']/g, '\\$&') + "'";
        }
    }
}
