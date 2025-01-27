import { ChangeEvent } from 'react';

interface UseQueryHandlersProps {
  onFieldChange: (params: { fieldName: string; value: any }) => void;
  query: any;
}

export const useQueryHandlers = ({ onFieldChange, query }: UseQueryHandlersProps) => {
  const handleStepChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFieldChange({ fieldName: 'interval', value: event.target.value });
  };

  const handleResolutionChange = (value: number) => {
    onFieldChange({ fieldName: 'intervalFactor', value });
  };

  const handleRoundChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFieldChange({ fieldName: 'round', value: event.target.value });
  };

  const handleFormatChange = (value: string | undefined) => {
    onFieldChange({ fieldName: 'format', value });
  };

  const handleContextWindowChange = (value: string | undefined) => {
    onFieldChange({ fieldName: 'contextWindowSize', value });
  };

  const handleToggleField = (fieldName: string) => {
    onFieldChange({ fieldName, value: !query[fieldName] });
  };

  return {
    handleStepChange,
    handleResolutionChange,
    handleRoundChange,
    handleFormatChange,
    handleContextWindowChange,
    handleToggleField,
  };
};
