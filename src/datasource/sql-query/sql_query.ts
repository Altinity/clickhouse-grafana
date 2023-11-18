import { isArray } from 'lodash';
import Scanner from './scanner';
import { TemplateSrv } from '@grafana/runtime';
import {SqlQueryHelper} from "./sql-query-helper";
import SqlQueryMacros from "./sql-query-macros";

export interface RawTimeRange {
  from: any | string;
  to: any | string;
}

export interface TimeRange {
  from: any;
  to: any;
  raw: RawTimeRange;
}

export default class SqlQuery {
  target: any;
  templateSrv: TemplateSrv;
  options: any;

  constructor(target: any, templateSrv: TemplateSrv, options: any) {
    this.target = target;
    this.templateSrv = templateSrv;
    this.options = options;
  }

  replace(options: any, adhocFilters: any) {
    // TODO: declare variables
    let query = this.templateSrv.replace(
        SqlQueryHelper.conditionalTest(this.target.query.trim(), this.templateSrv),
        options.scopedVars,
        SqlQueryHelper.interpolateQueryExpr
      ),
      scanner = new Scanner(query),
      dateTimeType = this.target.dateTimeType ? this.target.dateTimeType : 'DATETIME',
      i = this.templateSrv.replace(this.target.interval, options.scopedVars) || options.interval,
      interval = SqlQueryHelper.convertInterval(i, this.target.intervalFactor || 1),
      intervalMs = SqlQueryHelper.convertInterval(i, this.target.intervalFactor || 1, true),
      adhocCondition: any[] = [];

    // TODO: parse to AST and get ad hoc filters????
    try {
      let ast = scanner.toAST();
      let topQueryAST = ast;
      if (adhocFilters.length > 0) {
        /* Check sub queries for ad-hoc filters */
        while (ast.hasOwnProperty('from') && !isArray(ast.from)) {
          ast = ast.from;
        }
        if (!ast.hasOwnProperty('where')) {
          ast.where = [];
        }
        let target = this.target(ast.from[0], this.target);

        adhocFilters.forEach(function (af: any) {
          let parts;
          let partsKey = af.key;
          if (!partsKey.includes('.')) {
            parts = [target[0], target[1], partsKey];
          } else {
            parts = af.key.split('.');
          }
          /* Wildcard table, substitute current target table */
          if (parts.length === 1) {
            parts.unshift(target[1]);
          }
          /* Wildcard database, substitute current target database */
          if (parts.length === 2) {
            parts.unshift(target[0]);
          }
          /* Expect fully qualified column name at this point */
          if (parts.length < 3) {
            console.warn('adhoc filters: filter `' + af.key + '` has wrong format');
            return;
          }
          if (target[0] !== parts[0] || target[1] !== parts[1]) {
            return;
          }
          let operator = SqlQueryHelper.clickhouseOperator(af.operator);
          // tslint:disable-next-line:max-line-length
          let cond =
            parts[2] +
            ' ' +
            operator +
            ' ' +
            (typeof af.value === 'number' ||
            af.value.indexOf("'") > -1 ||
            af.value.indexOf(', ') > -1 ||
            af.value.match(/^\s*\d+\s*$/)
              ? af.value
              : "'" + af.value + "'");
          adhocCondition.push(cond);
          if (ast.where.length > 0) {
            // OR is not implemented
            // @see https://github.com/grafana/grafana/issues/10918
            cond = 'AND ' + cond;
          }
          // push condition only when $adhoc not exists
          if (query.indexOf('$adhoc') === -1) {
            ast.where.push(cond);
          }
        });
        query = scanner.Print(topQueryAST);
      }

      query = SqlQueryMacros.applyMacros(query, topQueryAST);
    } catch (err) {
      console.error('AST parser error: ', err);
    }

    /* Render the ad-hoc condition or evaluate to an always true condition */
    let renderedAdHocCondition = '1';
    if (adhocCondition.length > 0) {
      renderedAdHocCondition = '(' + adhocCondition.join(' AND ') + ')';
    }
    if (this.target.skip_comments) {
      query = scanner.removeComments(query);
    }
    query = SqlQueryHelper.unescape(query);
    let timeFilter = SqlQueryMacros.getDateTimeFilter(dateTimeType);
    let timeFilterMs = SqlQueryMacros.getDateTimeFilterMs(dateTimeType);
    if (typeof this.target.dateColDataType === 'string' && this.target.dateColDataType.length > 0) {
      timeFilter = SqlQueryMacros.getDateFilter() + ' AND ' + timeFilter;
      timeFilterMs = SqlQueryMacros.getDateFilter() + ' AND ' + timeFilterMs;
    }

    let table = SqlQueryHelper.escapeTableIdentifier(this.target.table);
    if (this.target.database) {
      table = SqlQueryHelper.escapeTableIdentifier(this.target.database) + '.' + table;
    }

    let myround = this.target.round === '$step' ? interval : SqlQuery.convertInterval(this.target.round, 1),
      from = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(this.options.range.from, myround)),
      to = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(this.options.range.to, myround));

    // TODO: replace
    this.target.rawQuery = query
      .replace(/\$timeSeries\b/g, SqlQueryMacros.getTimeSeries(dateTimeType))
      .replace(/\$timeSeriesMs\b/g, SqlQueryMacros.getTimeSeriesMs(dateTimeType))
      .replace(/\$naturalTimeSeries/g, SqlQueryMacros.getNaturalTimeSeries(dateTimeType, from, to))
      .replace(/\$timeFilter\b/g, timeFilter)
      .replace(/\$timeFilterMs\b/g, timeFilterMs)
      .replace(/\$table\b/g, table)
      .replace(/\$from\b/g, from.toString())
      .replace(/\$to\b/g, to.toString())
      .replace(/\$dateCol\b/g, SqlQueryHelper.escapeIdentifier(this.target.dateColDataType))
      .replace(/\$dateTimeCol\b/g, SqlQueryHelper.escapeIdentifier(this.target.dateTimeColDataType))
      .replace(/\$interval\b/g, interval.toString())
      .replace(/\$__interval_ms\b/g, intervalMs.toString())
      .replace(/\$adhoc\b/g, renderedAdHocCondition);

    const round = this.target.round === '$step' ? interval : SqlQueryHelper.convertInterval(this.target.round, 1);
    this.target.rawQuery = SqlQuery.replaceTimeFilters(this.target.rawQuery, this.options.range, dateTimeType, round);

    return this.target.rawQuery;
  }

  static replaceTimeFilters(query: string, range: TimeRange, dateTimeType = 'DATETIME', round?: number): string {
    let from = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(range.from, round || 0));
    let to = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(range.to, round || 0));

    // Extend date range to be sure that first and last points
    // data is not affected by round
    if (round && round > 0) {
      to += round * 2 - 1;
      from -= round * 2 - 1;
    }

    return query
      .replace(
        /\$timeFilterByColumn\(([\w_]+)\)/g,
        (match: string, columnName: string) => `${SqlQueryHelper.getFilterSqlForDateTime(columnName, dateTimeType)}`
      )
      .replace(
        /\$timeFilter64ByColumn\(([\w_]+)\)/g,
        (match: string, columnName: string) => `${SqlQueryHelper.getFilterSqlForDateTime(columnName, 'DATETIME64')}`
      )
      .replace(/\$from/g, from.toString())
      .replace(/\$to/g, to.toString())
      .replace(/\$__from/g, range.from.valueOf())
      .replace(/\$__to/g, range.to.valueOf());
  }
}
