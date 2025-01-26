import _, { curry, each } from 'lodash';
import SqlSeries from './sql-series/sql_series';
import SqlQuery from './sql-query/sql_query';
import ResponseParser from './response_parser';
import AdHocFilter from './adhoc';
import Scanner from './scanner/scanner';

import {
  AnnotationEvent,
  DataQueryRequest,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourceWithLogsContextSupport,
  DataSourceWithToggleableQueryFiltersSupport,
  LogRowContextOptions,
  LogRowContextQueryDirection,
  LogRowModel,
  QueryFilterOptions,
  TypedVariableModel, VariableSupportType,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { CHDataSourceOptions, CHQuery, DEFAULT_QUERY } from '../types/types';
import { SqlQueryHelper } from './sql-query/sql-query-helper';
import SqlQueryMacros from './sql-query/sql-query-macros';
import { QueryEditor } from '../views/QueryEditor/QueryEditor';
import { getAdhocFilters } from '../views/QueryEditor/helpers/getAdHocFilters';
import {from, Observable} from "rxjs";

const adhocFilterVariable = 'adhoc_query_filter';
export class CHDataSource
  extends DataSourceApi<CHQuery, CHDataSourceOptions>
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
  xClickHouseSSLCertificateAuth: boolean;
  defaultValues: any;
  useYandexCloudAuthorization: boolean;
  useCompression: boolean;
  compressionType: string;
  adHocValuesQuery: string;
  adHocHideTableNames: boolean;
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
    this.adHocHideTableNames = instanceSettings.jsonData.adHocHideTableNames || false;
    this.compressionType = instanceSettings.jsonData.compressionType || '';
    this.defaultDatabase = instanceSettings.jsonData.defaultDatabase || '';
    this.xHeaderUser = instanceSettings.jsonData.xHeaderUser || '';
    this.xClickHouseSSLCertificateAuth = instanceSettings.jsonData.xClickHouseSSLCertificateAuth || false;
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
    this.variables = {
      getType(): VariableSupportType {
        return VariableSupportType.Custom;
      },
      // @ts-ignore
      editor: QueryEditor,
      query: this.query.bind(this),
    }

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
      if (options.xClickHouseSSLCertificateAuth) {
        requestOptions.headers['X-ClickHouse-SSL-Certificate-Auth'] = 'on';
        if (requestOptions.url.indexOf('/?') === -1) {
          requestOptions.url += '/xClickHouseSSLCertificateAuth';
        } else {
          requestOptions.url.replace('/?', '/xClickHouseSSLCertificateAuth/?');
        }
      } else {
        if (requestOptions.url.indexOf('/?') === -1) {
          requestOptions.url += '/xHeaderKey';
        } else {
          requestOptions.url.replace('/?', '/xHeaderKey/?');
        }
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

    const originalQuery = this.createQuery(requestOptions, query);
    let scanner = new Scanner(originalQuery.stmt.replace(/\r\n|\r|\n/g, ' '));
    let { select, where } = scanner.toAST();

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
        ) WHERE ${where?.length ? where.join(' ') + ' AND' : ''} ${inputTimestampColumn} = ${inputTimestampValue}`;
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
        ) WHERE  ${where?.length ? where.join(' ') + ' AND' : ''} ${inputTimestampColumn} = ${inputTimestampValue}`;
    };

    const generateRequestForTimestampForward = (timestampField, timestamp, currentRowTimestamp, select) => {
      return `SELECT ${select.join(
        ','
      )} FROM $table WHERE ${where?.length ? where.join(' ') + ' AND' : ''} ${timestampField} <'${timestamp}' AND ${timestampField} > '${currentRowTimestamp}'`;
    };

    const generateRequestForTimestampBackward = (timestampField, timestamp, currentRowTimestamp, select) => {
      return `SELECT ${select.join(
        ','
      )} FROM $table WHERE ${where?.length ? where.join(' ') + ' AND' : ''} ${timestampField} > '${timestamp}' AND ${timestampField} < '${currentRowTimestamp}'`;
    };

    if (traceId) {
      const queryForTraceID = generateQueryForTraceID(traceId, select);
      const { stmt, requestId } = this.createQuery(requestOptions, { ...query, query: queryForTraceID });

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

        const { stmt, requestId } = this.createQuery(requestOptions, { ...query, query: boundariesRequest });

        const result: any = await this._seriesQuery(stmt, requestId + options?.direction);

        return result.data[0];
      };

      const { timestamp } = await getLogsTimeBoundaries();
      const getLogContext = async () => {
        const contextDataRequest =
          options?.direction === LogRowContextQueryDirection.Backward
            ? generateRequestForTimestampBackward(timestampColumn, timestamp, row.timeUtc, select)
            : generateRequestForTimestampForward(timestampColumn, timestamp, row.timeUtc, select);

        const { stmt, requestId } = this.createQuery(requestOptions, { ...query, query: contextDataRequest });

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

  query(options: DataQueryRequest<CHQuery>): Observable<any> {
    const queryProcessing = async () => {
      this.options = options;
      const targets = options.targets.filter((target) => !target.hide && target.query);
      const queries = await Promise.all(targets.map(async (target) => this.createQuery(options, target)));
      // No valid targets, return the empty result to save a round trip.
      if (!queries.length) {
        return from(Promise.resolve({ data: [] }));
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
            result = sqlSeries.toAnnotation(response.data, response.meta);
          } else {
            _.each(sqlSeries.toTimeSeries(target.extrapolate), (data) => {
              result.push(data);
            });
          }
        });

        return { data: result };
      });
    };

    return from(queryProcessing());
  }

  modifyQuery(query: any, action: any): any {
    let scanner = new Scanner(query.query ?? '');
    let queryAST = scanner.toAST();
    let where = queryAST['where'] || [];
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

    const modifiedQuery = scanner.Print(queryAST);
    return { ...query, query: modifiedQuery };
  }

  createQuery(options: any, target: any) {
    const queryModel = new SqlQuery(target, this.templateSrv, options);
    // @ts-ignore
    const adhocFilters = getAdhocFilters(this.adHocFilter?.datasource?.name, this.uid);
    const stmt = queryModel.replace(options, adhocFilters);

    let keys = [];

    try {
      let queryAST = new Scanner(stmt).toAST();
      keys = queryAST['group by'] || [];
    } catch (err) {
      console.log('AST parser error: ', err);
    }

    return {
      keys: keys,
      requestId: options.panelId + target.refId,
      stmt: stmt,
    };
  }

  annotationQuery(options: any): Promise<AnnotationEvent[]> {
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
    let queryModel;
    let query;

    queryModel = new SqlQuery(params.annotation, this.templateSrv, params);
    queryModel = queryModel.replace(params, []);
    query = queryModel.replace(/\r\n|\r|\n/g, ' ');
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
      interpolatedQuery = SqlQueryMacros.replaceTimeFilters(interpolatedQuery, options.range);
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

  formatQuery(query) {
    let scanner = new Scanner(query ?? '');
    scanner.Format();
    return scanner.Format();
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
}
