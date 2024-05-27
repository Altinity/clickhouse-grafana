import React from 'react';
import {InlineField, InlineFieldRow, InlineLabel, Select} from '@grafana/ui';
import {SelectableValue} from '@grafana/data';
import {UniversalSelectField} from './components/UniversalSelectComponent';
import {TimestampFormat} from "../../../../types/types";
import {useConnectionData} from "./components/useConnectionData";


const options = [
  { label: 'DateTime', value: TimestampFormat.DateTime },
  { label: 'DateTime64', value: TimestampFormat.DateTime64 },
  { label: 'TimeStamp', value: TimestampFormat.TimeStamp },
];

export const QueryBuilder = ({ query, onRunQuery, onChange, datasource }: any) => {
  const [databases, tables, dateColumns, timestampColumns, selectedColumnTimestampType, selectedColumnDateType, setSelectedDatabase, setSelectedTable, setSelectedColumnTimestampType, setSelectedColumnDateType, setSelectedDateTimeType, selectedTable, selectedDatabase, selectedDateTimeType] =  useConnectionData(query, datasource)


  useEffect(() => {
    setSelectedDatabase(query.database);
    setSelectedTable(query.table);
    setSelectedColumnTimestampType(query.dateTimeColDataType);
    setSelectedColumnDateType(query.dateColDataType);
    setSelectedDateTimeType(query.dateTimeType);
  }, [query.database, query.dateColDataType, query.dateTimeColDataType, query.dateTimeType, query.table, setSelectedColumnDateType, setSelectedColumnTimestampType, setSelectedDatabase, setSelectedDateTimeType, setSelectedTable]);

  const onDateTimeTypeChanged = (dateTimeType: SelectableValue) => {
    const value = dateTimeType?.value ? dateTimeType.value : undefined;
    setSelectedDateTimeType(value);
    onChange({...query, dateTimeType: value});
  };

  const onDatabaseChange = (database?: string) => {
    setSelectedDatabase(database);
    onChange({...query, database});
  };

  const onTableChange = (table?: string) => {
    setSelectedTable(table);
    onChange({...query, table});
  };

  const onDateColDataTypeChange = (dateColDataType?: string) => {
    // @ts-ignore
    setSelectedColumnDateType((dateColDataType || '').trim());
    onChange({...query, dateColDataType});
  };

  const onDateTimeColDataTypeChange = (dateTimeColDataType?: string) => {
    // @ts-ignore
    setSelectedColumnTimestampType((dateTimeColDataType || '').trim());
    onChange({...query, dateTimeColDataType});
  };

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
      <InlineFieldRow>
        <UniversalSelectField
          width={24}
          label={<InlineLabel width={24} >
            <span style={{ color: '#6e9fff' }}>FROM</span>
          </InlineLabel>}
          placeholder="Database"
          value={selectedDatabase}
          onChange={(item: SelectableValue<string>) => onDatabaseChange(item.value)}
          options={databases}
        />
        <UniversalSelectField
          width={24}
          placeholder="Table"
          value={selectedTable}
          onChange={(selectedItem: SelectableValue<string>) => onTableChange(selectedItem.value)}
          options={tables}
          disabled={true}
        />
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField
          label={
            <InlineLabel
              width={24}
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
            onChange={onDateTimeTypeChanged}
            isClearable
            placeholder={'Timestamp type'}
            options={options}
            value={selectedDateTimeType}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <UniversalSelectField
          width={24}
          label={<InlineLabel width={24}>Timestamp Column</InlineLabel>}
          placeholder="Timestamp column"
          value={selectedColumnTimestampType}
          onChange={({ value }) => onDateTimeColDataTypeChange(value as string)}
          options={timestampColumns}
          disabled={!timestampColumns.length}
        />
      </InlineFieldRow>
      <InlineFieldRow>
        <UniversalSelectField
          label={
            <InlineLabel
              width={24}
              tooltip={
                <div style={{ width: '200px', backgroundColor: 'black' }}>
                  Select
                  <a
                    rel="noreferrer"
                    href="https://clickhouse.tech/docs/en/sql-reference/data-types/date/"
                    target="_blank"
                  >
                    Date
                  </a>
                  column for binding with Grafana range selector
                </div>
              }
            >
              Date column
            </InlineLabel>
          }
          width={24}
          placeholder="Date Column"
          value={selectedColumnDateType}
          onChange={(selectedItem) => onDateColDataTypeChange(selectedItem.value)}
          options={dateColumns}
        />
      </InlineFieldRow>
    </div>
  );
};

export default QueryBuilder;
