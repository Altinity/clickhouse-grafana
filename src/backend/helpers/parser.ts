// @ts-nocheck
const datePrefix = "Date";
const dateTimePrefix = "DateTime";
const dateTime64Prefix = "DateTime64";
const timeZonePrefix = "('";
const timeZone64Separator = ",";
const dateTZPrefix = datePrefix + timeZonePrefix;
const dateTimeTZPrefix = dateTimePrefix + timeZonePrefix;
const dateTime64TZPrefix = dateTime64Prefix + timeZonePrefix;

const dateLayout = "yyyy-MM-dd";
const dateTimeLayout = `${dateLayout} HH:mm:ss`;
const dateTime64Layout3 = `${dateTimeLayout}.SSS`;
const dateTime64Layout6 = `${dateTimeLayout}.SSSSSS`;

const dateTimeTypeRE = /(Date\([^)]+\)|DateTime\([^)]+\)|DateTime64\([^)]+\))/;

function parseTimeZone(tz) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone;
  } catch (err) {
    return "UTC";
  }
}

function extractTimeZoneNameFromFieldType(fieldType) {
  let tz = "";
  if (fieldType.startsWith(dateTZPrefix)) {
    tz = fieldType.slice(dateTZPrefix.length + 1, -2);
  } else if (fieldType.startsWith(dateTimeTZPrefix)) {
    tz = fieldType.slice(dateTimeTZPrefix.length + 1, -2);
  } else if (fieldType.startsWith(dateTime64TZPrefix) && fieldType.includes(timeZone64Separator)) {
    tz = fieldType.slice(fieldType.indexOf(timeZone64Separator) + 3, -2);
  } else if (dateTimeTypeRE.test(fieldType)) {
    const matches = fieldType.match(dateTimeTypeRE);
    if (matches.length > 0) {
      return extractTimeZoneNameFromFieldType(matches[0]);
    }
  }
  return tz.trim();
}

function fetchTimeZoneFromFieldType(fieldType, tzFromServer) {
  const tz = extractTimeZoneNameFromFieldType(fieldType);
  return tz !== "" ? parseTimeZone(tz) : tzFromServer;
}

function newDataFieldByType(fieldName, fieldType) {
  if (fieldType.startsWith("LowCardinality")) {
    fieldType = fieldType.slice("LowCardinality(".length, -1);
  }

  const isNullable = fieldType.includes("Nullable");
  fieldType = fieldType.replace("Nullable(", "").replace(")", "");

  switch (fieldType) {
    case "String":
    case "UUID":
    case "IPv6":
    case "IPv4":
      return newStringField(fieldName, isNullable);
    case "UInt8":
    case "UInt16":
    case "UInt32":
    case "Int8":
    case "Int16":
    case "Int32":
    case "Float32":
    case "Float64":
      return newFloat64Field(fieldName, isNullable);
    case "UInt64":
      if (fieldName === "t" && !isNullable) {
        return newTimeField(fieldName, false);
      }
      return isNullable ? [] : [];
    case "Int64":
      return isNullable ? [] : [];
    default:
      if (fieldType.startsWith("Decimal")) {
        return newFloat64Field(fieldName, isNullable);
      } else if (fieldType.startsWith("FixedString") || fieldType.startsWith("Enum")) {
        return newStringField(fieldName, isNullable);
      } else if (fieldType.startsWith(dateTime64Prefix) || fieldType.startsWith(dateTimePrefix) || fieldType.startsWith(datePrefix)) {
        return newTimeField(fieldName, isNullable);
      } else {
        return newStringField(fieldName, isNullable);
      }
  }
}

function newTimeField(fieldName, isNullable) {
  return isNullable ? [] : [];
}

function newFloat64Field(fieldName, isNullable) {
  return isNullable ? [] : [];
}

function newStringField(fieldName, isNullable) {
  return isNullable ? [] : [];
}

function parseFloatValue(value, isNullable) {
  if (value != null) {
    const floatValue = parseFloat(value);
    return isNullable ? floatValue : floatValue;
  }
  return isNullable ? null : 0.0;
}

function parseStringValue(value, isNullable) {
  if (value != null) {
    const stringValue = String(value);
    return isNullable ? stringValue : stringValue;
  }
  return isNullable ? null : "";
}

function parseMapValue(value, isNullable) {
  if (value instanceof Object) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return null;
    }
  }
  return isNullable ? null : "";
}

function parseUInt64Value(value, isNullable) {
  if (value != null) {
    const uint64Value = BigInt(value);
    return isNullable ? uint64Value : uint64Value;
  }
  return isNullable ? null : BigInt(0);
}

function parseInt64Value(value, isNullable) {
  if (value != null) {
    const int64Value = BigInt(value);
    return isNullable ? int64Value : int64Value;
  }
  return isNullable ? null : BigInt(0);
}

function parseTimestampValue(value, isNullable) {
  if (value != null) {
    const intValue = BigInt(value);
    const timeValue = new Date(Number(intValue));
    return isNullable ? timeValue : timeValue;
  }
  return isNullable ? null : new Date(0);
}

function parseDateTimeValue(value, layout, timezone, isNullable) {
  if (value != null) {
    const dateTimeValue = new Date(`${value} ${timezone}`);
    return isNullable ? dateTimeValue : dateTimeValue;
  }
  return isNullable ? null : new Date(0);
}

export const parseValue = (fieldName, fieldType, tz, value, isNullable) => {
  if (fieldType.startsWith("Nullable")) {
    return parseValue(fieldName, fieldType.slice("Nullable(".length, -1), tz, value, true);
  } else if (fieldType.startsWith("LowCardinality")) {
    return parseValue(fieldName, fieldType.slice("LowCardinality(".length, -1), tz, value, isNullable);
  } else if (fieldType.startsWith("Map(") && fieldType.endsWith(")")) {
    return parseMapValue(value, isNullable);
  } else {
    switch (fieldType) {
      case "String":
      case "UUID":
      case "IPv4":
      case "IPv6":
        return parseStringValue(value, isNullable);
      case "UInt8":
      case "UInt16":
      case "UInt32":
      case "Int8":
      case "Int16":
      case "Int32":
      case "Float32":
      case "Float64":
        return parseFloatValue(value, isNullable);
      case "UInt64":
        if (fieldName === "t") {
          return parseTimestampValue(value, isNullable);
        }
        return parseUInt64Value(value, isNullable);
      case "Int64":
        if (fieldName === "t") {
          return parseTimestampValue(value, isNullable);
        }
        return parseInt64Value(value, isNullable);
      default:
        if (fieldType.startsWith("Decimal")) {
          return parseFloatValue(value, isNullable);
        } else if (fieldType.startsWith("FixedString") || fieldType.startsWith("Enum")) {
          return parseStringValue(value, isNullable);
        } else if (fieldType.startsWith(dateTime64Prefix) && fieldType.includes("3")) {
          return parseDateTimeValue(value, dateTime64Layout3, tz, isNullable);
        } else if (fieldType.startsWith(dateTime64Prefix) && fieldType.includes("6")) {
          return parseDateTimeValue(value, dateTime64Layout6, tz, isNullable);
        } else if (fieldType.startsWith(dateTimePrefix)) {
          return parseDateTimeValue(value, dateTimeLayout, tz, isNullable);
        } else if (fieldType.startsWith(datePrefix)) {
          return parseDateTimeValue(value, dateLayout, tz, isNullable);
        } else {
          console.warn(`Value [${value}] has compound type [${fieldType}] and will be returned as string`);

          try {
            const byteValue = JSON.stringify(value);
            return parseStringValue(byteValue, isNullable);
          } catch (err) {
            console.warn(`Unable to append value of unknown type ${typeof value} because of JSON encoding problem: ${err}`);
            return null;
          }
        }
    }
  }
}
