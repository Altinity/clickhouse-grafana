import { InlineField, Select } from "@grafana/ui";
import React, { useState, useEffect } from "react";
import { SelectableValue } from "@grafana/data";

type UniversalSelectFieldProps = {
  value: string | undefined;
  onChange: (value: SelectableValue<string>) => void;
  options: Array<SelectableValue<string>>;
  label?: React.JSX.Element;
  placeholder?: string;
  disabled?: boolean;
  width?: number;
};

export const UniversalSelectField: React.FC<UniversalSelectFieldProps> = ({
                                                                            value,
                                                                            onChange,
                                                                            options,
                                                                            label,
                                                                            placeholder,
                                                                            disabled,
                                                                            width
                                                                          }) => {
  const [customOptions, setCustomOptions] = useState<Array<SelectableValue<string>>>([]);

  useEffect(() => {
    // Check if initial value is not in options or customOptions
    const isValueExist =
      options.some(option => option.value === value) ||
      customOptions.some(option => option.value === value);
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
    <InlineField label={label ? label : null}>
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
        width={width}
        value={value}
        onChange={({ value }) => onChange({ value })}
        placeholder={placeholder}
        options={uniqueOptions}
        disabled={disabled}
      />
    </InlineField>
  );
};
