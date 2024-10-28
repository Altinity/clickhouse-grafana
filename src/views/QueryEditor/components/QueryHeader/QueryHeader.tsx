import React, { useEffect, useState } from 'react';
import { Button, Label, Modal, RadioButtonGroup } from '@grafana/ui';
import { CHQuery, EditorMode, TimestampFormat } from '../../../../types/types';
import { SelectableValue } from '@grafana/data';
import { E2ESelectors } from '@grafana/e2e-selectors';
import { CHDataSource } from '../../../../datasource/datasource';

function findDifferences(query: CHQuery, datasource: CHDataSource) {
  const { defaultValues } = datasource;

  const differences: any[] = [];

  function checkValue(value) {
    if (value === undefined || value.trim() === '') {
      return 'EMPTY';
    } else {
      return value.trim();
    }
  }

  if (defaultValues) {
    if (query.dateTimeType !== defaultValues.defaultDateTimeType) {
      differences.push({
        key: 'Timestamp type Column',
        original: checkValue(query.dateTimeType),
        updated: defaultValues.defaultDateTimeType,
        fieldName: 'dateTimeType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === 'TIMESTAMP' &&
      defaultValues.dateTime.defaultUint32 &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultUint32
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultUint32,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === TimestampFormat.DateTime64 &&
      defaultValues.dateTime.defaultDateTime64 &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime64
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultDateTime64,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.defaultDateTimeType === TimestampFormat.DateTime &&
      defaultValues.dateTime.defaultDateTime &&
      query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime
    ) {
      differences.push({
        key: 'Timestamp Column',
        original: checkValue(query.dateTimeColDataType),
        updated: defaultValues.dateTime.defaultDateTime,
        fieldName: 'dateTimeColDataType',
      });
    }

    if (
      defaultValues.dateTime.defaultDateDate32 &&
      query.dateColDataType !== defaultValues.dateTime.defaultDateDate32
    ) {
      differences.push({
        key: 'Date column',
        original: checkValue(query.dateColDataType),
        updated: defaultValues.dateTime.defaultDateDate32,
        fieldName: 'dateColDataType',
      });
    }
  }

  return differences;
}

export const Components = {
  QueryEditor: {
    EditorMode: {
      options: {
        QuerySettings: 'Query Settings',
        SQLEditor: 'SQL Editor',
      },
    },
  },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};

interface QueryHeaderProps {
  isAnnotationView: boolean;
  query: CHQuery;
  editorMode: EditorMode;
  setEditorMode: (mode: any) => void;
  onTriggerQuery: () => void;
  datasource: CHDataSource;
  onChange: any;
}

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
  const options: Array<SelectableValue<EditorMode>> = [
    { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
    { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
  ];

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
        options={options}
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
