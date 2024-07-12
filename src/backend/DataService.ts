import { DataService } from '@grafana/ts-backend';
import { ClickhouseClient } from "./helpers/clickhouse-client";
import { transformData } from "./helpers/transform-data";
import { createQuery, getRequestSettings } from "./helpers/query";

interface User {
  login: string;
  name: string;
  email: string;
  role: string;
}

interface DatasourceInstanceSettings {
  id: number;
  name: string;
  url: string;
  user: string;
  database: string;
  basicauthenabled: boolean;
  basicauthuser: string;
  jsondata: string;
  decryptedsecurejsondataMap: [string, string][];
  lastupdatedms: number;
  uid: string;
}

interface PluginContext {
  orgid: number;
  pluginid: string;
  user: User;
  datasourceinstancesettings: DatasourceInstanceSettings;
}

interface Header {
  key: string;
  value: string;
}

interface TimeRange {
  fromepochms: number;
  toepochms: number;
}

interface Query {
  refid: string;
  maxdatapoints: number;
  intervalms: number;
  interval: string;
  timerange: TimeRange;
  json: string;
  querytype: string;
}

interface Request {
  plugincontext: PluginContext;
  headersMap: Header[];
  queriesList: Query[];
}

export class TemplateDataService extends DataService<Request, any> {
  constructor() {
    super();
  }

  async QueryData(request: any, pluginContext: any): Promise<any[]> {
    const target = request.queriesList[0];

    target.interval = '30s';

    const newQuery = createQuery({ interval: target.interval }, target, request);

    const clickhouseClient = new ClickhouseClient(getRequestSettings(pluginContext));

    const result = await clickhouseClient.query({}, newQuery.stmt + " FORMAT JSON");

    return transformData(result.body);
  }
}
