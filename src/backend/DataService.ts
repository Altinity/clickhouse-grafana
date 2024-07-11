// @ts-nocheck
import { DataFrame, DataService } from '@grafana/ts-backend';
import {ClickhouseClient, Settings} from "./be_ts_functions/clickhouse-client";
import {transformData} from "./be_ts_functions/transform-data";
import SqlQuery from "../datasource/sql-query/sql_query";
import Scanner from "../datasource/scanner/scanner";
import {SqlQueryHelper} from "../datasource/sql-query/sql-query-helper";

const getRequestSettings = (pluginContext: any) => {
  const jsonData = JSON.parse(Buffer.from(pluginContext.datasourceinstancesettings.jsondata, 'base64').toString());

  return {
    Instance: {
      URL: pluginContext.datasourceinstancesettings.url,
      BasicAuthEnabled: pluginContext.datasourceinstancesettings.basicauthenabled,
      DecryptedSecureJSONData: {
        // basicAuthPassword: pluginContext.datasourceinstancesettings.decryptedsecurejsondataMap.find(item => item[0] === "basicAuthPassword")[1],
        // Add other fields as necessary (e.g., tlsCACert, tlsClientCert, tlsClientKey, xHeaderKey)
      },
      BasicAuthUser: pluginContext.datasourceinstancesettings.basicauthuser
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

const createQuery = (options: any, target: any, request: any) => {

  const queryModel = new SqlQuery(target, null, {range: {
    from: request.timerange.fromepochms,
      to: request.timerange.toepochms,
    }, interval: target.interval});

  const stmt = queryModel.replace({range: {
      from: request.timerange.fromepochms,
      to: request.timerange.toepochms,
    },interval: target.interval}, []);

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

export class TemplateDataService extends DataService<any,any> {
  constructor() {
    super();
  }

  async QueryData(request: any, pluginContext): Promise<DataFrame[]> {
    const target = request.query

    target.interval = '30s'

    const newQuery = createQuery({interval: target.interval}, target, request)

    const clickhouseClient = new ClickhouseClient(getRequestSettings(pluginContext));

    //TODO: fix missing format JSON issue
    const result = await clickhouseClient.query({}, newQuery.stmt + " FORMAT JSON");

    console.log(JSON.stringify(transformData(result.body)))
    return transformData(result.body);
  }
}
