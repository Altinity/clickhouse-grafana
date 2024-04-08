import { InlineField, InlineLabel, Select } from "@grafana/ui";
import React, { useState, useEffect } from "react";
import { SelectableValue } from "@grafana/data";

export const TimestampColumnField = ({ value, onChange, options, disabled }) => {
  const [customOptions, setCustomOptions] = useState<Array<SelectableValue<string>>>([]);

  useEffect(() => {
    // Check if initial value is not in options or customOptions
    const isValueExist = options.some(option => option.value === value) || customOptions.some(option => option.value === value);
    if (!isValueExist) {
      // If value not in options or customOptions, add it to customOptions
      const customValue: SelectableValue<string> = {
        value: value,
        label: value
      };
      setCustomOptions([...customOptions, customValue]);
    }
  }, [value, options, customOptions]);

  // Remove duplicates from options
  const mergedOptions = [...options, ...customOptions];
  const uniqueOptions = mergedOptions.filter((option, index) => {
    const firstIndex = mergedOptions.findIndex(opt => opt.value === option.value);
    return index === firstIndex;
  });

  return (
    <InlineField label={<InlineLabel width={24}>Timestamp Column</InlineLabel>}>
      <Select
        allowCustomValue={true}
        onCreateOption={v => {
          const customValue: SelectableValue<string> = {
            value: v,
            label: v
          };
          setCustomOptions([...customOptions, customValue]);
          onChange({ value: v });
        }}
        width={24}
        value={value}
        onChange={({ value }) => onChange({ value })}
        placeholder={'Timestamp column'}
        options={uniqueOptions}
        disabled={disabled}
      />
    </InlineField>
  );
};
