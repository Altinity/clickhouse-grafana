import SqlQuery from "../../datasource/sql-query/sql_query";
import Scanner from "../../datasource/scanner/scanner";
import { CHDataSourceOptions } from "../../types/types";
import {logger} from "../../../../grafana-plugin-sdk-typescript3";

export const getRequestSettings = (pluginContext: any): any => {
  logger.info("getRequestSettings pluginContext", pluginContext);
  const jsonData: CHDataSourceOptions = pluginContext?.datasourceinstancesettings?.json

  return {
    Instance: {
      URL: pluginContext.datasourceinstancesettings.url,
      BasicAuthEnabled: pluginContext.datasourceinstancesettings.basicAuthEnabled,
      DecryptedSecureJSONData: pluginContext.datasourceinstancesettings.decryptedSecureJsonData,
      BasicAuthUser: pluginContext.datasourceinstancesettings.basicAuthUser,
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
  logger.info("createQuery options", options, target)
  const queryModel = new SqlQuery(target.query, null, {
    range: {
      from: request.from || '1721024406',
      to: request.to || '2721024406',
    }, interval: target.interval
  });

  logger.info("createQuery queryModel", queryModel.replace)
  const stmt = queryModel.replace({
    range: {
      from: request.from || '1721024406',
      to: request.to || '2721024406',
    },
    interval: target.interval
  }, []);

  logger.info("createQuery queryModel after")
  let keys = [];

  try {
    let queryAST = new Scanner(stmt).toAST();
    keys = queryAST['group by'] || [];
  } catch (err) {
    logger.error('AST parser error: ', err);
  }

  return {
    keys: keys,
    requestId: options.panelId + target.refId,
    stmt: stmt,
  };
}
