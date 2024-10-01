// @ts-nocheck
import {parseValue} from "./parser";
import {logger} from '@grafana/ts-backend';

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

          logger.info('Row', row, timestampFieldName)
          timeStampDataFieldMap[frameName].push(new Date(Number(row[timestampFieldName] + '000')));
          valueDataFieldMap[frameName].points.push(
            parseValue(fieldName, fieldType, 'UTC', fieldValue, false)
          );
        }
      });
    } else {
      const seriesFromMacrosRE = /Array\(Tuple\(([^,]+), ([^)]+)\)\)/;

      for (const [fieldName, fieldValue] of Object.entries(row)) {
        if (fieldName !== timestampFieldName) {
          if (seriesFromMacrosRE.test(metaTypes[fieldName])) {
            const matches = metaTypes[fieldName].matchAll(seriesFromMacrosRE);
            for (const match of matches) {
              const labelType = match[1];
              const valueType = match[2];

              if (Array.isArray(fieldValue)) {
                for (const array of fieldValue) {
                  if (Array.isArray(array)) {
                    const tsName = parseValue(fieldName, labelType, 'UTC', array[0], true);
                    let tsNameString = "null";

                    if (typeof tsName === 'string') {
                      tsNameString = tsName || "null";
                    } else if (typeof tsName === 'object' && tsName !== null && 'toString' in tsName) {
                      tsNameString = tsName.toString() || "null";
                    }

                    if (!valueDataFieldMap[frameName]) {
                      valueDataFieldMap[frameName] = {
                        points: []
                      }
                    }

                    if (!framesMap.hasOwnProperty(frameName)) {
                      framesMap[frameName] = { }
                      if (!timeStampDataFieldMap[frameName]) {
                        timeStampDataFieldMap[frameName] = []
                      }

                      framesMap[frameName].refId = refId;
                    }

                    logger.info('Row', row, timestampFieldName)
                    timeStampDataFieldMap[frameName].push(new Date(row[timestampFieldName]));
                    valueDataFieldMap[frameName].points.push(
                      parseValue(fieldName, metaTypes[fieldName], 'UTC', array[1], false)
                    );

                  } else {
                    throw new Error(`Unable to parse data section type=${typeof array} in response json: ${array}`);
                  }
                }
              } else {
                throw new Error(`Unable to parse data section name=${fieldName} type=${typeof fieldValue} in response json: ${fieldValue}`);
              }
            }
          } else {
            const frameName = fieldName;
            if (!valueDataFieldMap[frameName]) {
              valueDataFieldMap[frameName] = {
                points: []
              }
            }

            if (!framesMap.hasOwnProperty(frameName)) {
              framesMap[frameName] = { }
              if (!timeStampDataFieldMap[frameName]) {
                timeStampDataFieldMap[frameName] = []
              }

              framesMap[frameName].refId = refId;
            }

            timeStampDataFieldMap[frameName].push(new Date(row[timestampFieldName]));
            valueDataFieldMap[frameName].points.push(
              parseValue(fieldName, metaTypes[fieldName], 'UTC', 123, false)
            );
          }
        }
      }
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
    // const timestampsProcessed = timestamps[dataFrameKey].map((item, index) => new Date(Number(`${172456834 + index*10}` + `0000000`)))
    const timestampsProcessed = timestamps[dataFrameKey]

    // @ts-ignore
    timeseries.push({
      t: timestampsProcessed,
      [dataFrameKey]: values
    })
  }

  return timeseries
}
