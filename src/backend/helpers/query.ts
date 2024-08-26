import SqlQuery from "../../datasource/sql-query/sql_query";
import Scanner from "../../datasource/scanner/scanner";
import { CHDataSourceOptions } from "../../types/types";
import {logger} from '@grafana/ts-backend';

export const getRequestSettings = (pluginContext: any): any => {
  logger.info("getRequestSettings pluginContext", JSON.stringify( pluginContext?.datasourceinstancesettings));
  const jsonData: CHDataSourceOptions = pluginContext?.datasourceinstancesettings?.json
  const decryptedSecureJsonData = pluginContext?.
    datasourceinstancesettings?.decryptedsecurejsondataMap.reduce((acc: any, [key, value]: [string, string]) => {
      acc[key] = value;
      return acc;
    },{});
  return {
    Instance: {
      URL: pluginContext.datasourceinstancesettings.url,
      BasicAuthEnabled: pluginContext.datasourceinstancesettings.basicAuthEnabled,
      DecryptedSecureJSONData: decryptedSecureJsonData,
      BasicAuthUser: pluginContext.datasourceinstancesettings.basicAuthUser,
    },
    UsePost: jsonData.usePOST || false,
    UseCompression: jsonData.useCompression || false,
    CompressionType: jsonData.compressionType || 'gzip',
    UseYandexCloudAuthorization: jsonData.useYandexCloudAuthorization || false,
    XHeaderUser: jsonData.xHeaderUser || '',
    XHeaderKey: decryptedSecureJsonData.xHeaderKey, // Optional, set as needed
    TLSSkipVerify: true, // Set as needed
  };
};
export const createQuery = (options: any, target: any, request: any) => {
  logger.info("createQuery options", options, target, request)
  const queryModel = new SqlQuery(target.query, null, {
    range: {
      from: request.from || '2013-10-11T00:00:00.000Z',
      to: request.to || '2033-10-11T00:00:00.000Z',
    }, interval: target.interval
  });

  logger.info("createQuery queryModel", queryModel.replace)
  const stmt = queryModel.replace({
    range: {
      from: request.from || '2013-10-11T00:00:00.000Z',
      to: request.to || '2033-10-11T00:00:00.000Z',
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
