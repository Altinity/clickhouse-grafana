import _, { curry, each } from 'lodash';
import SqlSeries from './frontend-only/sql-series/sql_series';
import ResponseParser from './frontend-only/response_parser';
import AdHocFilter from './frontend-only/adhoc';
import Scanner from './scanner/scanner';

import {
  AnnotationEvent,
  DataQueryRequest,
  DataSourceInstanceSettings,
  DataSourceWithLogsContextSupport,
  DataSourceWithToggleableQueryFiltersSupport,
  LogRowContextOptions,
  LogRowContextQueryDirection,
  LogRowModel,
  QueryFilterOptions,
  TypedVariableModel,
} from '@grafana/data';
import {BackendSrv, DataSourceWithBackend, getBackendSrv, getTemplateSrv, TemplateSrv} from '@grafana/runtime';

import {CHDataSourceOptions, CHQuery, DEFAULT_QUERY, TimestampFormat} from '../types/types';
import { SqlQueryHelper } from './sql-query/sql-query-helper';
import { QueryEditor } from '../views/QueryEditor/QueryEditor';
import { getAdhocFilters } from '../views/QueryEditor/helpers/getAdHocFilters';

export interface RawTimeRange {
  from: any | string;
  to: any | string;
}

export interface TimeRange {
  from: any;
  to: any;
  raw: RawTimeRange;
}

const adhocFilterVariable = 'adhoc_query_filter';
export class CHDataSource
  extends DataSourceWithBackend<CHQuery, CHDataSourceOptions>
  implements DataSourceWithLogsContextSupport<CHQuery>, DataSourceWithToggleableQueryFiltersSupport<CHQuery>
{
  backendSrv: BackendSrv;
  templateSrv: TemplateSrv;
  adHocFilter: AdHocFilter;
  responseParser: ResponseParser;
  options: any;

  url: string;
  basicAuth: any;
  withCredentials: any;
  usePOST: boolean;
  defaultDatabase: string;
  addCorsHeader: boolean;
  xHeaderUser: string;
  defaultValues: any;
  useYandexCloudAuthorization: boolean;
  useCompression: boolean;
  compressionType: string;
  adHocValuesQuery: string;
  uid: string;

  constructor(instanceSettings: DataSourceInstanceSettings<CHDataSourceOptions>) {
    super(instanceSettings);
    this.uid = instanceSettings.uid;
    this.url = instanceSettings.url!;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.addCorsHeader = instanceSettings.jsonData.addCorsHeader || false;
    this.usePOST = instanceSettings.jsonData.usePOST || false;
    this.useCompression = instanceSettings.jsonData.useCompression || false;
    this.adHocValuesQuery = instanceSettings.jsonData.adHocValuesQuery || '';
    this.compressionType = instanceSettings.jsonData.compressionType || '';
    this.defaultDatabase = instanceSettings.jsonData.defaultDatabase || '';
    this.xHeaderUser = instanceSettings.jsonData.xHeaderUser || '';
    this.useYandexCloudAuthorization = instanceSettings.jsonData.useYandexCloudAuthorization || false;
    if (instanceSettings.jsonData.useDefaultConfiguration) {
      this.defaultValues = {
        dateTime: {
          defaultDateTime64: instanceSettings.jsonData.defaultDateTime64,
          defaultDateTime: instanceSettings.jsonData.defaultDateTime,
          defaultUint32: instanceSettings.jsonData.defaultUint32,
          defaultDateDate32: instanceSettings.jsonData.defaultDateDate32,
          defaultFloat: instanceSettings.jsonData.defaultFloat,
          defaultTimeStamp64_3: instanceSettings.jsonData.defaultTimeStamp64_3,
          defaultTimeStamp64_6: instanceSettings.jsonData.defaultTimeStamp64_6,
          defaultTimeStamp64_9: instanceSettings.jsonData.defaultTimeStamp64_9,
        },
        defaultDateTimeType: instanceSettings.jsonData.defaultDateTimeType,
        contextWindowSize: instanceSettings.jsonData.contextWindowSize,
      };
    }

    this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    this.adHocFilter = new AdHocFilter(this);
    this.responseParser = new ResponseParser();
    this.annotations = {
      QueryEditor: QueryEditor,
    };
  }

  static _getRequestOptions(query: string, usePOST?: boolean, requestId?: string, options?: any) {
    let requestOptions: any = {
      url: options.url,
      requestId: requestId,
    };
    let params: string[] = [];

    if (usePOST) {
      requestOptions.method = 'POST';
      requestOptions.data = query;
    } else {
      requestOptions.method = 'GET';
      params.push('query=' + encodeURIComponent(query));
    }

    if (options.defaultDatabase) {
      params.push('database=' + options.defaultDatabase);
    }

    if (options.basicAuth || options.withCredentials) {
      requestOptions.withCredentials = true;
    }

    requestOptions.headers = options.headers || {};
    if (options.basicAuth) {
      requestOptions.headers.Authorization = options.basicAuth;
    }

    if (options.useCompression) {
      requestOptions.headers['Accept-Encoding'] = options.compressionType;
      params.push('enable_http_compression=1');
    }

    if (options.useYandexCloudAuthorization) {
      requestOptions.headers['X-ClickHouse-User'] = options.xHeaderUser;
      // look to routes in plugin.json
      if (requestOptions.url.indexOf('/?') === -1) {
        requestOptions.url += '/xHeaderKey';
      } else {
        requestOptions.url.replace('/?', '/xHeaderKey/?');
      }
    }

    if (options.addCorsHeader) {
      params.push('add_http_cors_header=1');
    }

    if (params.length) {
      requestOptions.url += (requestOptions.url.indexOf('?') !== -1 ? '&' : '/?') + params.join('&');
    }

    return requestOptions;
  }

  _request(query: string, requestId?: string) {
    const queryParams = CHDataSource._getRequestOptions(query, this.usePOST, requestId, this);

    const dataRequest = new Promise((resolve, reject) => {
      this.backendSrv.fetch(queryParams).subscribe(
        (response) => {
          if (response && response?.data) {
            resolve(response.data);
          } else {
            resolve(null);
          }
        },
        (e) => {
          reject(e);
        }
      );
    });

    return dataRequest;
  }

  async getLogRowContext(
    row: LogRowModel,
    options?: LogRowContextOptions | undefined,
    query?: CHQuery | undefined
  ): Promise<{ data: any[] }> {
    let traceId;
    const requestOptions = { ...options, range: this.options.range };

    const originalQuery = await this.createQuery(requestOptions, query);
    let select = await this.backendMigrationGetPropertiesFromAST(originalQuery.stmt.replace(/\r\n|\r|\n/g, ' '), 'select');

    const generateQueryForTraceID = (traceId, select) => {
      return `SELECT ${select.join(',')} FROM $table WHERE $timeFilter AND trace_id=${traceId}`;
    };

    const generateQueryForTimestampBackward = (inputTimestampColumn, inputTimestampValue, contextWindowSize) => {
      return `SELECT timestamp FROM (
          SELECT
            ${inputTimestampColumn},
            FIRST_VALUE(${inputTimestampColumn}) OVER (ORDER BY ${inputTimestampColumn} ROWS BETWEEN ${
        contextWindowSize || 10
      } PRECEDING AND CURRENT ROW) AS timestamp
          FROM $table
          ORDER BY ${inputTimestampColumn}
        ) WHERE ${inputTimestampColumn} = ${inputTimestampValue}`;
    };

    const generateQueryForTimestampForward = (inputTimestampColumn, inputTimestampValue, contextWindowSize) => {
      return `SELECT timestamp FROM (
          SELECT
            ${inputTimestampColumn},
            LAST_VALUE(${inputTimestampColumn}) OVER (ORDER BY ${inputTimestampColumn} ROWS BETWEEN CURRENT ROW AND ${
        contextWindowSize || 10
      } FOLLOWING) AS timestamp
          FROM $table
          ORDER BY ${inputTimestampColumn}
        ) WHERE ${inputTimestampColumn} = ${inputTimestampValue}`;
    };

    const generateRequestForTimestampForward = (timestampField, timestamp, currentRowTimestamp, select) => {
      return `SELECT ${select.join(
        ','
      )} FROM $table WHERE ${timestampField} <'${timestamp}' AND ${timestampField} > '${currentRowTimestamp}'`;
    };

    const generateRequestForTimestampBackward = (timestampField, timestamp, currentRowTimestamp, select) => {
      return `SELECT ${select.join(
        ','
      )} FROM $table WHERE ${timestampField} > '${timestamp}' AND ${timestampField} < '${currentRowTimestamp}'`;
    };

    if (traceId) {
      const queryForTraceID = generateQueryForTraceID(traceId, select);
      const { stmt, requestId } = await this.createQuery(requestOptions, { ...query, query: queryForTraceID });

      const response: any = await this._seriesQuery(stmt, requestId + options?.direction);

      if (response && !response.rows) {
        return { data: [] };
      } else if (!response) {
        throw new Error('No response for traceId log context query');
      }

      let sqlSeries = new SqlSeries({
        refId: 'FORWARD',
        series: response.data,
        meta: response.meta,
      });

      return { data: sqlSeries.toLogs() };
    } else {
      const timestampColumn = query?.dateTimeColDataType;

      const getLogsTimeBoundaries = async () => {
        let formattedDate = String(row.timeEpochMs);
        if (formattedDate.length > 10) {
          formattedDate = `toDateTime64(${row.timeEpochMs}/1000,3)`;
        } else {
          formattedDate = `'${row.timeUtc}'`;
        }

        const boundariesRequest =
          options?.direction === LogRowContextQueryDirection.Backward
            ? generateQueryForTimestampBackward(timestampColumn, formattedDate, query?.contextWindowSize)
            : generateQueryForTimestampForward(timestampColumn, formattedDate, query?.contextWindowSize);

        const { stmt, requestId } = await this.createQuery(requestOptions, { ...query, query: boundariesRequest });

        const result: any = await this._seriesQuery(stmt, requestId + options?.direction);

        return result.data[0];
      };

      const { timestamp } = await getLogsTimeBoundaries();
      const getLogContext = async () => {
        const contextDataRequest =
          options?.direction === LogRowContextQueryDirection.Backward
            ? generateRequestForTimestampBackward(timestampColumn, timestamp, row.timeUtc, select)
            : generateRequestForTimestampForward(timestampColumn, timestamp, row.timeUtc, select);

        const { stmt, requestId } = await this.createQuery(requestOptions, { ...query, query: contextDataRequest });

        return this._seriesQuery(stmt, requestId + options?.direction);
      };

      const response: any = await getLogContext();

      if (response && !response.rows) {
        return { data: [] };
      } else if (!response) {
        throw new Error('No response for log context query');
      }

      let sqlSeries = new SqlSeries({
        refId: options?.direction,
        series: response.data,
        meta: response.meta,
      });

      return { data: sqlSeries.toLogs() };
    }
  }

  toggleQueryFilter(query: CHQuery, filter: any): any {
    let filters = [...query.adHocFilters];
    let isFilterAdded = query.adHocFilters.filter(
      (f) => f.key === filter.options.key && f.value === filter.options.value
    ).length;
    if (filter.type === 'FILTER_FOR') {
      if (isFilterAdded) {
        filters = filters.filter(
          (f) =>
            f.key !== filter.options.key && f.value !== filter.options.value && f.operator !== filter.options.operator
        );
      } else {
        filters.push({
          value: filter.options.value,
          key: filter.options.key,
          operator: '=',
        });
      }
    } else if (filter.type === 'FILTER_OUT') {
      if (isFilterAdded) {
        filters = filters.filter(
          (f) =>
            f.key !== filter.options.key && f.value !== filter.options.value && f.operator !== filter.options.operator
        );
      } else {
        filters.push({
          value: filter.options.value,
          key: filter.options.key,
          operator: '!=',
        });
      }
    }

    return {
      ...query,
      adHocFilters: filters,
    };
  }

  queryHasFilter(query: CHQuery, filter: QueryFilterOptions): boolean {
    return query.adHocFilters.some((f) => f.key === filter.key && f.value === filter.value);
  }

  async query(options: DataQueryRequest<CHQuery>) {
    this.options = options;
    const targets = options.targets.filter((target) => !target.hide && target.query);
    const queries = await Promise.all(
      targets.map(async (target) => this.createQuery(options, target))
    );

    // this.replace(options, targets[0]);
    // console.log(queries[0], 'old one')
    // No valid targets, return the empty result to save a round trip.
    if (!queries.length) {
      return Promise.resolve({ data: [] });
    }
    const allQueryPromise = queries.map((query) => {
      return this._seriesQuery(query.stmt, query.requestId);
    });

    return Promise.all(allQueryPromise).then((responses: any): any => {
      let result: any[] = [],
        i = 0;
      _.each(responses, (response) => {
        const target = options.targets[i];
        const keys = queries[i].keys;

        i++;
        if (!response || !response.rows) {
          return;
        }

        let sqlSeries = new SqlSeries({
          refId: target.refId,
          series: response.data,
          meta: response.meta,
          keys: keys,
          tillNow: options.rangeRaw?.to === 'now',
          from: SqlQueryHelper.convertTimestamp(options.range.from),
          to: SqlQueryHelper.convertTimestamp(options.range.to),
        });

        if (target.format === 'table') {
          _.each(sqlSeries.toTable(), (data) => {
            result.push(data);
          });
        } else if (target.format === 'traces') {
          result = sqlSeries.toTraces();
        } else if (target.format === 'flamegraph') {
          result = sqlSeries.toFlamegraph();
        } else if (target.format === 'logs') {
          result = sqlSeries.toLogs();
        } else if (target.refId === 'Anno') {
          result = sqlSeries.toAnnotation(response.data);
        } else {
          _.each(sqlSeries.toTimeSeries(target.extrapolate), (data) => {
            result.push(data);
          });
        }
      });

      return { data: result };
    });
  }

  modifyQuery(query: any, action: any): any {
    console.log('MODIFY, query: ', query, 'action: ', action);
    let where = this.syncBackendMigrationGetPropertiesFromAST(query.query, 'where');
    const labelFilter = action.key + " = '" + action.value + "'";

    switch (action.type) {
      case 'ADD_FILTER': {
        if (where.length === 0) {
          where.push(labelFilter);
          break;
        }

        let alreadyAdded = false;
        _.each(where, (w: string) => {
          if (w.includes(labelFilter)) {
            alreadyAdded = true;
          }
        });
        if (!alreadyAdded) {
          where.push('AND ' + labelFilter);
        }
        break;
      }
      case 'ADD_FILTER_OUT': {
        if (where.length === 0) {
          break;
        }
        where.forEach((w: string, i: number) => {
          if (w.includes(labelFilter)) {
            where.splice(i, 1);
          }
        });
        break;
      }
      default:
        break;
    }

    const modifiedQuery = this.syncBackendMigrationReplacePropertyAST(query.query, 'where', where);

    return { ...query, query: modifiedQuery };
  }

  async createQuery(options: any, target: any) {
    const stmt = await this.replace(options, target);

    let keys = [];

    try {
      keys = await this.backendMigrationGetPropertiesFromAST(stmt, 'group by');
    } catch (err) {
      console.log('AST parser error: ', err);
    }

    return {
      keys: keys,
      requestId: options.panelId + target.refId,
      stmt: stmt,
    };
  }

  async annotationQuery(options: any): Promise<AnnotationEvent[]> {
    if (!options.annotation.query) {
      throw new Error('Query missing in annotation definition');
    }

    const params = Object.assign(
      {
        annotation: {
          dateTimeColDataType: 'time',
        },
        interval: '30s',
      },
      options
    );
    let query;

    const replaced = await this.replace(params, params.annotation);
    query = replaced.replace(/\r\n|\r|\n/g, ' ');
    query += ' FORMAT JSON';

    const queryParams = CHDataSource._getRequestOptions(query, true, undefined, this);

    const dataRequest = new Promise((resolve, reject) => {
      this.backendSrv.fetch(queryParams).subscribe(
        (response) => {
          resolve(this.responseParser.transformAnnotationResponse(params, response.data) as AnnotationEvent[]);
        },
        (e) => {
          reject(e);
        }
      );
    });

    return dataRequest as Promise<AnnotationEvent[]>;
  }

  metricFindQuery(query: string, options?: any) {
    let interpolatedQuery: string;
    const wildcardChar = '%';
    const searchFilterVariableName = '__searchFilter';
    let scopedVars = {};
    if (query?.indexOf(searchFilterVariableName) !== -1) {
      const searchFilterValue =
        options && options.searchFilter ? `${options.searchFilter}${wildcardChar}` : `${wildcardChar}`;
      scopedVars = {
        __searchFilter: {
          value: searchFilterValue,
          text: '',
        },
      };
      query = this.templateSrv.replace(query, scopedVars, SqlQueryHelper.interpolateQueryExpr);
    }
    interpolatedQuery = this.templateSrv.replace(
      SqlQueryHelper.conditionalTest(query, this.templateSrv),
      scopedVars,
      SqlQueryHelper.interpolateQueryExpr
    );

    if (options && options.range) {
      let from = SqlQueryHelper.convertTimestamp(options.range.from);
      let to = SqlQueryHelper.convertTimestamp(options.range.to);
      interpolatedQuery = interpolatedQuery.replace(/\$to/g, to.toString()).replace(/\$from/g, from.toString());
      interpolatedQuery = CHDataSource.replaceTimeFilters(interpolatedQuery, options.range);
      interpolatedQuery = interpolatedQuery.replace(/\r\n|\r|\n/g, ' ');
    }

    // todo(nv): fix request id
    return this._seriesQuery(interpolatedQuery).then(curry(this.responseParser.parse)(query));
  }

  testDatasource() {
    return this.metricFindQuery(DEFAULT_QUERY.query).then(() => {
      return { status: 'success', message: 'Data source is working', title: 'Success' };
    });
  }

  _seriesQuery(query: string, requestId?: string) {
    query += ' FORMAT JSON';
    return this._request(query, requestId);
  }

  targetContainsTemplate(target: CHQuery) {
    return this.templateSrv.containsTemplate(target.query);
  }

  getTagKeys() {
    // check whether variable `adhoc_query_filter` exists to apply additional filtering
    // @see https://github.com/Altinity/clickhouse-grafana/issues/75
    // @see https://github.com/grafana/grafana/issues/13109
    let queryFilter = '';
    each(this.templateSrv.getVariables(), (v: TypedVariableModel) => {
      if ('query' in v && v.name === adhocFilterVariable) {
        queryFilter = v.query;
      }
    });
    return this.adHocFilter.GetTagKeys(queryFilter);
  }

  getTagValues(options: any) {
    return this.adHocFilter.GetTagValues(options);
  }

  interpolateVariablesInQueries(queries: any, scopedVars: any) {
    let expandedQueries = queries;
    if (queries && queries.length > 0) {
      expandedQueries = queries.map((query: any) => {
        const expandedQuery = {
          ...query,
          datasource: this.getRef(),
          query: this.templateSrv.replace(
            SqlQueryHelper.conditionalTest(query.query, this.templateSrv),
            scopedVars,
            SqlQueryHelper.interpolateQueryExpr
          ),
        };
        return expandedQuery;
      });
    }
    return expandedQueries;
  }

  getRef() {
    return { type: this.type, uid: this.uid };
  }

  // used in useFormattedData.ts
  async backendMigrationReplace(query) {
    const replaced = await this.replace(this.options, query);

    return replaced;
  }

  async backendMigrationGetRawDataFromScanner(formattedData) {
    const scanner = new Scanner(formattedData);
    const rawSql = scanner.raw()

    return rawSql;
  }

  async backendMigrationGetPropertiesFromAST(query, propertyName) {
    const scanner = new Scanner(query);
    const ast = scanner.toAST();

    return ast[propertyName] || [];
  }

  syncBackendMigrationGetPropertiesFromAST(query, propertyName) {
    const scanner = new Scanner(query);
    const ast = scanner.toAST();

    return ast[propertyName] || [];
  }

  syncBackendMigrationReplacePropertyAST(query, propertyName, propertyValue) {
    let scanner = new Scanner(query);
    let queryAST = scanner.toAST();
    queryAST[propertyName] = propertyValue;

    return scanner.Print(queryAST);
  }

  backendMigrationApplyAdhocFilters(query: string, adhocFilters: any[], target: any): string {
    if (!adhocFilters || adhocFilters.length === 0) {
      return query;
    }

    let scanner = new Scanner(query);
    let adhocCondition: any[] = [];

    try {

      let ast = scanner.toAST();
      let topQueryAST = ast;

      /* Check sub queries for ad-hoc filters */
      while (ast.hasOwnProperty('from') && !Array.isArray(ast.from)) {
        ast = ast.from;
      }

      if (!ast.hasOwnProperty('where')) {
        ast.where = [];
      }

      let targetInfo = SqlQueryHelper.target(ast.from[0], target);

      adhocFilters.forEach((af: any) => {
        let parts = af.key.includes('.') ? af.key.split('.') : [targetInfo[0], targetInfo[1], af.key];

        if (parts.length === 1) {
          parts = [targetInfo[1], ...parts];
        }
        if (parts.length === 2) {
          parts = [targetInfo[0], ...parts];
        }

        if (parts.length < 3) {
          console.warn(`adhoc filters: filter '${af.key}' has the wrong format`);
          return;
        }

        if (targetInfo[0] !== parts[0] || targetInfo[1] !== parts[1]) {
          return;
        }

        const operator = SqlQueryHelper.clickhouseOperator(af.operator);
        let value = af.value;
        if (!(typeof value === 'number' ||
            value.includes("'") ||
            value.includes(', ') ||
            value.match(/^\s*\d+\s*$/))) {
          value = "'" + value + "'";
        }

        let cond = `${parts[2]} ${operator} ${value}`;
        adhocCondition.push(cond);

        if (ast.where.length > 0) {
          cond = 'AND ' + cond;
        }

        if (!query.includes('$adhoc')) {
          ast.where.push(cond);
        }
      });

      query = scanner.Print(topQueryAST);
    } catch (err) {
      console.error('AST parser error: ', err);
    }

    /* Render the ad-hoc condition or evaluate to an always true condition */
    let renderedAdHocCondition = adhocCondition.length > 0 ? '(' + adhocCondition.join(' AND ') + ')' : '1';

    // Replace $adhoc macro with the rendered condition
    query = query.replace(/\$adhoc\b/g, renderedAdHocCondition);

    return query;
  }

  async replace(options: DataQueryRequest<CHQuery>, target: CHQuery) {
    const adhocFilters = getAdhocFilters(this.adHocFilter?.datasource?.name, this.uid);

    const query = this.templateSrv.replace(
      SqlQueryHelper.conditionalTest(target.query, this.templateSrv),
      options.scopedVars,
      SqlQueryHelper.interpolateQueryExpr
    );

    const queryUpd = this.backendMigrationApplyAdhocFilters(query, adhocFilters, target);

    const queryData = {
      refId: target.refId,
      ruleUid: options.headers?.['X-Rule-Uid'] || '',
      rawQuery: false,
      query: queryUpd,  // Required field
      dateTimeColDataType: target.dateTimeColDataType || '',
      dateColDataType: target.dateColDataType || '',
      dateTimeType: target.dateTimeType || 'DATETIME',
      extrapolate: target.extrapolate || false,
      skip_comments: target.skip_comments || false,
      add_metadata: target.add_metadata || false,
      format: target.format || 'time_series',
      round: target.round || '0s',
      intervalFactor: target.intervalFactor || 1,
      interval: options.interval || '30s',
      database: target.database || 'default',
      table: target.table || '',
      maxDataPoints: options.maxDataPoints || 0,
      timeRange: {
        from: options.range.from.toISOString(),  // Convert to Unix timestamp
        to: options.range.to.toISOString(),       // Convert to Unix timestamp
      }
    };

    console.log('Sending query data:', JSON.stringify(queryData, null, 2));

    try {
      const response: any = await this.postResource('replace', queryData);
      return response?.sql || '';
    } catch (error) {
      console.error('Error from backend:', error);
      throw error;
    }
  }

  static replaceTimeFilters(
    query: string,
    range: TimeRange,
    dateTimeType = TimestampFormat.DateTime,
    round?: number
  ): string {
    let from = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(range.from, round || 0));
    let to = SqlQueryHelper.convertTimestamp(SqlQueryHelper.round(range.to, round || 0));

    // Extending date range to be sure that round does not affect first and last points data
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
        (match: string, columnName: string) =>
          `${SqlQueryHelper.getFilterSqlForDateTimeMs(columnName, dateTimeType)}`
      )
      .replace(/\$from/g, from.toString())
      .replace(/\$to/g, to.toString())
      .replace(/\$__from/g, range.from.valueOf())
      .replace(/\$__to/g, range.to.valueOf());
  }
}
