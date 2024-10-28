import { InlineField, Select } from '@grafana/ui';
import React, { useState, useEffect } from 'react';
import { SelectableValue } from '@grafana/data';

type UniversalSelectFieldProps = {
  value: string | undefined;
  onChange: (value: SelectableValue<string>) => void;
  options: Array<SelectableValue<string>>;
  label?: React.JSX.Element;
  placeholder?: string;
  disabled?: boolean;
  width?: number;
  testId?: string;
};

export const UniversalSelectField: React.FC<UniversalSelectFieldProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled,
  width,
  testId,
}) => {
  const [customOptions, setCustomOptions] = useState<Array<SelectableValue<string>>>([]);

  useEffect(() => {
    // Check if initial value is not in options or customOptions
    const isValueExist =
      options.some((option) => option.value === value) || customOptions.some((option) => option.value === value);
    if (!isValueExist) {
      // If value not in options or customOptions, add it to customOptions
      const customValue: SelectableValue<string> = {
        value: value,
        label: value,
      };
      setCustomOptions(
        [...customOptions, customValue].filter((option) => option.label !== undefined && option.label.trim() !== '')
      );
    }
  }, [value, options, customOptions]);

  // Remove duplicates from options
  const mergedOptions = [...options, ...customOptions];
  const uniqueOptions = mergedOptions
    .filter((option, index) => {
      const firstIndex = mergedOptions.findIndex((opt) => opt.value === option.value);
      return index === firstIndex;
    })
    .filter((option) => option.label !== undefined && option.label.trim() !== '');

  return (
    <InlineField label={label ? label : null}>
      <Select
        isClearable
        allowCustomValue={true}
        onCreateOption={(v) => {
          const customValue: SelectableValue<string> = {
            value: v,
            label: v,
          };
          setCustomOptions(
            [...customOptions, customValue].filter((option) => option.label !== undefined && option.label.trim() !== '')
          );
          onChange({ value: v.trim() });
        }}
        width={width}
        value={value}
        onChange={(changeEvent) => {
          onChange({ value: changeEvent ? changeEvent.value : undefined });
        }}
        placeholder={placeholder}
        options={uniqueOptions}
        disabled={disabled}
        data-testid={testId}
      />
    </InlineField>
  );
};
