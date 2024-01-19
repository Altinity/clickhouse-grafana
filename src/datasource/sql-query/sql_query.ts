import { isArray } from 'lodash';
import Scanner from '../scanner';
import { TemplateSrv } from '@grafana/runtime';
import { SqlQueryHelper } from './sql-query-helper';
import SqlQueryMacros from './sql-query-macros';

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
    if (!this.target.query) {
      return ''
    }

    // TODO: declare variables
    let query = this.templateSrv.replace(
      SqlQueryHelper.conditionalTest(this.target.query.trim(), this.templateSrv),
      options.scopedVars,
      SqlQueryHelper.interpolateQueryExpr
    );
    let scanner = new Scanner(query);
    let dateTimeType = this.target.dateTimeType ? this.target.dateTimeType : 'DATETIME';
    let i = this.templateSrv.replace(this.target.interval, options.scopedVars) || options.interval;
    let interval = SqlQueryHelper.convertInterval(i, this.target.intervalFactor || 1);
    let intervalMs = SqlQueryHelper.convertInterval(i, this.target.intervalFactor || 1, true);
    let adhocCondition: any[] = [];

    // @ts-ignore
    // adhocFilters = this.templateSrv.getAdhocFilters('clickhouse')
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

        let target = SqlQueryHelper.target(ast.from[0], this.target);

        adhocFilters.forEach((af: any) => {
          let parts = af.key.includes('.') ? af.key.split('.') : [target[0], target[1], af.key];

          if (parts.length === 1) {
            parts = [target[1], ...parts];
          }
          if (parts.length === 2) {
            parts = [target[0], ...parts];
          }

          if (parts.length < 3) {
            console.warn(`adhoc filters: filter '${af.key}' has the wrong format`);
            return;
          }

          if (target[0] !== parts[0] || target[1] !== parts[1]) {
            return;
          }

          const operator = SqlQueryHelper.clickhouseOperator(af.operator);
          let cond = `${parts[2]} ${operator} ${
            typeof af.value === 'number' ||
            af.value.includes("'") ||
            af.value.includes(', ') ||
            af.value.match(/^\s*\d+\s*$/)
              ? af.value
              : "'" + af.value + "'"
          }`;
          adhocCondition.push(cond);

          if (ast.where.length > 0) {
            cond = 'AND ' + cond;
          }

          if (!query.includes('$adhoc')) {
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
    let renderedAdHocCondition = adhocCondition.length > 0 ? '(' + adhocCondition.join(' AND ') + ')' : '1';

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

    let myround = this.target.round === '$step' ? interval : SqlQueryHelper.convertInterval(this.target.round, 1);
    let from = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(this.options.range.from, myround));
    let to = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(this.options.range.to, myround));

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
    this.target.rawQuery = SqlQueryMacros.replaceTimeFilters(
      this.target.rawQuery,
      this.options.range,
      dateTimeType,
      round
    );
    return this.target.rawQuery;
  }
}
