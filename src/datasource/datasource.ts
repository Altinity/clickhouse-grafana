import _, { curry, each } from 'lodash';
import SqlSeries from './sql-series/sql_series';
import ResponseParser from './response_parser';
import AdHocFilter from './adhoc';

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
import { BackendSrv, DataSourceWithBackend, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { CHDataSourceOptions, CHQuery, DEFAULT_QUERY } from '../types/types';
import { QueryEditor } from '../views/QueryEditor/QueryEditor';
import { getAdhocFilters } from '../views/QueryEditor/helpers/getAdHocFilters';
import { from, Observable } from 'rxjs';
import { adhocFilterVariable, conditionalTest, convertTimestamp, interpolateQueryExpr } from './helpers';
import { BackendResources } from './backend-resources/backendResources';

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
  xClickHouseSSLCertificateAuth: boolean;
  defaultValues: any;
  useYandexCloudAuthorization: boolean;
  useCompression: boolean;
  compressionType: string;
  adHocValuesQuery: string;
  uid: string;
  backendResources: BackendResources;

  constructor(instanceSettings: DataSourceInstanceSettings<CHDataSourceOptions>) {
    super(instanceSettings);
    this.backendResources = new BackendResources(this);
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

    const originalQuery = await this.createQuery(requestOptions, query);
    let select = await this.backendResources.getPropertyFromAST(
      originalQuery.stmt.replace(/\r\n|\r|\n/g, ' '),
      'select'
    );

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

      const response: any = await this.seriesQuery(stmt, requestId + options?.direction);

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

        const result: any = await this.seriesQuery(stmt, requestId + options?.direction);

        return result.data[0];
      };

      const { timestamp } = await getLogsTimeBoundaries();
      const getLogContext = async () => {
        const contextDataRequest =
          options?.direction === LogRowContextQueryDirection.Backward
            ? generateRequestForTimestampBackward(timestampColumn, timestamp, row.timeUtc, select)
            : generateRequestForTimestampForward(timestampColumn, timestamp, row.timeUtc, select);

        const { stmt, requestId } = await this.createQuery(requestOptions, { ...query, query: contextDataRequest });

        return this.seriesQuery(stmt, requestId + options?.direction);
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

      if (!queries.length) {
        return from(Promise.resolve({ data: [] }));
      }
      const allQueryPromise = queries.map((query) => {
        return this.seriesQuery(query.stmt, query.requestId);
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
            from: convertTimestamp(options.range.from),
            to: convertTimestamp(options.range.to),
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

  async createQuery(options: any, target: any) {
    const stmt = await this.replace(options, target);

    let keys = [];

    try {
      keys = await this.backendResources.getPropertyFromAST(stmt, 'group by');
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

  async metricFindQuery(query: string, options?: any) {
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
      query = this.templateSrv.replace(query, scopedVars, interpolateQueryExpr);
    }
    interpolatedQuery = this.templateSrv.replace(
      conditionalTest(query, this.templateSrv),
      scopedVars,
      interpolateQueryExpr
    );

    if (options && options.range) {
      let from = convertTimestamp(options.range.from);
      let to = convertTimestamp(options.range.to);
      interpolatedQuery = interpolatedQuery.replace(/\$to/g, to.toString()).replace(/\$from/g, from.toString());
      interpolatedQuery = await this.backendResources.replaceTimeFilters(interpolatedQuery, options.range);
      interpolatedQuery = interpolatedQuery.replace(/\r\n|\r|\n/g, ' ');
    }

    // todo(nv): fix request id
    return this.seriesQuery(interpolatedQuery).then(curry(this.responseParser.parse)(query));
  }

  testDatasource() {
    return this.metricFindQuery(DEFAULT_QUERY.query).then(() => {
      return { status: 'success', message: 'Data source is working', title: 'Success' };
    });
  }

  private seriesQuery(query: string, requestId?: string) {
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
            conditionalTest(query.query, this.templateSrv),
            scopedVars,
            interpolateQueryExpr
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

  async replace(options: DataQueryRequest<CHQuery>, target: CHQuery) {
    const adhocFilters = getAdhocFilters(this.adHocFilter?.datasource?.name, this.uid);

    const queryData = {
      frontendDatasource: true,
      refId: target.refId,
      ruleUid: options.headers?.['X-Rule-Uid'] || '',
      rawQuery: false,
      query: target.query, // Required field
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
        from: options.range.from.toISOString(), // Convert to Unix timestamp
        to: options.range.to.toISOString(), // Convert to Unix timestamp
      },
    };

    try {
      const response: any = await this.postResource('replace', queryData);

      const query = this.templateSrv.replace(
        conditionalTest(response.sql, this.templateSrv),
        options.scopedVars,
        interpolateQueryExpr
      );

      const queryUpd = await this.backendResources.applyAdhocFilters(query, adhocFilters, target);

      return queryUpd;
    } catch (error) {
      console.error('Error from backend:', error);
      throw error;
    }
  }
}
