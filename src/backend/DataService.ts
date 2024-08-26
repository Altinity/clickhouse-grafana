import {DataService, logger} from '@grafana/ts-backend';
import {ClickhouseClient} from "./helpers/clickhouse-client";
import {transformData} from "./helpers/transform-data";
import {createQuery, getRequestSettings} from "./helpers/query";
import {DataQueryRequest} from "@grafana/data";
import {CHQuery} from "../types/types";
import {transformResponse} from "./helpers/transform-to-timeseries";

// @ts-ignore
type BackendDataQueryRequest<T> = Omit<DataQueryRequest<T>, "app", "timezone", "scopedVars">;

export class ClickhouseDataService extends DataService<Request, any> {
  constructor() {
    super();
  }

  async QueryData(parameters: any): Promise<any[]> {
    logger.info('QueryData', 1)
    const transformInputToOptions = (options: any): BackendDataQueryRequest<CHQuery> => {

      logger.info("QueryData options", JSON.stringify(options), options.timerange);
      return {
        requestId: options.refid,
        interval: options.interval,
        intervalMs: options.intervalms,
        maxDataPoints: options.maxdatapoints,
        range: {
          from: new Date(options.targets[0].timerange.fromepochms),
          to: new Date(options.targets[0].timerange.toepochms),
          raw: {
            from: options.targets[0].timerange.fromepochms,
            to: options.targets[0].timerange.toepochms,
          }
        },
        targets: options.targets,
        rangeRaw: {
          from: new Date(options.targets[0].timerange.fromepochms),
          to: new Date(options.targets[0].timerange.toepochms),
        },
        startTime: new Date(options.targets[0].timerange.fromepochms),
        endTime: new Date(options.targets[0].timerange.toepochms),
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

    logger.info('QueryData', 2)

    if (!queries.length) {
      return Promise.resolve({ data: [] } as any);
    }

    const allQueryPromise = queries.map((query) => {
      return clickhouseClient.query({}, query.stmt + " FORMAT JSON");
    });

    logger.info('QueryData', 3)

    const results = await Promise.all(allQueryPromise);
    logger.info("QueryData result", JSON.stringify(results));

    const dataFrames = results.map((result: any, index: number) => transformData(result.body, targets[index].refid))

    logger.info('QueryData',4)

    logger.info('Data Frames', JSON.stringify(dataFrames), targets.map((target: any) => target.refid));

    // return dataFrames

    logger.info('TRANS', transformResponse(results[0].body))
    return transformResponse(results[0].body)
  }
}
