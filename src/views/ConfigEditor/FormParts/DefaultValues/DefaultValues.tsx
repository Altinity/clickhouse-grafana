import {InlineField, InlineLabel, InlineSwitch, Select} from "@grafana/ui";
import React, {useEffect, useState} from "react";
import {getOptions} from "./DefaultValues.api";
import {TimestampFormat} from "../../../../types/types";
const TABLES_QUERY = "SELECT name,database,table,type FROM system.columns WHERE type LIKE 'Date32%'  OR type LIKE 'DateTime64%' OR type = 'UInt32' OR match(type,'^DateTime$|^DateTime\\\\([^)]+\\\\)$')  OR match(type,'^Date$|^Date\\([^)]+\\)$') ORDER BY type,name FORMAT JSON";

export const DefaultValues = ({
jsonData, onSwitchToggle, onFieldChange, externalProps
}: {jsonData: any, onSwitchToggle: any, onFieldChange: any, externalProps: any}) => {
  const [defaultDateTime64Options, setDefaultDateTime64Options] = useState<any[]>([]);
  const [defaultDateTimeOptions, setDefaultDateTimeOptions] = useState<any[]>([]);
  const [defaultUint32Options, setDefaultUint32Options] = useState<any[]>([]);
  const [defaultDateDate32Options, setDefaultDateDate32Options] = useState<any[]>([]);

  useEffect(() => {
    const doRequest = async () => {
      try {
        const data = await getOptions(TABLES_QUERY, jsonData.dataSourceUrl)

        const groupedByType = data?.data?.reduce((acc, item) => {
          // If the type is not yet a key in the accumulator, add it
          if (!acc[item.type]) {
            acc[item.type] = [];
          }
          // Append the current item to the array for its type
          // Save only name because we already know type
          acc[item.type].push(item.name);
          return acc;
        }, {});

        const transformDataToOptions = (data: any): any[] => {
          const dataSetList = Array.from(new Set(data));
          return dataSetList.map((item: any) => ({label: item, value: item}));
        }

        setDefaultDateTime64Options(transformDataToOptions(groupedByType['DateTime64']));
        setDefaultDateDate32Options(transformDataToOptions(groupedByType['Date']));
        setDefaultUint32Options(transformDataToOptions(groupedByType['UInt32']));
        setDefaultDateTimeOptions(transformDataToOptions(groupedByType['DateTime']));
      } catch (e) {
        setDefaultUint32Options([])
        setDefaultDateTimeOptions([])
        setDefaultDateTime64Options([])
        setDefaultDateDate32Options([])
      }
    }

    doRequest()
  }, [jsonData.dataSourceUrl]);

  return <div className="gf-form-group">
    <InlineField
      label="Use default values"
      labelWidth={36}
    >
      <InlineSwitch
        id="useDefaultConfiguration"
        className="gf-form"
        value={jsonData.useDefaultConfiguration || false}
        onChange={(e) => onSwitchToggle('useDefaultConfiguration', e.currentTarget.checked)}
      />
    </InlineField>
    {jsonData.useDefaultConfiguration && <>
      <h6>TimestampType</h6>
      <InlineField
        labelWidth={32}
        style={{marginLeft: '30px'}}
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
            onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTimeType')
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
      <InlineField
        label="Datetime Field"
        labelWidth={32}
        style={{marginLeft: '30px'}}
      >
        <Select
          isClearable
          id="defaultDateTime"
          allowCustomValue={false}
          width={24}
          value={jsonData.defaultDateTime}
          onChange={(changeEvent) => {
            onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTime')
          }}
          options={defaultDateTimeOptions}
        />
      </InlineField>
      <InlineField
        label="Timestamp (Uint32) Field"
        labelWidth={32}
        style={{marginLeft: '30px'}}
      >
        <Select
          isClearable
          id="defaultUint32"
          allowCustomValue={false}
          width={24}
          value={jsonData.defaultUint32}
          onChange={(changeEvent) => {
            onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultUint32')
          }}
          options={defaultUint32Options}
        />
      </InlineField>
      <InlineField
        label="Datetime64 Field"
        labelWidth={32}
        style={{marginLeft: '30px'}}
      >
        <Select
          isClearable
          id="defaultDateTime64"
          allowCustomValue={false}
          width={24}
          value={jsonData.defaultDateTime64}
          onChange={(changeEvent) => {
            onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateTime64')
          }}
          options={defaultDateTime64Options}
        />
      </InlineField>
      <h6>Date column</h6>
      <InlineField
        label="Date Field"
        labelWidth={32}
        style={{marginLeft: '30px'}}
      >
        <Select
          isClearable
          id="defaultDateDate32"
          allowCustomValue={false}
          width={24}
          value={jsonData.defaultDateDate32}
          onChange={(changeEvent) => {
            onFieldChange({ value: changeEvent ? changeEvent.value : undefined }, 'defaultDateDate32')
          }}
          options={defaultDateDate32Options}
        />
      </InlineField>
    </>}
  </div>
}
