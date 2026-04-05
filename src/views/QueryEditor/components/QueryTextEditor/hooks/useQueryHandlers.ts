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

  const handleStreamingIntervalChange = (value: number | undefined) => {
    onFieldChange({ fieldName: 'streamingInterval', value: value || 5000 });
  };

  const handleStreamingLookbackChange = (value: number | undefined) => {
    onFieldChange({ fieldName: 'streamingLookback', value: value ?? 1 });
  };

  const handleStreamingModeChange = (value: string | undefined) => {
    onFieldChange({ fieldName: 'streamingMode', value: value || 'delta' });
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
    handleStreamingIntervalChange,
    handleStreamingModeChange,
    handleStreamingLookbackChange,
    handleToggleField,
  };
};
