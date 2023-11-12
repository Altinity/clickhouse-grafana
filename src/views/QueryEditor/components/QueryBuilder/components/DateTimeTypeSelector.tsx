import React from 'react';
import { Select, Popover, Icon } from '@grafana/ui';
import {CHQuery} from "../../../../../types/types";
import {SelectableValue} from "@grafana/data";

interface DateTimeTypeSelectorProps {
  query: CHQuery;
  onChange: (query: CHQuery) => void;
  onRunQuery: () => void;
}

export const DateTimeTypeSelector = ({ query, onChange, onRunQuery }: DateTimeTypeSelectorProps) => {
  const [showPopover, setShowPopover] = React.useState(false);
  const iconRef = React.useRef(null);

  const dateTimeTypeList = [
    {label: 'Column:DateTime', value: 'DATETIME'},
    {label: 'Column:DateTime64', value: 'DATETIME64'},
    {label: 'Column:TimeStamp', value: 'TIMESTAMP'},
  ];

  const onDateTimeTypeChanged = (dateTimeType: SelectableValue) => {
    query.dateTimeType = dateTimeType.value
    onChange(query)
  };

  const handleMouseEnter = () => {
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    setShowPopover(false);
  };

  return (
    <div className="gf-form width-14">
      <Select
        options={dateTimeTypeList}
        onChange={(e) => onDateTimeTypeChanged(e!) }
        className="query-keyword width-14"
      />
      123
      <Icon
        name="info-circle"
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ marginRight: '10px' }}
      />
      {iconRef.current != null && (
        <Popover
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          show={showPopover} referenceElement={iconRef.current}
          content={
           <div style={{width: "200px", backgroundColor:"black"}}>
             Select Type &nbsp;
             <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime/" rel="noreferrer" target="_blank">DateTime</a>,&nbsp;
             <a href="https://clickhouse.com/docs/en/sql-reference/data-types/datetime64/" rel="noreferrer" target="_blank">DateTime64</a>&nbsp;
             or <a href="https://clickhouse.com/docs/en/sql-reference/data-types/int-uint/" rel="noreferrer" target="_blank">UInt32</a> column for binding with Grafana range selector
           </div>
          }
        />
      )}
    </div>
  );
};

