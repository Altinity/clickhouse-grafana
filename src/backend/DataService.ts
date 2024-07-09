// @ts-nocheck
import { DataFrame, DataService } from '@grafana/ts-backend';
import { FieldType, ArrayVector } from '@grafana/data';
import SqlSeries from "./frontend-datasource/sql_series";
import {SqlQueryHelper} from "./frontend-datasource/sql-query/sql-query-helper";
import _ from "lodash";
import {ClickHouseClient, Settings} from "./be_ts_functions/clickhouseClient";
import {transformData} from "./be_ts_functions/transform-data";
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

    const response = {
      "meta":
        [
          {
            "name": "t",
            "type": "Time"
          },
          {
            "name": "count()",
            "type": "UInt64"
          }
        ],

      "data":
        [
          {
            "t": "1720523370000",
            "count()": "1"
          },
          {
            "t": "1720523430000",
            "count()": "1"
          },
          {
            "t": "1720523490000",
            "count()": "1"
          },
          {
            "t": "1720523550000",
            "count()": "1"
          },
          {
            "t": "1720523610000",
            "count()": "1"
          },
          {
            "t": "1720523670000",
            "count()": "1"
          },
          {
            "t": "1720523730000",
            "count()": "1"
          },
          {
            "t": "1720523790000",
            "count()": "1"
          },
          {
            "t": "1720523850000",
            "count()": "1"
          },
          {
            "t": "1720523910000",
            "count()": "1"
          },
          {
            "t": "1720523970000",
            "count()": "1"
          },
          {
            "t": "1720524030000",
            "count()": "1"
          },
          {
            "t": "1720524090000",
            "count()": "1"
          },
          {
            "t": "1720524150000",
            "count()": "1"
          },
          {
            "t": "1720524210000",
            "count()": "1"
          },
          {
            "t": "1720524270000",
            "count()": "1"
          },
          {
            "t": "1720524330000",
            "count()": "1"
          },
          {
            "t": "1720524390000",
            "count()": "1"
          },
          {
            "t": "1720524450000",
            "count()": "1"
          },
          {
            "t": "1720524510000",
            "count()": "1"
          },
          {
            "t": "1720524570000",
            "count()": "1"
          },
          {
            "t": "1720524630000",
            "count()": "1"
          },
          {
            "t": "1720524690000",
            "count()": "1"
          },
          {
            "t": "1720524750000",
            "count()": "1"
          },
          {
            "t": "1720524810000",
            "count()": "1"
          },
          {
            "t": "1720524870000",
            "count()": "1"
          },
          {
            "t": "1720524930000",
            "count()": "1"
          },
          {
            "t": "1720524990000",
            "count()": "1"
          },
          {
            "t": "1720525050000",
            "count()": "1"
          },
          {
            "t": "1720525110000",
            "count()": "1"
          },
          {
            "t": "1720525170000",
            "count()": "1"
          },
          {
            "t": "1720525230000",
            "count()": "1"
          },
          {
            "t": "1720525290000",
            "count()": "1"
          },
          {
            "t": "1720525350000",
            "count()": "1"
          },
          {
            "t": "1720525410000",
            "count()": "1"
          },
          {
            "t": "1720525470000",
            "count()": "1"
          },
          {
            "t": "1720525530000",
            "count()": "1"
          },
          {
            "t": "1720525590000",
            "count()": "1"
          },
          {
            "t": "1720525650000",
            "count()": "1"
          },
          {
            "t": "1720525710000",
            "count()": "1"
          },
          {
            "t": "1720525770000",
            "count()": "1"
          },
          {
            "t": "1720525830000",
            "count()": "1"
          },
          {
            "t": "1720525890000",
            "count()": "1"
          },
          {
            "t": "1720525950000",
            "count()": "1"
          },
          {
            "t": "1720526010000",
            "count()": "1"
          },
          {
            "t": "1720526070000",
            "count()": "1"
          },
          {
            "t": "1720526130000",
            "count()": "1"
          },
          {
            "t": "1720526190000",
            "count()": "1"
          },
          {
            "t": "1720526250000",
            "count()": "1"
          },
          {
            "t": "1720526310000",
            "count()": "1"
          },
          {
            "t": "1720526370000",
            "count()": "1"
          },
          {
            "t": "1720526430000",
            "count()": "1"
          },
          {
            "t": "1720526490000",
            "count()": "1"
          },
          {
            "t": "1720526550000",
            "count()": "1"
          },
          {
            "t": "1720526610000",
            "count()": "1"
          },
          {
            "t": "1720526670000",
            "count()": "1"
          },
          {
            "t": "1720526730000",
            "count()": "1"
          },
          {
            "t": "1720526790000",
            "count()": "1"
          },
          {
            "t": "1720526850000",
            "count()": "1"
          },
          {
            "t": "1720526910000",
            "count()": "1"
          },
          {
            "t": "1720526970000",
            "count()": "1"
          },
          {
            "t": "1720527030000",
            "count()": "1"
          },
          {
            "t": "1720527090000",
            "count()": "1"
          },
          {
            "t": "1720527150000",
            "count()": "1"
          },
          {
            "t": "1720527210000",
            "count()": "1"
          },
          {
            "t": "1720527270000",
            "count()": "1"
          },
          {
            "t": "1720527330000",
            "count()": "1"
          },
          {
            "t": "1720527390000",
            "count()": "1"
          },
          {
            "t": "1720527450000",
            "count()": "1"
          },
          {
            "t": "1720527510000",
            "count()": "1"
          },
          {
            "t": "1720527570000",
            "count()": "1"
          },
          {
            "t": "1720527630000",
            "count()": "1"
          },
          {
            "t": "1720527690000",
            "count()": "1"
          },
          {
            "t": "1720527750000",
            "count()": "1"
          },
          {
            "t": "1720527810000",
            "count()": "1"
          },
          {
            "t": "1720527870000",
            "count()": "1"
          },
          {
            "t": "1720527930000",
            "count()": "1"
          },
          {
            "t": "1720527990000",
            "count()": "1"
          },
          {
            "t": "1720528050000",
            "count()": "1"
          },
          {
            "t": "1720528110000",
            "count()": "1"
          },
          {
            "t": "1720528170000",
            "count()": "1"
          },
          {
            "t": "1720528230000",
            "count()": "1"
          },
          {
            "t": "1720528290000",
            "count()": "1"
          },
          {
            "t": "1720528350000",
            "count()": "1"
          },
          {
            "t": "1720528410000",
            "count()": "1"
          },
          {
            "t": "1720528470000",
            "count()": "1"
          },
          {
            "t": "1720528530000",
            "count()": "1"
          },
          {
            "t": "1720528590000",
            "count()": "1"
          },
          {
            "t": "1720528650000",
            "count()": "1"
          },
          {
            "t": "1720528710000",
            "count()": "1"
          },
          {
            "t": "1720528770000",
            "count()": "1"
          },
          {
            "t": "1720528830000",
            "count()": "1"
          },
          {
            "t": "1720528890000",
            "count()": "1"
          },
          {
            "t": "1720528950000",
            "count()": "1"
          },
          {
            "t": "1720529010000",
            "count()": "1"
          },
          {
            "t": "1720529070000",
            "count()": "1"
          },
          {
            "t": "1720529130000",
            "count()": "1"
          },
          {
            "t": "1720529190000",
            "count()": "1"
          },
          {
            "t": "1720529250000",
            "count()": "1"
          },
          {
            "t": "1720529310000",
            "count()": "1"
          },
          {
            "t": "1720529370000",
            "count()": "1"
          },
          {
            "t": "1720529430000",
            "count()": "1"
          },
          {
            "t": "1720529490000",
            "count()": "1"
          },
          {
            "t": "1720529550000",
            "count()": "1"
          },
          {
            "t": "1720529610000",
            "count()": "1"
          },
          {
            "t": "1720529670000",
            "count()": "1"
          },
          {
            "t": "1720529730000",
            "count()": "1"
          },
          {
            "t": "1720529790000",
            "count()": "1"
          },
          {
            "t": "1720529850000",
            "count()": "1"
          },
          {
            "t": "1720529910000",
            "count()": "1"
          },
          {
            "t": "1720529970000",
            "count()": "1"
          },
          {
            "t": "1720530030000",
            "count()": "1"
          },
          {
            "t": "1720530090000",
            "count()": "1"
          },
          {
            "t": "1720530150000",
            "count()": "1"
          },
          {
            "t": "1720530210000",
            "count()": "1"
          },
          {
            "t": "1720530270000",
            "count()": "1"
          },
          {
            "t": "1720530330000",
            "count()": "1"
          },
          {
            "t": "1720530390000",
            "count()": "1"
          },
          {
            "t": "1720530450000",
            "count()": "1"
          },
          {
            "t": "1720530510000",
            "count()": "1"
          }
        ],

      "rows": 120,

      "statistics":
        {
          "elapsed": 0.013793848,
          "rows_read": 180,
          "bytes_read": 1080
        }
    }

    return transformData(response);
  }
}
