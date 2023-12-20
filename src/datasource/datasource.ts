import _, { curry, each } from 'lodash';
import SqlSeries from './sql_series';
import SqlQuery from './sql-query/sql_query';
import ResponseParser from './response_parser';
import AdHocFilter from './adhoc';
import Scanner from './scanner';

import { DataQueryRequest, DataSourceApi, DataSourceInstanceSettings, TypedVariableModel } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { CHDataSourceOptions, CHQuery, DEFAULT_QUERY } from '../types/types';
import { SqlQueryHelper } from './sql-query/sql-query-helper';
import SqlQueryMacros from './sql-query/sql-query-macros';

const adhocFilterVariable = 'adhoc_query_filter';

export class CHDataSource extends DataSourceApi<CHQuery, CHDataSourceOptions> {
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
  useYandexCloudAuthorization: boolean;

  constructor(instanceSettings: DataSourceInstanceSettings<CHDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url!;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.addCorsHeader = instanceSettings.jsonData.addCorsHeader || false;
    this.usePOST = instanceSettings.jsonData.usePOST || false;
    this.defaultDatabase = instanceSettings.jsonData.defaultDatabase || '';
    this.xHeaderUser = instanceSettings.jsonData.xHeaderUser || '';
    this.useYandexCloudAuthorization = instanceSettings.jsonData.useYandexCloudAuthorization || false;

    this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    this.adHocFilter = new AdHocFilter(this);
    this.responseParser = new ResponseParser();
  }

  _getRequestOptions(query: string, usePOST?: boolean, requestId?: string) {
    let options: any = {
      url: this.url,
      requestId: requestId,
    };
    let params: String[] = [];

    if (usePOST) {
      options.method = 'POST';
      options.data = query;
    } else {
      options.method = 'GET';
      params.push('query=' + encodeURIComponent(query));
    }

    if (this.defaultDatabase) {
      params.push('database=' + this.defaultDatabase);
    }

    if (this.basicAuth || this.withCredentials) {
      options.withCredentials = true;
    }

    options.headers = options.headers || {};
    if (this.basicAuth) {
      options.headers.Authorization = this.basicAuth;
    }

    if (this.useYandexCloudAuthorization) {
      options.headers['X-ClickHouse-User'] = this.xHeaderUser;
      // look to routes in plugin.json
      if (options.url.indexOf('/?') === -1) {
        options.url += '/xHeaderKey';
      } else {
        options.url.replace('/?', '/xHeaderKey/?');
      }
    }

    if (this.addCorsHeader) {
      params.push('add_http_cors_header=1');
    }

    if (params.length) {
      options.url += (options.url.indexOf('?') !== -1 ? '&' : '/?') + params.join('&');
    }

    return options;
  }

  _request(query: string, requestId?: string) {
    const queryParams = this._getRequestOptions(query, this.usePOST, requestId);

    return this.backendSrv.datasourceRequest(queryParams).then(result => {
      return result.data;
    });
  }

  query(options: DataQueryRequest<CHQuery>) {
    this.options = options;
    const targets = options.targets.filter((target) => !target.hide && target.query);
    const queries = targets.map((target) => this.createQuery(options, target));
    // No valid targets, return the empty result to save a round trip.
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
        } else if (target.format === 'logs') {
          result = sqlSeries.toLogs();
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
    const stmt = queryModel.replace(options, this.adHocFilter);

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

  annotationQuery(options: any) {
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

    const queryParams = this._getRequestOptions(query, true);

    return this.backendSrv
      .datasourceRequest(queryParams)
      .then((result) => this.responseParser.transformAnnotationResponse(params, result.data));
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
    scanner.Format()
    return scanner.Format()
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
