import React, { useEffect, useState } from 'react';
import {Button, Label, Modal, RadioButtonGroup, Badge} from '@grafana/ui';
import { EditorMode } from '../../../../types/types';
import { QueryHeaderProps } from './QueryHeader.types';
import { findDifferences } from './helpers/findDifferences';
import { QueryHeaderTabs } from './QueryHeader.constants';
import { useNotifications } from '../../../../contexts/NotificationContext';


export const QueryHeader = ({
  editorMode,
  setEditorMode,
  isAnnotationView,
  onTriggerQuery,
  datasource,
  query,
  onChange,
}: QueryHeaderProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [differences, setDifferences] = useState<any[]>([]);
  const { hasNotification } = useNotifications();
  
  const autocompleteErrorKey = `autocomplete-permission-error-${datasource.uid}`;
  const hasAutocompleteError = hasNotification(autocompleteErrorKey);

  const onEditorModeChange = (editorMode: EditorMode) => {
    setEditorMode(editorMode);
  };

  useEffect(() => {
    setDifferences(findDifferences(query, datasource));
  }, [query, datasource]);

  const onConfirm = () => {
    setModalOpen(false);
    const fieldsToReset = differences.reduce((acc, item) => {
      acc[item.fieldName] = item.updated;

      return acc;
    }, {});

    onChange({ ...query, ...fieldsToReset });
  };

  return (
    <div style={{ display: 'flex', marginTop: '10px' }}>
      <RadioButtonGroup
        size="sm"
        options={QueryHeaderTabs}
        value={editorMode}
        onChange={(e: EditorMode) => onEditorModeChange(e!)}
      />
      {editorMode === EditorMode.SQL && !isAnnotationView ? (
        <Button variant="primary" icon="play" size={'sm'} style={{ marginLeft: '10px' }} onClick={onTriggerQuery}>
          Run Query
        </Button>
      ) : null}
      {editorMode === EditorMode.Builder ? (
        <>
          <Button
            variant="primary"
            size={'sm'}
            icon="arrow-right"
            style={{ marginLeft: '10px' }}
            onClick={() => setEditorMode(EditorMode.SQL)}
          >
            Go to Query
          </Button>
          {differences.length ? (
            <Button
              variant="primary"
              size={'sm'}
              icon="sync"
              style={{ marginLeft: '10px' }}
              onClick={() => setModalOpen(true)}
            >
              Override settings
            </Button>
          ) : null}
        </>
      ) : null}
      {hasAutocompleteError && editorMode === EditorMode.SQL && (
        <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
          <Badge 
            text="Autocomplete unavailable - insufficient permissions to access system tables"
            color="red"
            icon="exclamation-triangle"
          />
        </div>
      )}
      <Modal
        title={'Confirmation'}
        isOpen={modalOpen}
        onClickBackdrop={() => setModalOpen(false)}
        onDismiss={() => setModalOpen(false)}
      >
        <div>
          <p>Configuration will be reset to default values defined in datasource configuration</p>
          {differences.map((item) => (
            <Label
              style={{ fontSize: '16px' }}
              key={item.key}
              description={
                <p>
                  {item.original} → {item.updated}
                </p>
              }
            >
              {item.key}
            </Label>
          ))}
        </div>
        <Modal.ButtonRow>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirm
          </Button>
        </Modal.ButtonRow>
      </Modal>
    </div>
  );
};
