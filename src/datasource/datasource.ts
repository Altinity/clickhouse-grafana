import _, { curry, each } from 'lodash';
import SqlSeries from './sql-series/sql_series';
import ResponseParser from './response_parser';
import AdHocFilter from './adhoc';

import {
  AnnotationEvent,
  DataQueryRequest,
  DataSourceInstanceSettings,
  DataSourceWithLogsContextSupport,
  DataSourceWithToggleableQueryFiltersSupport, FieldType,
  LogRowContextOptions,
  LogRowContextQueryDirection,
  LogRowModel,
  QueryFilterOptions,
  TypedVariableModel, VariableSupportType,
} from '@grafana/data';
import { BackendSrv, DataSourceWithBackend, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import {CHDataSourceOptions, CHQuery, DatasourceMode, DEFAULT_QUERY} from '../types/types';
import {QueryEditor, QueryEditorVariable} from '../views/QueryEditor/QueryEditor';
import { getAdhocFilters } from '../views/QueryEditor/helpers/getAdHocFilters';
import { from } from 'rxjs';
import { adhocFilterVariable, conditionalTest, convertTimestamp, createContextAwareInterpolation } from './helpers';
import { ClickHouseResourceClient } from './resource_handler';
import { IndexedDBManager } from '../utils/indexedDBManager';

export class CHDataSource
  extends DataSourceWithBackend<CHQuery, CHDataSourceOptions>
  implements DataSourceWithLogsContextSupport<CHQuery>, DataSourceWithToggleableQueryFiltersSupport<CHQuery>
{
  backendSrv: BackendSrv;
  templateSrv: TemplateSrv;
  adHocFilter: AdHocFilter;
  responseParser: ResponseParser;
  options: any;
  pluginId: string;
  resourceClient: ClickHouseResourceClient;
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
  datasourceMode?: DatasourceMode;

  constructor(instanceSettings: DataSourceInstanceSettings<CHDataSourceOptions>) {
    super(instanceSettings);
    this.pluginId = instanceSettings.meta.id
    this.resourceClient = ClickHouseResourceClient.getInstance();
    this.uid = instanceSettings.uid;
    // Set the datasource UID for resource calls
    this.resourceClient.setDatasourceUid(instanceSettings.uid);
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
        nullifySparse: instanceSettings.jsonData.nullifySparse,
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
      editor: QueryEditorVariable,
      query: this.queryVariables.bind(this),
    }

    this.annotations = {
      QueryEditor: QueryEditor,
    };

    // Perform global cleanup on initialization (run once per session)
    this.performGlobalCleanup().catch((error) => {
      console.error('Failed to initialize global cleanup:', error);
    });
  }

  private async performGlobalCleanup() {
    // Use a session flag to ensure cleanup runs only once per browser session
    const cleanupKey = 'altinity_cleanup_performed';
    const cleanupPerformed = sessionStorage.getItem(cleanupKey);
    
    if (!cleanupPerformed) {
      try {
        // Cleanup all expired entries
        const stats = await IndexedDBManager.cleanupAllExpired();
        
        if (stats.removedKeys > 0) {
          console.log(`Altinity Plugin: Cleaned up ${stats.removedKeys} expired IndexedDB entries`);
        }
        
        // Mark cleanup as performed for this session
        sessionStorage.setItem(cleanupKey, 'true');
      } catch (error) {
        console.error('Failed to perform IndexedDB cleanup:', error);
      }
    }
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
    // https://github.com/Altinity/clickhouse-grafana/issues/832, https://github.com/ClickHouse/ClickHouse/issues/86553
    // params.push('output_format_json_quote_64bit_integers=1');
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
        (error) => {
          // Enhance error with more context information
          const enhancedError = {
            ...error,
            originalError: error,
            query: query,
            requestId: requestId
          };

          reject(enhancedError);
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
    
    // OPTIMIZED: Use batched AST property extraction to reduce 2 API calls to 1 call
    const astResult = await this.resourceClient.getMultipleAstProperties(
      originalQuery.stmt.replace(/\r\n|\r|\n/g, ' '),
      ['select', 'where']
    );
    
    const select = astResult.properties.select || [];
    const where = astResult.properties.where || [];

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

  processQueryResponse(responses: any, options: any, queries: any[]): any {
    let result: any[] = [];
    let i = 0;

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
          } else if (target.datasourceMode === DatasourceMode.Variable ) {
            if (sqlSeries.meta.length === 0) {
              result =[]
            }

            let textField: string | null = null;
            let valueField: string | null = null;

            sqlSeries.meta.forEach((col: any) => {
              if (col.name.toLowerCase().includes('text')) {
                textField = col.name;
              }
              if (col.name.toLowerCase().includes('value')) {
                valueField = col.name;
              }
            })

            const resultContent: { length: any; refId: string; fields: any[] } = {
              refId: 'A',
              length:  sqlSeries.series.length,
              fields: []
            }

            if (textField && valueField) {
              resultContent.fields.push({
                name: 'text',
                type: FieldType.string,
                values: sqlSeries.series.map(item => item[textField!].toString()),
              })
              resultContent.fields.push({
                name: 'value',
                type: FieldType.string,
                values: sqlSeries.series.map(item => item[valueField!].toString()),
              })
            } else if (textField) {
              resultContent.fields.push({
                name: 'text',
                type: FieldType.string,
                values: sqlSeries.series.map(item => item[textField!]),
              })
            } else {
              const getFirstStringField = sqlSeries.meta.find((col: any) => col.type === 'String');
              if (getFirstStringField) {
                resultContent.fields.push({
                  name: 'text',
                  type: FieldType.string,
                  values: sqlSeries.series.map(item => item[getFirstStringField.name]),
                })
              } else {
                const getFirstElement = sqlSeries.meta[0];

                resultContent.fields.push({
                  name: 'text',
                  type: FieldType.string,
                  values: sqlSeries.series.map(item => item[getFirstElement.name]),
                })
              }
            }

            result = [resultContent]
          } else {
            _.each(sqlSeries.toTimeSeries(target.extrapolate, target.nullifySparse), (data) => {
              result.push(data);
            });
          }
        });

    return { data: result };
  }

  async executeQueries (targets: any[], options: any): Promise<any> {
    const queries = await Promise.all(
      targets.map(async (target) => this.createQuery(this.options, target))
    );

    if (!queries.length) {
      return { data: [] };
    }

    const responses = await Promise.all(
      queries.map((query) => this.seriesQuery(query.stmt, query.requestId))
    ).catch(error => {
      // Enhance error message with more details if available
      if (error?.data?.exception) {
        // ClickHouse exception in data.exception field
        throw new Error(`Query execution failed: ${error.data.exception}`);
      } else if (error?.data?.message) {
        // Generic message in data.message field
        throw new Error(`Query execution failed: ${error.data.message}`);
      } else if (error?.status && error?.statusText) {
        // HTTP status with optional response body
        const responseDetails = error?.data ? 
          (typeof error.data === 'string' ? error.data : JSON.stringify(error.data)) : '';
        throw new Error(`Query execution failed: HTTP ${error.status} ${error.statusText}${responseDetails ? ': ' + responseDetails : ''}`);
      } else {
        throw error;
      }
    });

    return this.processQueryResponse(responses, options, queries)
  }


  query(options: DataQueryRequest<CHQuery>): any {
    const queryProcessing = async () => {
      try {
        this.options = options;
        const targets = options.targets.filter((target) => !target.hide && target.query?.trim());
        return await this.executeQueries(targets, options);
      } catch (error) {
        console.error('Query processing failed:', error);
        throw error;
      }
    };

    return from(queryProcessing()) as any;
  }

  queryVariables(options: DataQueryRequest<CHQuery>): any {
    const queryProcessing = async () => {
      this.options = options;
      const targets = options.targets.filter((target) => !target.hide && (target?.query?.trim() || typeof target === 'string'));
      const queries = await Promise.all(targets.map(async (target) => {
        return this.createQuery(options, (typeof target === 'string') ? {query: target, datasourceMode: DatasourceMode.Variable} : target)
      }));

      // No valid targets, return the empty result to save a round trip.
      if (!queries.length) {
        return from(Promise.resolve({ data: [] }));
      }
      const allQueryPromise = queries.map((query) => {
        return this.seriesQuery(query.stmt, query.requestId + String(Math.random()));
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

          if (sqlSeries.meta.length === 0) {
            result =[]
          }

          let textField: string | null = null;
          let valueField: string | null = null;

          sqlSeries.meta.forEach((col: any) => {
            if (col.name.toLowerCase().includes('text')) {
              textField = col.name;
            }
            if (col.name.toLowerCase().includes('value')) {
              valueField = col.name;
            }
          })

          const resultContent: { length: any; refId: string; fields: any[] } = {
            refId: 'A',
            length:  sqlSeries.series.length,
            fields: []
          }

          if (textField && valueField) {
            resultContent.fields.push({
              name: 'text',
              type: FieldType.string,
              values: sqlSeries.series.map(item => item[textField!].toString()),
            })
            resultContent.fields.push({
              name: 'value',
              type: FieldType.string,
              values: sqlSeries.series.map(item => item[valueField!].toString()),
            })
          } else if (textField) {
            resultContent.fields.push({
              name: 'text',
              type: FieldType.string,
              values: sqlSeries.series.map(item => item[textField!]),
            })
          } else {
            const getFirstStringField = sqlSeries.meta.find((col: any) => col.type === 'String');
            if (getFirstStringField) {
              resultContent.fields.push({
                name: 'text',
                type: FieldType.string,
                values: sqlSeries.series.map(item => item[getFirstStringField.name]),
              })
            } else {
              const getFirstElement = sqlSeries.meta[0];

              resultContent.fields.push({
                name: 'text',
                type: FieldType.string,
                values: sqlSeries.series.map(item => item[getFirstElement.name]),
              })
            }
          }

          result = [resultContent]
        });

        return { data: result };
      });
    };

    return from(queryProcessing()) as any;
  }

  async createQuery(options: any, target: any) {
    try {
      const { stmt, keys } = await this.replace(options, target);
      return {
        keys: keys,
        requestId: options.panelId + target.refId + (this.datasourceMode || '') + String(Math.random()),
        stmt: stmt,
      };
    } catch (error) {
      // Propagate the error
      throw error;
    }
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

    const { stmt } = await this.replace(params, params.annotation);
    query = stmt.replace(/\r\n|\r|\n/g, ' ');
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
    if (!query || !query.trim()) {
      return [];
    }
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
      query = this.templateSrv.replace(query, scopedVars, createContextAwareInterpolation(query, this.templateSrv.getVariables()));
    }
    const conditionalQuery = conditionalTest(query, this.templateSrv);
    interpolatedQuery = this.templateSrv.replace(
      conditionalQuery,
      scopedVars,
      createContextAwareInterpolation(conditionalQuery, this.templateSrv.getVariables())
    );

    if (options && options.range) {
      let from = convertTimestamp(options.range.from);
      let to = convertTimestamp(options.range.to);
      interpolatedQuery = interpolatedQuery.replace(/\$to/g, to.toString()).replace(/\$from/g, from.toString());
      interpolatedQuery = await this.resourceClient.replaceTimeFilters(interpolatedQuery, options.range, options.dateTimeType);
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
            createContextAwareInterpolation(query.query, this.templateSrv.getVariables())
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

  async replace(options: DataQueryRequest<CHQuery>, target: CHQuery): Promise<any> {
    try {
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
        useWindowFuncForMacros: target.useWindowFuncForMacros || false,
        format: target.format || 'time_series',
        round: target.round || '0s',
        intervalFactor: target.intervalFactor || 1,
        interval: this.templateSrv.replace(target.interval || options.interval || '30s', options.scopedVars),
        database: target.database || 'default',
        table: target.table || '',
        maxDataPoints: options.maxDataPoints || 0,
        timeRange: {
          from: options.range.from.toISOString(), // Convert to Unix timestamp
          to: options.range.to.toISOString(), // Convert to Unix timestamp
        },
      };

      // Apply template variable replacements (these don't require backend processing)
      queryData.query = this.templateSrv.replace(
        conditionalTest(queryData.query, this.templateSrv),
        options.scopedVars,
        createContextAwareInterpolation(queryData.query, this.templateSrv.getVariables())
      );

      // SAFE OPTIMIZATION: Batch createQuery + applyAdhocFilters (reduces 3->2 calls)
      const queryResult = await this.resourceClient.createQueryWithAdhoc(queryData, adhocFilters);

      if (queryResult.error) {
        throw new Error(queryResult.error);
      }

      let query = queryResult.sql;

      // Apply template variable replacements (these don't require backend processing)
      query = this.templateSrv.replace(
        conditionalTest(query, this.templateSrv),
        options.scopedVars,
        createContextAwareInterpolation(query, this.templateSrv.getVariables())
      );

      const wildcardChar = '%';
      const searchFilterVariableName = '__searchFilter';
      let scopedVars = {};
      if (query?.indexOf(searchFilterVariableName) !== -1) {
        const searchFilterValue = `${wildcardChar}`;
        scopedVars = {
          __searchFilter: {
            value: searchFilterValue,
            text: '',
          },
        };
        query = this.templateSrv.replace(query, scopedVars, createContextAwareInterpolation(query, this.templateSrv.getVariables()));
      }

      const interpolatedQuery = this.templateSrv.replace(
        conditionalTest(query, this.templateSrv),
        scopedVars,
        createContextAwareInterpolation(query, this.templateSrv.getVariables())
      );

      // Extract GROUP BY properties from the FINAL query (after template replacement)
      const { properties } = await this.resourceClient.getAstProperty(interpolatedQuery, 'group by');

      return { stmt: interpolatedQuery, keys: properties };
    } catch (error) {
      // Propagate the error instead of returning a default value
      throw error;
    }
  }
}
