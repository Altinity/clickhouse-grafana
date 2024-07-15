import {DataService, logger} from '@grafana/ts-backend';
import {ClickhouseClient} from "./helpers/clickhouse-client";
import {transformData} from "./helpers/transform-data";
import {createQuery, getRequestSettings} from "./helpers/query";
import {DataQueryRequest} from "@grafana/data";
import {CHQuery} from "../types/types";

// @ts-ignore
type BackendDataQueryRequest<T> = Omit<DataQueryRequest<T>, "app", "timezone", "scopedVars">;

export class ClickhouseDataService extends DataService<Request, any> {
  constructor() {
    super();
  }

  async QueryData(parameters: any): Promise<any[]> {
    const transformInputToOptions = (options: any): BackendDataQueryRequest<CHQuery> => {

      logger.info("QueryData options", options);
      return {
        requestId: options.refid,
        interval: options.interval,
        intervalMs: options.intervalms,
        maxDataPoints: options.maxdatapoints,
        range: {
          from: options.timerange?.fromepochms || 1421028367,
          to: options.timerange?.toepochms || 2721028367,
          raw: {
            from: options.timerange?.fromepochms || 1421028367,
            to: options.timerange?.toepochms || 2721028367,
          }
        },
        targets: options.targets,
        rangeRaw: {
          from: options.timerange?.fromepochms || 1421028367,
          to: options.timerange?.toepochms || 2721028367,
        },
        startTime: options.timerange?.fromepochms || 1421028367,
        endTime: options.timerange?.toepochms || 2721028367,
        datasourceinstancesettings: options.datasourceinstancesettings,
      }
    }

    const options = transformInputToOptions(parameters);
    const clickhouseClient = new ClickhouseClient(getRequestSettings(parameters));

    const targets = options.targets.filter((target) => !target.hide && target.query);
    const queries = targets.map((target: CHQuery) => {
      target.interval = '30s';

      return createQuery({ interval: target.interval }, target, options)
    });

    if (!queries.length) {
      return Promise.resolve({ data: [] } as any);
    }

    const allQueryPromise = queries.map((query) => {
      return clickhouseClient.query({}, query.stmt + " FORMAT JSON");
    });


    return Promise.all(allQueryPromise).then(results => {
      logger.info("QueryData result", JSON.stringify(results));

      return results.map((result: any) => transformData(result.body))
    });
  }
}
