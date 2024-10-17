import {Alert, InlineField, InlineLabel, InlineSwitch, Select} from "@grafana/ui";
import React, {useEffect, useState} from "react";
import {getOptions, getSettings} from "./DefaultValues.api";
import {TimestampFormat} from "../../../../types/types";

const TIME_RELATED_COLUMNS_QUERY =
  "SELECT name,database,table,type FROM system.columns WHERE type LIKE '%Date%' OR type LIKE '%DateTime%' OR type = 'UInt32' ORDER BY type,name FORMAT JSON";

export const DefaultValues = ({
jsonData, newOptions, onSwitchToggle, onFieldChange, externalProps
}: {jsonData: any, onSwitchToggle: any, newOptions: any, onFieldChange: any, externalProps: any}) => {
  const [defaultDateTime64Options, setDefaultDateTime64Options] = useState<any[]>([]);
  const [defaultDateTimeOptions, setDefaultDateTimeOptions] = useState<any[]>([]);
  const [defaultUint32Options, setDefaultUint32Options] = useState<any[]>([]);
  const [defaultDateDate32Options, setDefaultDateDate32Options] = useState<any[]>([]);

  useEffect(() => {
    const doRequest = async () => {
      if (
        newOptions.version === 1 ||
        !jsonData.useDefaultConfiguration ||
        (!jsonData.dataSourceUrl.startsWith('http://') &&
        !jsonData.dataSourceUrl.startsWith('https://'))
      ) {
       return;
      }

      try {
        // Ensure newOptions and newOptions.uid are defined
        if (!newOptions || !newOptions.uid) {
          return;
        }
        const dashboardUID = newOptions.uid;

        // Fetch settings
        const response = await getSettings();
        if (!response || !response.datasources) {
          return;
        }

        // Find the current datasource
        const currentDatasource: { basicAuth: String } = Object.values(response.datasources).find(
          (datasource: any) => datasource?.uid === dashboardUID
        ) as { basicAuth: String };

        if (!currentDatasource) {
          return;
        }

        // Set basicAuth if applicable
        const basicAuth = currentDatasource.basicAuth;
        newOptions.basicAuth = newOptions.basicAuth ? basicAuth : newOptions.basicAuth;

        // Fetch options columns
        const columns = await getOptions(TIME_RELATED_COLUMNS_QUERY, jsonData.dataSourceUrl, newOptions);
        if (!columns || !Array.isArray(columns.data)) {
          return;
        }

        // Group columns by type
        const groupedByType = columns.data.reduce((acc, item) => {
          if (!item || !item.type || !item.name) {
            return acc;
          }
          let typeKey: string = item.type;
          if (typeKey.startsWith('Nullable(')) {
            typeKey = typeKey.slice('Nullable('.length);
            typeKey = typeKey.slice(0, -')'.length);
          }
          if (typeKey.startsWith('DateTime64(')) {
            typeKey = 'DateTime64';
          }
          if (typeKey.startsWith('DateTime(')) {
            typeKey = 'DateTime';
          }
          acc[typeKey] = acc[typeKey] || [];
          acc[typeKey].push(item.name);
          return acc;
        }, {});

        // Function to transform columns into options
        const transformDataToOptions = (dataArray) => {
          if (!Array.isArray(dataArray)) {
            return [];
          }
          const uniqueItems = [...new Set(dataArray)];
          return uniqueItems.map((item) => ({ label: item, value: item }));
        };

        // Set default options, ensuring the grouped columns exists
        setDefaultDateTime64Options(transformDataToOptions(groupedByType['DateTime64'] || []));
        setDefaultDateDate32Options(transformDataToOptions(groupedByType['Date'] || []));
        setDefaultUint32Options(transformDataToOptions(groupedByType['UInt32'] || []));
        setDefaultDateTimeOptions(transformDataToOptions(groupedByType['DateTime'] || []));
      } catch (e) {
        setDefaultUint32Options([])
        setDefaultDateTimeOptions([])
        setDefaultDateTime64Options([])
        setDefaultDateDate32Options([])
      }
    }

    doRequest()
  }, [jsonData.dataSourceUrl, jsonData.useDefaultConfiguration, newOptions]);

  return (
    <div className="gf-form-group">
      <InlineField label="Use default values" labelWidth={36}>
        <InlineSwitch
          id="useDefaultConfiguration"
          className="gf-form"
          value={jsonData.useDefaultConfiguration || false}
          onChange={(e) => onSwitchToggle('useDefaultConfiguration', e.currentTarget.checked)}
        />
      </InlineField>
      {jsonData.useDefaultConfiguration && (
        <>
          {newOptions.version === 1 && (
            <Alert
              title={`Please save data source before use default configurations, 
        we need configured clickhouse connection to fetch options`}
              severity={'info'}
              key={'info'}
            />
          )}
          <h6>TimestampType</h6>
          <InlineField
            labelWidth={32}
            style={{ marginLeft: '30px' }}
            label={
              <InlineLabel
                width={32}
                tooltip={
                  <div style={{ width: '200px', backgroundColor: 'black' }}>
                    Select Type &nbsp;
                    <a
                      href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime/"
                      rel="noreferrer"
                      target="_blank"
                    >
                      DateTime
                    </a>
                    ,&nbsp;
                    <a
                      href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime64/"
                      rel="noreferrer"
                      target="_blank"
                    >
                      DateTime64
                    </a>
                    &nbsp; or{' '}
                    <a
                      href="https://clickhouse.com/docs/en/sql-reference/data-types/int-uint/"
                      rel="noreferrer"
                      target="_blank"
                    >
                      UInt32
                    </a>{' '}
                    column for binding with Grafana range selector
                  </div>
                }
              >
                Column timestamp type
              </InlineLabel>
            }
          >
            <Select
              width={24}
              onChange={(changeEvent) => {
                onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTimeType');
              }}
              isClearable
              placeholder={'Timestamp type'}
              options={[
                { label: 'DateTime', value: TimestampFormat.DateTime },
                { label: 'DateTime64', value: TimestampFormat.DateTime64 },
                { label: 'TimeStamp', value: TimestampFormat.TimeStamp },
              ]}
              value={jsonData.defaultDateTimeType}
            />
          </InlineField>
          <h6>DateTime columns</h6>
          <InlineField label="Datetime Field" labelWidth={32} style={{ marginLeft: '30px' }}>
            <Select
              isClearable
              id="defaultDateTime"
              allowCustomValue={false}
              width={24}
              value={jsonData.defaultDateTime}
              onChange={(changeEvent) => {
                onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTime');
              }}
              options={defaultDateTimeOptions}
            />
          </InlineField>
          <InlineField label="Timestamp (Uint32) Field" labelWidth={32} style={{ marginLeft: '30px' }}>
            <Select
              isClearable
              id="defaultUint32"
              allowCustomValue={false}
              width={24}
              value={jsonData.defaultUint32}
              onChange={(changeEvent) => {
                onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultUint32');
              }}
              options={defaultUint32Options}
            />
          </InlineField>
          <InlineField label="Datetime64 Field" labelWidth={32} style={{ marginLeft: '30px' }}>
            <Select
              isClearable
              id="defaultDateTime64"
              allowCustomValue={false}
              width={24}
              value={jsonData.defaultDateTime64}
              onChange={(changeEvent) => {
                onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTime64');
              }}
              options={defaultDateTime64Options}
            />
          </InlineField>
          <h6>Date column</h6>
          <InlineField label="Date Field" labelWidth={32} style={{ marginLeft: '30px' }}>
            <Select
              isClearable
              id="defaultDateDate32"
              allowCustomValue={false}
              width={24}
              value={jsonData.defaultDateDate32}
              onChange={(changeEvent) => {
                onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateDate32');
              }}
              options={defaultDateDate32Options}
            />
          </InlineField>
        </>
      )}
    </div>
  );
}
