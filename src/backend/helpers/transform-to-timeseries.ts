// @ts-nocheck
import {parseValue} from "./parser";
import {logger} from "../../../../grafana-plugin-sdk-typescript3";

const complexTypeRE = /Array|Tuple|Map/;
const labelTypeRE = /String|UUID|Enum|IPv4|IPv6/;

class Response {
  constructor(meta, ctx) {
    this.meta = meta;
    this.ctx = ctx;
  }

  prepareLabelFieldsMap() {
    const labelTypesMap = {};
    this.meta.forEach((field, idx) => {
      if (this.isLabelType(field.type)) {
        labelTypesMap[field.name] = idx;
      }
    });
    return { labelTypesMap, hasLabels: Object.keys(labelTypesMap).length > 0 };
  }

  isLabelType(fieldType) {
    return labelTypeRE.test(fieldType) && !complexTypeRE.test(fieldType);
  }

  getTimestampFieldIdx() {
    for (let idx = 0; idx < this.meta.length; idx++) {
      const field = this.meta[idx];
      if (field.type.startsWith("DateTime") || (field.name === "t" && field.type.includes("Int"))) {
        return { idx, found: true };
      }
    }
    return { idx: -1, found: false };
  }

  generateFrameNameByLabels(row, metaTypes, labelFieldsMap) {
    let frameName = "";
    const srow = Object.keys(row).sort();
    srow.forEach(fieldName => {
      if (labelFieldsMap.hasOwnProperty(fieldName)) {
        const fieldType = metaTypes[fieldName];
        frameName += `${this.parseValue(fieldName, fieldType, null, row[fieldName], false)}, `;
      }
    });
    if (frameName) {
      frameName = frameName.slice(0, -2);
    }
    return frameName;
  }

  generateFrameLabelsByLabels(row, metaTypes, labelFieldsMap) {
    const labels = {};
    Object.entries(row).forEach(([fieldName, fieldValue]) => {
      if (labelFieldsMap.hasOwnProperty(fieldName)) {
        const fieldType = metaTypes[fieldName];
        labels[fieldName] = `${this.parseValue(fieldName, fieldType, null, fieldValue, false)}`;
      }
    });
    return labels;
  }

  analyzeResponseMeta(fetchTZ) {
    // const serverTZ = fetchTZ(this.ctx);
    const serverTZ = null;
    const timeZonesMap = {};
    const metaTypes = {};

    this.meta.forEach(meta => {
      metaTypes[meta.name] = meta.type;
      if (meta.type.includes("Date")) {
        timeZonesMap[meta.name] = this.fetchTimeZoneFromFieldType(meta.type, serverTZ);
      }
    });

    return { timeZonesMap, metaTypes };
  }

  parseValue(fieldName, fieldType, someArg, fieldValue, anotherArg) {
    // Implementation of ParseValue in JavaScript
    // Placeholder: Replace with the actual logic for ParseValue
    return fieldValue;
  }

  fetchTimeZoneFromFieldType(fieldType, serverTZ) {
    // Implementation of fetchTimeZoneFromFieldType in JavaScript
    // Placeholder: Replace with the actual logic to determine timezone based on fieldType and serverTZ
    return serverTZ;
  }
}




export const transformResponse = (response, refId) => {

  const resp = new Response(response.meta)
  const { labelTypesMap, hasLabels } = resp.prepareLabelFieldsMap();
  const {idx, found} = resp.getTimestampFieldIdx();

  logger.info(resp, labelTypesMap, idx)

  const timeStampDataFieldMap = {};
  const valueDataFieldMap = {}
  response.data.forEach(row => {
    const timestampFieldName = response.meta[idx].name;
    const timestampFieldType = response.meta[idx].type;
    const {metaTypes} = resp.analyzeResponseMeta('UTC')
    const framesMap = {};

    const value = parseValue(
      timestampFieldName,
      timestampFieldType,
      // r.timeZonesMap[timestampFieldName],
      'UTC',
      row[timestampFieldName],
      false
    );

    if (!(value instanceof Date)) {
      throw new Error(`Unexpected type from parseValue of field ${timestampFieldName}. Expected Date, got ${typeof value}`);
    }

    logger.info('Labels', hasLabels, labelTypesMap)
    if (hasLabels) {
      const framePrefix = resp.generateFrameNameByLabels(row, metaTypes, labelTypesMap);
      const frameLabels = resp.generateFrameLabelsByLabels(row, metaTypes, labelTypesMap);

      Object.entries(row).forEach(([fieldName, fieldValue]) => {
        const fieldType = metaTypes[fieldName];
        const isLabel = labelTypesMap.hasOwnProperty(fieldName);
        if (fieldName !== timestampFieldName && !isLabel) {
          let frameName = framePrefix;
          if (true) {
            frameName += `, ${fieldName}`;
          }
          if (!valueDataFieldMap[frameName]) {
            valueDataFieldMap[frameName] = {
              labels: frameLabels,
              points: []
            }
          } else {
            valueDataFieldMap[frameName].labels = frameLabels;
          }

          if (!framesMap.hasOwnProperty(frameName)) {
            framesMap[frameName] = { }
            if (!timeStampDataFieldMap[frameName]) {
              timeStampDataFieldMap[frameName] = []
            }

            framesMap[frameName].refId = refId;
          }

          console.log(valueDataFieldMap, parseValue(fieldName, fieldType, 'UTC', fieldValue, false))
          timeStampDataFieldMap[frameName].push(new Date(123));
          valueDataFieldMap[frameName].points.push(
            parseValue(fieldName, fieldType, 'UTC', fieldValue, false)
          );
        }
      });
    }
  });

  logger.info('Data processed', timeStampDataFieldMap, valueDataFieldMap)

  const timestamps = timeStampDataFieldMap;
  const valuesInput = valueDataFieldMap;
  const dataFrames = Object.keys(valueDataFieldMap)
  const timeseries = []

  for (const dataFrameKey of dataFrames) {
    const dataFrame= valuesInput[dataFrameKey]
    const values = dataFrame.points.map(item => Number(item))
    const timestamps2 = timestamps[dataFrameKey].map((item, index) => new Date(Number(`${172456834 + index*10}` + `0000000`)))

    // @ts-ignore
    timeseries.push({
      t: timestamps2,
      [dataFrameKey]: values
    })
  }

  return timeseries
}
