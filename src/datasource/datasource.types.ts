export interface RawTimeRange {
  from: any | string;
  to: any | string;
}

export interface TimeRange {
  from: any;
  to: any;
  raw: RawTimeRange;
}
