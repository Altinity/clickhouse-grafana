export function generateQueryForTimestampBackward(
  inputTimestampColumn: string | undefined,
  inputTimestampValue: string,
  where: string[],
  contextWindowSize?: string | number
): string {
  return `SELECT timestamp FROM (
          SELECT
            ${inputTimestampColumn},
            FIRST_VALUE(${inputTimestampColumn}) OVER (ORDER BY ${inputTimestampColumn} ROWS BETWEEN ${
    contextWindowSize || 10
  } PRECEDING AND CURRENT ROW) AS timestamp
          FROM $table
          ${where?.length ? 'WHERE ' + where.join(' ') : ''}
          ORDER BY ${inputTimestampColumn}
        ) WHERE ${inputTimestampColumn} = ${inputTimestampValue}`;
}

export function generateQueryForTimestampForward(
  inputTimestampColumn: string | undefined,
  inputTimestampValue: string,
  where: string[],
  contextWindowSize?: string | number
): string {
  return `SELECT timestamp FROM (
          SELECT
            ${inputTimestampColumn},
            LAST_VALUE(${inputTimestampColumn}) OVER (ORDER BY ${inputTimestampColumn} ROWS BETWEEN CURRENT ROW AND ${
    contextWindowSize || 10
  } FOLLOWING) AS timestamp
          FROM $table
          ${where?.length ? 'WHERE ' + where.join(' ') : ''}
          ORDER BY ${inputTimestampColumn}
        ) WHERE ${inputTimestampColumn} = ${inputTimestampValue}`;
}
