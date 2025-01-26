import React from 'react';
import { InlineField, ToolbarButton } from '@grafana/ui';
import { ToolbarButtonsProps } from '../../types';

export const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({
  showHelp,
  showFormattedSQL,
  onToggleHelp,
  onToggleSQL,
}) => (
  <>
    <InlineField>
      <ToolbarButton
        type="button"
        variant="primary"
        onClick={onToggleHelp}
        isOpen={showHelp}
      >
        Show help
      </ToolbarButton>
    </InlineField>
    <InlineField>
      <ToolbarButton
        type="button"
        variant="primary"
        onClick={onToggleSQL}
        isOpen={showFormattedSQL}
      >
        Show generated SQL
      </ToolbarButton>
    </InlineField>
  </>
);
