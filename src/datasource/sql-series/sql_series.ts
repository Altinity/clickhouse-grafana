import {toAnnotation} from "./toAnnotation";
import {toFlamegraph} from "./toFlamegraph";
import {toLogs} from "./toLogs";
import {toTable} from "./toTable";
import {toTimeSeries} from "./toTimeSeries";
import {toTraces} from "./toTraces";

export interface Field {
  name: string;
  type: string;
  values: Array<string | number | null | object>;
  config: Record<string, unknown>;
}

export default class SqlSeries {
  refId: string;
  series: any;
  keys: any;
  meta: any[];
  tillNow: any;
  from: any;
  to: any;

  /** @ngInject */
  constructor(options: any) {
    this.refId = options.refId;
    this.series = options.series;
    this.meta = options.meta;
    this.tillNow = options.tillNow;
    this.from = options.from;
    this.to = options.to;
    this.keys = options.keys || [];
  }

  toAnnotation = (input: any): any[] => {
    return toAnnotation(input);
  }

  toFlamegraph = (): any => {
    return toFlamegraph(this.series);
  }

  toLogs = (): any => {
    const self = this;
    return toLogs(self);
  }

  toTable = (): any => {
    let self = this;
    return toTable(self);
  }

  toTimeSeries = (extrapolate = true): any => {
    let self = this;
    return toTimeSeries(extrapolate, self)
  }

  toTraces = (): any => {
    return toTraces(this.series);
  }
}
