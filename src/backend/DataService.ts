// @ts-nocheck
import { DataFrame, DataService } from '@grafana/ts-backend';
import { FieldType, ArrayVector } from '@grafana/data';
import SqlSeries from "./frontend-datasource/sql_series";
import {SqlQueryHelper} from "./frontend-datasource/sql-query/sql-query-helper";
import _ from "lodash";
import {ClickHouseClient, Settings} from "./be_ts_functions/clickhouseClient";
// import SqlQuery from "./frontend-datasource/sql-query/sql_query";
// import Scanner from "./frontend-datasource/scanner/scanner";

const getRequestSettings = () => {
  const jsonData = JSON.parse(Buffer.from("eyJhZGRDb3JzSGVhZGVyIjp0cnVlLCJjb21wcmVzc2lvblR5cGUiOiJnemlwIiwidXNlQ29tcHJlc3Npb24iOnRydWUsInVzZVBPU1QiOnRydWV9", 'base64').toString());

  return {
    Instance: {
      URL: 'http://localhost:8123',
      BasicAuthEnabled: true,
      DecryptedSecureJSONData: {
        basicAuthPassword: '', // Replace with your actual password
        // Add other fields as necessary (e.g., tlsCACert, tlsClientCert, tlsClientKey, xHeaderKey)
      },
      BasicAuthUser: 'default'
    },
    UsePost: jsonData.usePOST, // True based on the provided jsondata
    UseCompression: jsonData.useCompression, // True based on the provided jsondata
    CompressionType: jsonData.compressionType || 'gzip', // Defaulting to gzip if not provided
    UseYandexCloudAuthorization: false, // Set to true if using Yandex Cloud Authorization, based on additional context
    XHeaderUser: '', // Required if using Yandex Cloud Authorization
    XHeaderKey: '', // Optional, required if using Yandex Cloud Authorization
    TLSSkipVerify: false // Set to true to skip TLS verification
  };
}
const getParsedQuery = (request) => {
  return `/* grafana dashboard=$__searchFilter in template variables, user=0 */
    SELECT
        (intDiv(toUInt32(event_time), 30) * 30) * 1000 as t,
        count()
    FROM default.test_grafana
    
    WHERE event_time >= toDateTime(1720242516) AND event_time <= toDateTime(1720264116)
     AND country = 'RU' 
    GROUP BY t
    
    ORDER BY t FORMAT JSON`
};

const createQuery = (options: any, target: any) => {
  // // replace template SRV with null
  // const queryModel = new SqlQuery(target, null, {range: {
  //   from: 1720124290000,
  //     to: 2920124290000,
  //   }, interval: '30s'});
  // const stmt = queryModel.replace({range: {
  //     from: 1720124290000,
  //     to: 2920124290000,
  //   },interval: '30s'}, []);
  //
  // let keys = [];
  //
  // try {
  //   let queryAST = new Scanner(stmt).toAST();
  //   keys = queryAST['group by'] || [];
  // } catch (err) {
  //   console.log('AST parser error: ', err);
  // }
  //
  // return {
  //   keys: keys,
  //   requestId: options.panelId + target.refId,
  //   stmt: stmt,
  // };
}

export class TemplateDataService extends DataService<any,any> {
  constructor() {
    super();
  }

  async QueryData(request: any, pluginContext): Promise<DataFrame[]> {

    const target = request.query
    const newQuery = createQuery({interval: "30s"}, target)

    // const clickhouseClient = new ClickHouseClient(getRequestSettings());
    // const parsedQuery = getParsedQuery(request);
    //
    // const result = await clickhouseClient.query({}, newQuery.stmt);
    //
    //
    //
    //
    // console.log(result.body.data)
    // console.log(result)

    // this.options = options;
    // const target = options.targets[0]
    // const query = this.createQuery(options, target)
    // const response =  this._seriesQuery(query.stmt, query.requestId);
    //
    // // parse response, no network request
    // if (!response || !response.rows) {
    //   return;
    // }
    //
    // let result: any[] = [];
    // let i = 0;
    // const keys = query.keys;
    //
    // let sqlSeries = new SqlSeries({
    //   refId: target.refId,
    //   series: response.data,
    //   meta: response.meta,
    //   keys: keys,
    //   tillNow: options.rangeRaw?.to === 'now',
    //   from: SqlQueryHelper.convertTimestamp(options.range.from),
    //   to: SqlQueryHelper.convertTimestamp(options.range.to),
    // });
    //
    // if (target.format === 'table') {
    //   _.each(sqlSeries.toTable(), (data) => {
    //     result.push(data);
    //   });
    // } else if (target.format === 'traces') {
    //   result = sqlSeries.toTraces();
    // } else if (target.format === 'flamegraph') {
    //   result = sqlSeries.toFlamegraph();
    // } else if (target.format === 'logs') {
    //   result = sqlSeries.toLogs();
    // } else if (target.refId === 'Anno') {
    //   result = sqlSeries.toAnnotation(response.data);
    // } else {
    //   _.each(sqlSeries.toTimeSeries(target.extrapolate), (data) => {
    //     result.push(data);
    //   });
    // }

    // return { data: result }
    //
    // console.log('QueryData', request)
    return Promise.resolve([{
      name: 'some data',
      fields: [{
        name: 'time',
        config: {},
        type: FieldType.time,
        values: new ArrayVector([ Date.now()]),
      },{
        name: 'value',
        config: {},
        type: FieldType.number,
        values: new ArrayVector([ 1 ]),
      }],
      length: 2,
    }]);
  }
}
