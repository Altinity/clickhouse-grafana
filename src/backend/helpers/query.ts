import SqlQuery from "../../datasource/sql-query/sql_query";
import Scanner from "../../datasource/scanner/scanner";

export const getRequestSettings = (pluginContext: PluginContext): RequestSettings => {
  const jsonData: CHDataSourceOptions = JSON.parse(Buffer.from(pluginContext.datasourceInstanceSettings.jsonData, 'base64').toString());

  return {
    Instance: {
      URL: pluginContext.datasourceInstanceSettings.url,
      BasicAuthEnabled: pluginContext.datasourceInstanceSettings.basicAuthEnabled,
      DecryptedSecureJSONData: pluginContext.datasourceInstanceSettings.decryptedSecureJsonData,
      BasicAuthUser: pluginContext.datasourceInstanceSettings.basicAuthUser,
    },
    UsePost: jsonData.usePOST || false,
    UseCompression: jsonData.useCompression || false,
    CompressionType: jsonData.compressionType || 'gzip',
    UseYandexCloudAuthorization: jsonData.useYandexCloudAuthorization || false,
    XHeaderUser: jsonData.xHeaderUser || '',
    XHeaderKey: '', // Optional, set as needed
    TLSSkipVerify: false, // Set as needed
  };
};
export const createQuery = (options: any, target: any, request: any) => {

  const queryModel = new SqlQuery(target, null, {
    range: {
      from: request.timerange.fromepochms,
      to: request.timerange.toepochms,
    }, interval: target.interval
  });

  const stmt = queryModel.replace({
    range: {
      from: request.timerange.fromepochms,
      to: request.timerange.toepochms,
    }, interval: target.interval
  }, []);

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
